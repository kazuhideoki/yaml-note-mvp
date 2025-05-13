//! frontmatter.rs
//!
//! Markdownドキュメントのフロントマター部分を解析・検証するモジュール。
//! - フロントマターの抽出と解析
//! - フロントマター構文の検証
//! - スキーマパスとバリデーションフラグの管理

use crate::error::{CoreError, ErrorInfo, ValidationResult};
use serde::{Deserialize, Serialize};

/// フロントマターの構造体
///
/// # フィールド
/// - `schema_path`: スキーマファイルへのパス（オプション）
/// - `validated`: バリデーションフラグ（デフォルトはtrue）
/// - `raw`: 元のフロントマター文字列（内部利用のみ）
#[derive(Debug, Serialize, Deserialize)]
pub struct Frontmatter {
    pub schema_path: Option<String>,
    #[serde(default = "default_validated")]
    pub validated: bool,
    #[serde(skip)]
    pub raw: String,
}

fn default_validated() -> bool {
    true
}

/// Markdownからフロントマターを抽出して解析する
///
/// # 引数
/// * `md_str` - Markdown文字列
///
/// # 戻り値
/// * 成功時: 解析されたFrontmatter構造体
/// * 失敗時: 適切なエラー（フロントマターがない場合や解析エラー等）
///
/// # エラー
/// - フロントマターが存在しない場合: FrontmatterParseError
/// - フロントマターのYAMLパースに失敗した場合: FrontmatterParseError
pub fn parse_frontmatter(md_str: &str) -> Result<Frontmatter, CoreError> {
    // フロントマターの境界を検出
    let fm_pattern = "---";
    let lines: Vec<&str> = md_str.lines().collect();

    // フロントマターの開始と終了位置を検索
    let mut start_idx = None;
    let mut end_idx = None;

    for (i, line) in lines.iter().enumerate() {
        if line.trim() == fm_pattern {
            if start_idx.is_none() {
                start_idx = Some(i);
            } else if end_idx.is_none() {
                end_idx = Some(i);
                break;
            }
        }
    }

    // フロントマターがない、または不完全な場合
    if start_idx.is_none() || end_idx.is_none() {
        return Err(CoreError::FrontmatterParseError(
            "フロントマターが見つからないか不完全です".to_string()));
    }

    // フロントマター内容を抽出
    let fm_content = lines[(start_idx.unwrap() + 1)..end_idx.unwrap()]
        .join("\n");

    // YAMLとしてパース
    match serde_yaml::from_str::<Frontmatter>(&fm_content) {
        Ok(mut frontmatter) => {
            frontmatter.raw = fm_content;
            Ok(frontmatter)
        },
        Err(e) => {
            Err(CoreError::FrontmatterParseError(
                format!("フロントマターのパースに失敗しました: {}", e)))
        }
    }
}

/// フロントマターの構文を検証する
///
/// # 引数
/// * `frontmatter` - 検証対象のFrontmatter構造体
///
/// # 戻り値
/// * ValidationResult型で検証結果を返す
///   - 成功時: success=true, errors=空配列
///   - 失敗時: success=false, errors=エラー情報の配列
///
/// # 検証項目
/// - schema_pathが存在して空でないこと
/// - validated項目が不正な値でないこと（既にBool型ならパース時に検出）
pub fn validate_frontmatter(frontmatter: &Frontmatter) -> ValidationResult {
    let mut errors = Vec::new();

    // schema_pathの検証（存在する場合）
    if let Some(path) = &frontmatter.schema_path {
        if path.trim().is_empty() {
            errors.push(ErrorInfo::new(
                0,
                "schema_pathが空です".to_string(),
                "schema_path".to_string()
            ));
        }
    }

    // エラーがあればエラー結果を、なければ成功結果を返す
    if errors.is_empty() {
        ValidationResult::success()
    } else {
        ValidationResult::error(errors)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_valid_frontmatter() {
        let md = r#"---
schema_path: ./schemas/note.yaml
validated: true
---
# Test Document"#;

        let result = parse_frontmatter(md);
        assert!(result.is_ok());

        let fm = result.unwrap();
        assert_eq!(fm.schema_path, Some("./schemas/note.yaml".to_string()));
        assert_eq!(fm.validated, true);
    }

    #[test]
    fn test_parse_missing_frontmatter() {
        let md = "# Test Document\nNo frontmatter here";
        let result = parse_frontmatter(md);
        assert!(result.is_err());
        match result {
            Err(CoreError::FrontmatterParseError(_)) => assert!(true),
            _ => panic!("Expected FrontmatterParseError"),
        }
    }

    #[test]
    fn test_validate_frontmatter_empty_schema_path() {
        let frontmatter = Frontmatter {
            schema_path: Some("".to_string()),
            validated: true,
            raw: "".to_string(),
        };

        let result = validate_frontmatter(&frontmatter);
        assert!(!result.success);
        assert!(!result.errors.is_empty());
    }

    #[test]
    fn test_default_validated() {
        let md = r#"---
schema_path: ./schemas/note.yaml
---
# Test Document"#;

        let result = parse_frontmatter(md);
        assert!(result.is_ok());

        let fm = result.unwrap();
        assert_eq!(fm.validated, true); // デフォルト値がtrueであることを確認
    }
}