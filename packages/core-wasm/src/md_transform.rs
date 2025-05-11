//! md_transform.rs
//!
//! Markdown形式とYAML形式の相互変換を行うモジュール。
//! - Markdownテキスト → YAML構造データの変換
//! - YAML構造データ → Markdownテキストの変換
//! - ヘッダー部分とコンテンツ部分の分離・結合処理

use crate::error::{ErrorInfo, ValidationResult};
use pulldown_cmark::{Event, Parser, Tag, HeadingLevel};
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
    let mut content = String::new();
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
    if !found_title {
        content = md_str.to_string();
        title = "Untitled Document".to_string();
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
        content = content_lines.join("\n").trim_start().to_string();
    }

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
}
