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
/// * YAML形式の文字列（スキーマに適合した構造）
///
/// # 動作概要
/// 1. フロントマターがある場合はそれを除去
/// 2. Markdownをパースして見出し構造を解析
/// 3. 見出し構造をスキーマに適合した形式に変換:
///    - H1 → title フィールド
///    - H2, H3以下 → sections配列の要素
/// 4. 得られた構造をYAML文字列にシリアライズ
pub fn md_headings_to_yaml(md_str: &str) -> String {
    // フロントマターがあれば除去
    let content_without_frontmatter = remove_frontmatter(md_str);
    
    // 行ごとに解析する代替アプローチを使用
    let lines: Vec<&str> = content_without_frontmatter.lines().collect();
    let mut result = json!({});
    
    // タイトルと各セクションの内容を格納
    let mut title = "Untitled Document";
    let mut sections = Vec::new();
    
    // 現在処理中のセクション
    let mut current_section_title = "";
    let mut current_section_content = String::new();
    let mut in_section = false;
    
    // デバッグ用
    let mut debug_info = Vec::new();
    
    // 行ごとに処理
    let mut i = 0;
    while i < lines.len() {
        let line = lines[i].trim();
        
        // H1見出し（タイトル）
        if line.starts_with("# ") {
            title = line.trim_start_matches("# ").trim();
            debug_info.push(format!("Found Title: {}", title));
        }
        // H2見出し（セクション）
        else if line.starts_with("## ") {
            // 既存のセクションがあれば、それを追加
            if in_section && !current_section_title.is_empty() {
                let content = current_section_content.trim();
                debug_info.push(format!("Adding Section: {} with content: {}", current_section_title, content));
                sections.push(json!({
                    "title": current_section_title,
                    "content": content
                }));
            }
            
            // 新しいセクションを開始
            current_section_title = line.trim_start_matches("## ").trim();
            current_section_content = String::new();
            in_section = true;
            debug_info.push(format!("Started new Section: {}", current_section_title));
        }
        // H3-H6見出し（サブセクション - 今回は単純化のため同一レベルで扱う）
        else if line.starts_with("### ") || line.starts_with("#### ") || 
                line.starts_with("##### ") || line.starts_with("###### ") {
            
            // 既存のセクションがあれば、それを追加
            if in_section && !current_section_title.is_empty() {
                let content = current_section_content.trim();
                debug_info.push(format!("Adding Section: {} with content: {}", current_section_title, content));
                sections.push(json!({
                    "title": current_section_title,
                    "content": content
                }));
            }
            
            // 新しいサブセクションを開始
            let level_prefix = if line.starts_with("### ") { "### " }
                            else if line.starts_with("#### ") { "#### " }
                            else if line.starts_with("##### ") { "##### " }
                            else { "###### " };
            
            current_section_title = line.trim_start_matches(level_prefix).trim();
            current_section_content = String::new();
            in_section = true;
            debug_info.push(format!("Started new Subsection: {}", current_section_title));
        }
        // 通常のテキスト行（セクション内容）
        else if in_section {
            current_section_content.push_str(line);
            current_section_content.push('\n');
            debug_info.push(format!("Added content to Section {}: {}", current_section_title, line));
        }
        
        i += 1;
    }
    
    // 最後のセクションを追加
    if in_section && !current_section_title.is_empty() {
        let content = current_section_content.trim();
        debug_info.push(format!("Adding final Section: {} with content: {}", current_section_title, content));
        sections.push(json!({
            "title": current_section_title,
            "content": content
        }));
    }
    
    // 最終結果のJSONを構築
    result["title"] = json!(title);
    result["sections"] = json!(sections);
    
    // デバッグ情報の出力
    eprintln!("Debug - Processing info:");
    for (i, info) in debug_info.iter().enumerate() {
        eprintln!("  {}: {}", i, info);
    }
    
    // JSONからYAMLに変換
    let yaml = match serde_yaml::to_string(&result) {
        Ok(yaml) => yaml,
        Err(_) => "title: Error\ncontent: Failed to convert to YAML".to_string()
    };
    
    eprintln!("Debug - Final YAML:\n{}", yaml);
    
    yaml
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
}