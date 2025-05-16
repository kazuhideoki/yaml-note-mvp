//! md_transform.rs
//!
//! Markdown形式とYAML形式の相互変換を行うモジュール。
//! - Markdownテキスト → YAML構造データの変換
//! - YAML構造データ → Markdownテキストの変換
//! - ヘッダー部分とコンテンツ部分の分離・結合処理
//! - 見出し構造のYAML階層構造への変換

use crate::error::{ErrorInfo, ValidationResult};
use pulldown_cmark::{Event, HeadingLevel, Parser, Tag};
use serde::Serialize;
use serde_json::Value;

/// Markdownテキストを解析してYAML文字列に変換する
///
/// # 引数
/// * `md_str` - 変換元のMarkdown文字列
///
/// # 戻り値
/// * 成功時: YAML形式の文字列
/// * 失敗時: エラー情報を含むJSON文字列
///
/// # 動作概要
/// 1. Markdownをパースして構造を解析
/// 2. ヘッダーとコンテンツを分離
/// 3. コンテンツを適切にYAML化
/// 4. ヘッダー情報とマージして完全なYAMLを構築
pub fn md_to_yaml(md_str: &str) -> String {
    let mut title = String::new();
    let mut in_title = false;
    let mut found_title = false;

    let parser = Parser::new(md_str);

    // タイトル抽出
    for event in parser {
        match event {
            Event::Start(Tag::Heading(HeadingLevel::H1, ..)) => {
                in_title = true;
            }
            Event::Text(text) if in_title && title.is_empty() => {
                title = text.to_string();
                found_title = true;
            }
            Event::End(Tag::Heading(HeadingLevel::H1, ..)) => {
                in_title = false;
            }
            _ => {}
        }
    }

    // タイトルが見つからない場合は元のテキストをコンテンツとして扱う
    let content = if !found_title {
        title = "Untitled Document".to_string();
        md_str.to_string()
    } else {
        // タイトル行を除いた残りをcontentとする
        let mut lines = md_str.lines();
        let mut content_lines = Vec::new();
        let mut title_found = false;
        for line in lines.by_ref() {
            if line.trim_start().starts_with("# ") && !title_found {
                title_found = true;
                continue;
            }
            if title_found {
                content_lines.push(line);
            }
        }
        content_lines.join("\n").trim_start().to_string()
    };

    // YAMLの構築
    let yaml = format!("title: {}\ncontent: |\n{}", title, indent_content(&content));
    yaml
}

/// YAMLをMarkdownテキストに変換する
///
/// # 引数
/// * `yaml_str` - 変換元のYAML文字列
///
/// # 戻り値
/// * 成功時: Markdown形式の文字列
/// * 失敗時: エラー情報を含むJSON文字列
///
/// # 動作概要
/// 1. YAMLをパースして構造データに変換
/// 2. タイトルとコンテンツを抽出
/// 3. Markdownフォーマットに整形して返す
pub fn yaml_to_md(yaml_str: &str) -> String {
    match serde_yaml::from_str::<Value>(yaml_str) {
        Ok(value) => {
            let mut md = String::new();

            // タイトルの抽出
            if let Some(title) = value.get("title").and_then(|t| t.as_str()) {
                md.push_str(&format!("# {}\n\n", title));
            }

            // コンテンツの抽出
            if let Some(content) = value.get("content").and_then(|c| c.as_str()) {
                md.push_str(content);
                if !content.ends_with('\n') {
                    md.push('\n');
                }
            }

            md
        }
        Err(e) => {
            let result = ValidationResult::single_error(ErrorInfo::new(
                0,
                format!("YAML parse error: {}", e),
                "",
            ));
            result.to_json()
        }
    }
}

/// テキストコンテンツをYAML複数行文字列用にインデントする
fn indent_content(content: &str) -> String {
    content
        .lines()
        .map(|line| format!("  {}", line))
        .collect::<Vec<String>>()
        .join("\n")
}

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
        while let Some(l) = lines.next() {
            if l.trim() == "---" {
                break;
            }
        }
        lines.collect::<Vec<_>>().join("\n")
    } else {
        md.to_owned()
    }
}

