//! md_transform.rs
//!
//! Markdown形式とYAML形式の相互変換を行うモジュール。
//! - Markdownテキスト → YAML構造データの変換
//! - YAML構造データ → Markdownテキストの変換
//! - ヘッダー部分とコンテンツ部分の分離・結合処理
//! - 見出し構造のYAML階層構造への変換

use crate::error::{ErrorInfo, ValidationResult};
use pulldown_cmark::{Event, Parser, Tag, HeadingLevel};
use serde_json::{Value, json};

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
            },
            Event::Text(text) if in_title && title.is_empty() => {
                title = text.to_string();
                found_title = true;
            },
            Event::End(Tag::Heading(HeadingLevel::H1, ..)) => {
                in_title = false;
            },
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

/// Markdownの見出し構造をYAML互換の階層構造に変換する
///
/// # 引数
/// * `md_str` - Markdown文字列
///
/// # 戻り値
/// * YAML形式の文字列（階層的に構造化された見出し）
///
/// # 動作概要
/// 1. フロントマターがある場合はそれを除去
/// 2. Markdownをパースして見出し構造を解析
/// 3. 見出しレベルに応じた階層構造を構築:
///    - H1 → title フィールド
///    - H2 → sections 配列の要素
///    - H3 → sections[].subsections 配列の要素
/// 4. 得られた構造をYAML文字列にシリアライズ
pub fn md_headings_to_yaml(md_str: &str) -> String {
    // フロントマターがあれば除去
    let content_without_frontmatter = remove_frontmatter(md_str);
    
    let parser = Parser::new(&content_without_frontmatter);
    let mut result = json!({});
    let mut sections = Vec::new();

    let mut current_level = 0;
    let mut text_buffer = String::new();

    for event in parser {
        match event {
            Event::Start(Tag::Heading(level, ..)) => {
                // 見出しレベルを数値に変換
                current_level = match level {
                    HeadingLevel::H1 => 1,
                    HeadingLevel::H2 => 2,
                    HeadingLevel::H3 => 3,
                    HeadingLevel::H4 => 4,
                    HeadingLevel::H5 => 5,
                    HeadingLevel::H6 => 6,
                };
                text_buffer.clear();
            },
            Event::Text(text) if current_level > 0 => {
                text_buffer.push_str(&text);
            },
            Event::End(Tag::Heading(..)) if current_level > 0 => {
                // 見出しレベルに応じて階層構造を構築
                match current_level {
                    1 => {
                        // H1はドキュメントのタイトルとして扱う
                        result["title"] = json!(text_buffer.trim());
                    },
                    2 => {
                        // H2はトップレベルセクションとして扱う
                        let section = json!({
                            "heading": text_buffer.trim(),
                            "content": ""
                        });
                        sections.push(section);
                    },
                    3 => {
                        // H3はサブセクションとして扱う
                        if !sections.is_empty() {
                            let last_idx = sections.len() - 1;
                            let mut section = sections[last_idx].clone();

                            // subsectionsキーがない場合は初期化
                            if !section.as_object().unwrap().contains_key("subsections") {
                                section["subsections"] = json!([]);
                            }

                            let subsection = json!({
                                "heading": text_buffer.trim(),
                                "content": ""
                            });

                            let subsections = section["subsections"].as_array_mut().unwrap();
                            subsections.push(subsection);
                            sections[last_idx] = section;
                        }
                    },
                    _ => {
                        // H4以上は現時点では特に処理しない
                    }
                }
                text_buffer.clear();
                current_level = 0;
            },
            _ => {}
        }
    }

    // セクション配列を結果に追加
    if !sections.is_empty() {
        result["sections"] = json!(sections);
    }

    // JSONからYAMLに変換
    match serde_yaml::to_string(&result) {
        Ok(yaml) => yaml,
        Err(_) => "title: Error\ncontent: Failed to convert to YAML".to_string()
    }
}

/// Markdownからフロントマター部分を除去する
/// 
/// # 引数
/// * `md_str` - Markdown文字列
///
/// # 戻り値
/// * フロントマターを除去したMarkdown文字列
fn remove_frontmatter(md_str: &str) -> String {
    let lines: Vec<&str> = md_str.lines().collect();
    
    // フロントマターの開始と終了位置を検索
    let mut start_idx = None;
    let mut end_idx = None;
    
    for (i, line) in lines.iter().enumerate() {
        if line.trim() == "---" {
            if start_idx.is_none() {
                start_idx = Some(i);
            } else if end_idx.is_none() {
                end_idx = Some(i);
                break;
            }
        }
    }
    
    // フロントマターがある場合はそれを除去
    if let (Some(start), Some(end)) = (start_idx, end_idx) {
        if start == 0 { // 先頭からフロントマターがある場合のみ除去
            let mut result = String::new();
            for (i, line) in lines.iter().enumerate() {
                if i > end {
                    result.push_str(line);
                    result.push('\n');
                }
            }
            return result;
        }
    }
    
    // フロントマターが無い場合や先頭以外にフロントマターがある場合は元の文字列をそのまま返す
    md_str.to_string()
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

        let yaml = md_headings_to_yaml(md);

        // YAML形式チェック
        assert!(yaml.contains("title: Main Title"));
        assert!(yaml.contains("heading: Section 1"));
        assert!(yaml.contains("heading: Section 2"));
        assert!(yaml.contains("heading: Subsection 2.1"));
    }

    #[test]
    fn test_md_headings_to_yaml_no_sections() {
        let md = "# Only Title";
        let yaml = md_headings_to_yaml(md);

        assert!(yaml.contains("title: Only Title"));
        assert!(!yaml.contains("sections:"));
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
        assert!(yaml.contains("heading: Section 1"));
    }
}
