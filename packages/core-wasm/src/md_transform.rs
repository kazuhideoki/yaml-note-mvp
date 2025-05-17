//! md_transform.rs
//!
//! Markdown形式とYAML形式の相互変換を行うモジュール。
//! - Markdownテキスト → YAML構造データの変換
//! - YAML構造データ → Markdownテキストの変換
//! - ヘッダー部分とコンテンツ部分の分離・結合処理
//! - 見出し構造のYAML階層構造への変換

use serde::Serialize;

#[derive(Debug, Default, Serialize)]
struct Section {
    title: String,
    #[serde(default)]
    content: String,
    // always include sections field
    #[serde(default)]
    sections: Vec<Section>,
}

#[derive(Debug, Default, Serialize)]
struct Document {
    title: String,
    #[serde(default)]
    content: String,
    // always include sections field
    #[serde(default)]
    sections: Vec<Section>,
}

/// -------------------------
/// フロントマター除去
/// -------------------------
fn remove_frontmatter(md: &str) -> String {
    let mut lines = md.lines();

    if lines.next().map(|l| l.trim()) == Some("---") {
        for l in lines.by_ref() {
            if l.trim() == "---" {
                break;
            }
        }
        lines.collect::<Vec<_>>().join("\n")
    } else {
        md.to_owned()
    }
}