/// Markdownの見出し構造をYAML互換の階層構造に変換する
///
/// # 引数
/// * `md_str` - Markdown文字列
///
/// # 戻り値
/// * YAML形式の文字列（スキーマに適合した構造）
///
/// # 動作概要
/// 1. フロントマターがある場合はそれを除去
/// 2. Markdownをパースして見出し構造を解析
/// 3. 見出し構造をスキーマに適合した形式に変換:
///    - H1 → title フィールド
///    - H2, H3以下 → sections配列の要素
/// 4. 得られた構造をYAML文字列にシリアライズ
pub fn md_headings_to_yaml(md: &str) -> String {
    // 1. フロントマターを落とす
    let cleaned_md = remove_frontmatter(md);
    let trimmed_md = cleaned_md.trim();

    // 最初に全てのライン（行）を処理しやすい形に格納
    let lines: Vec<&str> = trimmed_md.lines().collect();
    
    // 見出しを検出して階層構造を作成
    let mut doc = Document::default();
    let mut current_title: Option<String> = None;
    let mut current_section: Option<*mut Section> = None;
    let mut section_stack: Vec<(*mut Section, usize)> = Vec::new(); // (section pointer, level)
    let mut content_lines: Vec<String> = Vec::new();
    
    let mut i = 0;
    while i < lines.len() {
        let line = lines[i].trim();
        
        // 見出し行の処理
        if line.starts_with("# ") && current_title.is_none() {
            // H1 (タイトル)の処理
            current_title = Some(line[2..].trim().to_string());
            doc.title = current_title.clone().unwrap_or_default();
        } else if line.starts_with("## ") {
            // H2の処理
            if !content_lines.is_empty() {
                // 前のセクションのコンテンツを保存
                if let Some(ptr) = current_section {
                    unsafe {
                        (*ptr).content = content_lines.join("\n").trim().to_string();
                    }
                } else {
                    doc.content = content_lines.join("\n").trim().to_string();
                }
                content_lines.clear();
            }
            
            // スタックをH2レベルに調整
            while let Some((_, level)) = section_stack.last() {
                if *level >= 2 {
                    section_stack.pop();
                } else {
                    break;
                }
            }
            
            // 新しいH2セクションを作成
            let new_section = Section {
                title: line[3..].trim().to_string(),
                content: String::new(),
                sections: Vec::new(),
            };
            
            // ルートに直接追加
            doc.sections.push(new_section);
            let new_ptr = doc.sections.last_mut().unwrap() as *mut Section;
            section_stack.push((new_ptr, 2));
            current_section = Some(new_ptr);
            
        } else if line.starts_with("### ") {
            // H3の処理
            if !content_lines.is_empty() {
                // 前のセクションのコンテンツを保存
                if let Some(ptr) = current_section {
                    unsafe {
                        (*ptr).content = content_lines.join("\n").trim().to_string();
                    }
                }
                content_lines.clear();
            }
            
            // スタックをH3レベルに調整
            while let Some((_, level)) = section_stack.last() {
                if *level >= 3 {
                    section_stack.pop();
                } else {
                    break;
                }
            }
            
            // 新しいH3セクションを作成
            let new_section = Section {
                title: line[4..].trim().to_string(),
                content: String::new(),
                sections: Vec::new(),
            };
            
            if let Some((parent_ptr, _)) = section_stack.last() {
                // 親に追加
                unsafe {
                    (*(*parent_ptr)).sections.push(new_section);
                    let new_ptr = (*(*parent_ptr)).sections.last_mut().unwrap() as *mut Section;
                    section_stack.push((new_ptr, 3));
                    current_section = Some(new_ptr);
                }
            } else {
                // スタックが空の場合（異常な状態）
                // H2が無いのにH3が来た場合、ルートに追加
                doc.sections.push(new_section);
                let new_ptr = doc.sections.last_mut().unwrap() as *mut Section;
                section_stack.push((new_ptr, 3));
                current_section = Some(new_ptr);
            }
        } else {
            // 通常のコンテンツ行
            content_lines.push(line.to_string());
        }
        
        i += 1;
    }
    
    // 最後のコンテンツを処理
    if !content_lines.is_empty() {
        if let Some(ptr) = current_section {
            unsafe {
                (*ptr).content = content_lines.join("\n").trim().to_string();
            }
        } else if current_title.is_some() {
            // タイトルがあってセクションがない場合
            doc.content = content_lines.join("\n").trim().to_string();
        } else {
            // タイトルもない場合
            doc.content = trimmed_md.to_string();
        }
    }
    
    // 空の配列も含め、常にセクションフィールドを含めるためのハック
    // これにより、セクションが空でも常に "sections: []" が出力されるようになる
    if doc.sections.is_empty() {
        doc.sections = Vec::new();
    }
    
    // YAML文字列に変換
    serde_yaml::to_string(&doc).unwrap_or_else(|_| "title: Error".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_md_to_yaml_basic() {
        let md = "# Test Title\n\nThis is a test content.";
        let yaml = md_to_yaml(md);

        assert!(yaml.contains("title: Test Title"));
        assert!(yaml.contains("content: |"));
        assert!(yaml.contains("  This is a test content."));
    }

    #[test]
    fn test_yaml_to_md_basic() {
        let yaml =
            "title: Test Title\ncontent: |\n  This is a test content.\n  With multiple lines.";
        let md = yaml_to_md(yaml);

        assert!(md.contains("# Test Title"));
        assert!(md.contains("This is a test content."));
        assert!(md.contains("With multiple lines."));
    }

    #[test]
    fn test_md_roundtrip() {
        // Markdown -> YAML -> Markdown の変換で情報が保持されるかをテスト
        let original_md = "# Roundtrip Test\n\nThis is a test for roundtrip conversion.";
        let yaml = md_to_yaml(original_md);
        let roundtrip_md = yaml_to_md(&yaml);

        assert_eq!(original_md, roundtrip_md.trim());
    }

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
        eprintln!("ACTUAL YAML OUTPUT (test_md_headings_to_yaml_no_sections):\n{}", yaml);

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
    # Sample Note with Relative Schema

    ## Introduction
    This is a sample note.

    ## Features
    Shows appropriate error messages

    ## Conclusion
    The relative schema path feature makes the note more portable.

    ### Hoge
    "#;

        // デバッグ用：元のMarkdownを出力
    eprintln!("ORIGINAL MARKDOWN (Cleaned):\n{}", remove_frontmatter(md));

    // 明示的に期待する YAML オブジェクトを構築
    let expected_doc = Document {
        title: "Sample Note with Relative Schema".to_string(),
        content: "".to_string(),
        sections: vec![
            Section {
                title: "Introduction".to_string(),
                content: "This is a sample note.".to_string(),
                sections: vec![],
            },
            Section {
                title: "Features".to_string(),
                content: "Shows appropriate error messages".to_string(),
                sections: vec![],
            },
            Section {
                title: "Conclusion".to_string(),
                content: "The relative schema path feature makes the note more portable.".to_string(),
                sections: vec![
                    Section {
                        title: "Hoge".to_string(),
                        content: "".to_string(),
                        sections: vec![],
                    },
                ],
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