pub fn md_headings_to_yaml(md: &str) -> String {
    // 1. フロントマターを落とす
    let cleaned_md = remove_frontmatter(md);
    let trimmed_md = cleaned_md.trim();

    // データ構造を構築
    let mut document = Document::default();
    let mut found_title = false;

    // マークダウンの行ごとの処理
    let lines: Vec<&str> = trimmed_md.lines().collect();

    // 各行を解析して見出しレベルを判定
    let mut i = 0;
    let mut doc_content = String::new();

    // マークダウンから見出し構造を抽出する関数
    fn extract_headings(
        lines: &[&str],
        start_idx: &mut usize,
        _current_level: usize,
        target_level: usize,
    ) -> Vec<Section> {
        let mut sections = Vec::new();
        let mut current_section: Option<Section> = None;
        let mut section_content = String::new();

        while *start_idx < lines.len() {
            let line = lines[*start_idx].trim();

            // 見出しレベルを判定
            let heading_level = if line.starts_with("##### ") {
                5
            } else if line.starts_with("#### ") {
                4
            } else if line.starts_with("### ") {
                3
            } else if line.starts_with("## ") {
                2
            } else if line.starts_with("# ") {
                1
            } else {
                0 // 見出しでない
            };

            // 現在の見出しと同じか上のレベルなら、処理を終了
            if heading_level > 0 && heading_level <= target_level {
                // 現在のセクションをコンテンツと一緒に保存して終了
                if let Some(mut section) = current_section.take() {
                    section.content = section_content.trim().to_string();
                    sections.push(section);
                }
                return sections;
            }

            // 見出しレベルに基づいて処理を分岐
            match heading_level.cmp(&(target_level + 1)) {
                std::cmp::Ordering::Equal => {
                    // 対象レベルの1つ下の見出しを検出
                    // 前のセクションがあれば保存
                    if let Some(mut section) = current_section.take() {
                        section.content = section_content.trim().to_string();
                        sections.push(section);
                    }

                    // 新しいセクションを作成
                    let prefix = &line[0..heading_level];
                    let title = line.strip_prefix(prefix).unwrap_or(line).trim().to_string();
                    current_section = Some(Section {
                        title,
                        content: String::new(),
                        sections: Vec::new(),
                    });
                    section_content = String::new();
                }
                std::cmp::Ordering::Greater => {
                    // さらに下の階層の見出しを検出した場合は再帰的に処理
                    // 前のセクションがなければ作成
                    if current_section.is_none() {
                        current_section = Some(Section {
                            title: String::new(),
                            content: section_content.trim().to_string(),
                            sections: Vec::new(),
                        });
                        section_content = String::new();
                    }

                    // 現在の位置を記録
                    let current_pos = *start_idx;

                    // 子セクションを再帰的に処理
                    let sub_sections =
                        extract_headings(lines, start_idx, heading_level, target_level + 1);

                    // 子セクションを現在のセクションに追加
                    if let Some(section) = &mut current_section {
                        section.sections = sub_sections;
                    }

                    // 再帰呼び出しが位置を進めなかった場合は、自分で進める
                    if current_pos == *start_idx {
                        *start_idx += 1;
                    }

                    continue;
                }
                std::cmp::Ordering::Less => {
                    // 普通のテキスト行
                    if current_section.is_some() {
                        // 現在のセクションにコンテンツとして追加
                        if !section_content.is_empty() {
                            section_content.push('\n');
                        }
                        section_content.push_str(line);
                    } else {
                        // セクション外のテキストは上位レベルのコンテンツに
                        if !section_content.is_empty() {
                            section_content.push('\n');
                        }
                        section_content.push_str(line);
                    }
                }
            }

            *start_idx += 1;
        }

        // 最後のセクションを追加
        if let Some(mut section) = current_section {
            section.content = section_content.trim().to_string();
            sections.push(section);
        }

        sections
    }

    // まず最初のH1を探してタイトルとして使用
    while i < lines.len() {
        let line = lines[i].trim();
        if let Some(title_text) = line.strip_prefix("# ") {
            document.title = title_text.trim().to_string();
            found_title = true;
            i += 1;
            break;
        }
        i += 1;
    }

    // タイトルが見つからなければデフォルト値を設定
    if !found_title {
        document.title = "Untitled Document".to_string();
        i = 0; // 最初から処理
    }

    // タイトルと最初のH2の間のテキストはドキュメントコンテンツ
    let content_start = i;
    while i < lines.len() {
        let line = lines[i].trim();
        if line.starts_with("## ") {
            break;
        }
        i += 1;
    }

    // ドキュメントコンテンツを抽出
    if i > content_start {
        doc_content = lines[content_start..i].join("\n").trim().to_string();
    }

    // 残りはセクションとして処理
    let mut start_idx = content_start;
    document.sections = extract_headings(&lines, &mut start_idx, 0, 1);
    document.content = doc_content;

    // YAMLに変換して返す
    serde_yaml::to_string(&document).unwrap_or_else(|e| format!("Error serializing to YAML: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_md_headings_to_yaml() {
        let md = r#"# Main Title
## Section 1
Some content
## Section 2
More content
### Subsection 2.1
Nested content"#;

        // デバッグ用：元のMarkdownを出力
        eprintln!("ORIGINAL MARKDOWN:\n{}", md);

        let yaml = md_headings_to_yaml(md);

        // デバッグ出力（必ず表示されるようにeprintlnを使用）
        eprintln!("ACTUAL YAML OUTPUT (test_md_headings_to_yaml):\n{}", yaml);

        // YAML形式チェック - スキーマ互換形式
        assert!(yaml.contains("title: Main Title"));
        assert!(yaml.contains("sections:"));

        // セクションの構造チェック - serde_yamlの実際の出力形式に合わせて修正
        assert!(yaml.contains("title: Section 1"));
        assert!(yaml.contains("title: Section 2"));
        assert!(yaml.contains("title: Subsection 2.1"));

        // コンテンツも含まれていることを確認
        assert!(yaml.contains("content: Some content"));
        assert!(yaml.contains("content: More content"));
        assert!(yaml.contains("content: Nested content"));
    }

    #[test]
    fn test_md_headings_to_yaml_no_sections() {
        let md = "# Only Title";
        let yaml = md_headings_to_yaml(md);

        // デバッグ出力
        eprintln!(
            "ACTUAL YAML OUTPUT (test_md_headings_to_yaml_no_sections):\n{}",
            yaml
        );

        assert!(yaml.contains("title: Only Title"));
        assert!(yaml.contains("sections:"));
        // セクションは空配列になるはず
        assert!(yaml.contains("sections: []"));
    }

    #[test]
    fn test_remove_frontmatter() {
        let md_with_frontmatter = r#"---
schema_path: ./schemas/note.yaml
validated: true
---
# Test Document
## Section 1
Content
"#;

        let result = remove_frontmatter(md_with_frontmatter);

        // フロントマターが削除されていること
        assert!(!result.contains("schema_path:"));
        assert!(!result.contains("validated:"));

        // 本文が残っていること
        assert!(result.contains("# Test Document"));
        assert!(result.contains("## Section 1"));
        assert!(result.contains("Content"));
    }

    #[test]
    fn test_md_headings_to_yaml_with_frontmatter() {
        let md_with_frontmatter = r#"---
schema_path: ./schemas/note.yaml
validated: true
---
# Test Document
## Section 1
Content
"#;

        let yaml = md_headings_to_yaml(md_with_frontmatter);

        // フロントマター内容がYAMLに含まれていないこと
        assert!(!yaml.contains("schema_path:"));
        assert!(!yaml.contains("validated:"));

        // 正しく見出し構造が変換されていること
        assert!(yaml.contains("title: Test Document"));
        // セクション構造のチェック - serde_yamlの実際の出力形式に合わせて修正
        assert!(yaml.contains("sections:"));
        assert!(yaml.contains("title: Section 1"));
        assert!(yaml.contains("content: Content"));
    }

    #[test]
    fn hierarchical_conversion() {
        let md = r#"---
    schema_path: ./schema.yaml
    validated: true
    ---
    # Sample Note with Deep Nesting

    This is the main document content.

    ## Introduction
    This is a sample note.

    ## Features
    Shows appropriate error messages

    ### Advanced Features
    These are advanced features.

    #### Sub-feature 1
    This is a sub-feature.

    ##### Detail Point 1
    Very detailed explanation.

    ##### Detail Point 2
    Another detailed explanation.

    #### Sub-feature 2
    Another sub-feature.

    ### Basic Features
    These are basic features.

    ## Conclusion
    The relative schema path feature makes the note more portable.

    ### Final Thoughts
    Some final thoughts.
    "#;

        // デバッグ用：元のMarkdownを出力
        eprintln!("ORIGINAL MARKDOWN (Cleaned):\n{}", remove_frontmatter(md));

        // 明示的に期待する YAML オブジェクトを構築
        let expected_doc = Document {
            title: "Sample Note with Deep Nesting".to_string(),
            content: "This is the main document content.".to_string(),
            sections: vec![
                Section {
                    title: "Introduction".to_string(),
                    content: "This is a sample note.".to_string(),
                    sections: vec![],
                },
                Section {
                    title: "Features".to_string(),
                    content: "Shows appropriate error messages".to_string(),
                    sections: vec![
                        Section {
                            title: "Advanced Features".to_string(),
                            content: "These are advanced features.".to_string(),
                            sections: vec![
                                Section {
                                    title: "Sub-feature 1".to_string(),
                                    content: "This is a sub-feature.".to_string(),
                                    sections: vec![
                                        Section {
                                            title: "Detail Point 1".to_string(),
                                            content: "Very detailed explanation.".to_string(),
                                            sections: vec![],
                                        },
                                        Section {
                                            title: "Detail Point 2".to_string(),
                                            content: "Another detailed explanation.".to_string(),
                                            sections: vec![],
                                        },
                                    ],
                                },
                                Section {
                                    title: "Sub-feature 2".to_string(),
                                    content: "Another sub-feature.".to_string(),
                                    sections: vec![],
                                },
                            ],
                        },
                        Section {
                            title: "Basic Features".to_string(),
                            content: "These are basic features.".to_string(),
                            sections: vec![],
                        },
                    ],
                },
                Section {
                    title: "Conclusion".to_string(),
                    content: "The relative schema path feature makes the note more portable."
                        .to_string(),
                    sections: vec![Section {
                        title: "Final Thoughts".to_string(),
                        content: "Some final thoughts.".to_string(),
                        sections: vec![],
                    }],
                },
            ],
        };

        // 期待値をYAMLに変換
        let expected_yaml = serde_yaml::to_string(&expected_doc).unwrap();
        let expected = serde_yaml::from_str::<serde_yaml::Value>(&expected_yaml).unwrap();

        // 実際出力を検証
        let actual_yaml = md_headings_to_yaml(md);
        eprintln!("ACTUAL YAML OUTPUT:\n{}", actual_yaml);
        let actual = serde_yaml::from_str::<serde_yaml::Value>(&actual_yaml).unwrap();

        assert_eq!(actual, expected);
    }
}
