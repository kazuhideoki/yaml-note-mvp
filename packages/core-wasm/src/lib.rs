//! # core-wasm
//!
//! YAML Note MVP アプリケーションのコアロジックを提供するクレート。
//! 主にYAML文字列のパース、JSON Schemaを用いたバリデーション機能を
//! WebAssembly経由でJavaScript環境に公開する。
//!
//! ## 主な公開API
//! - `parse_yaml`: YAML→JSON変換
//! - `validate_yaml`: YAML+スキーマのバリデーション
//! - `stringify_yaml`: JSON→YAML変換
//!
//! ## 内部モジュール
//! - `error`: エラー型とバリデーション結果
//! - `validate`: バリデーションロジック

use wasm_bindgen::prelude::*;

mod error;
mod error_code;
mod frontmatter;
mod md_transform;
mod schema_compile;
mod validate;

pub use error_code::ErrorCode;

pub use error::{CoreError, ErrorInfo, ValidationResult};

/// YAMLを指定されたスキーマに対してバリデーションする
///
/// # 引数
/// * `yaml_str` - バリデーション対象のYAML文字列
/// * `schema_str` - JSON Schema形式のバリデーションスキーマ（YAML形式）
///
/// # 戻り値
/// * バリデーション結果を含むJSON文字列
#[wasm_bindgen]
pub fn validate_yaml(yaml_str: &str, schema_str: &str) -> String {
    validate::validate_yaml(yaml_str, schema_str)
}

/// JSON Schemaをコンパイルし、スキーマ自体が有効かどうかを検証する
///
/// # 引数
/// * `schema_str` - 検証対象のJSON Schema文字列（YAML形式）
///
/// # 戻り値
/// * バリデーション結果を含むJSON文字列
///
/// # エラーケース
/// - YAMLパースエラー
/// - スキーマ構文エラー（無効なtypeフィールドなど）
/// - 論理エラー（存在しないプロパティをrequiredに指定など）
#[wasm_bindgen]
pub fn compile_schema(schema_str: &str) -> String {
    schema_compile::compile_schema(schema_str)
}

/// バージョン情報を取得する
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Markdownからフロントマターを解析して検証結果を返す
///
/// # 引数
/// * `md_str` - フロントマターを含むMarkdown文字列
///
/// # 戻り値
/// * 検証結果を含むJSON文字列
///   - 成功時: `{"success":true,"errors":[]}`
///   - 失敗時: `{"success":false,"errors":[ErrorInfo, ...]}`
///
/// # エラーケース
/// - フロントマターがない、または不完全な場合
/// - YAMLパースエラー
/// - フロントマター構文エラー（空のschema_pathなど）
#[wasm_bindgen]
pub fn parse_and_validate_frontmatter(md_str: &str) -> String {
    match frontmatter::parse_frontmatter(md_str) {
        Ok(frontmatter) => {
            let validation_result = frontmatter::validate_frontmatter(&frontmatter);
            validation_result.to_json()
        }
        Err(e) => ValidationResult::single_error(ErrorInfo::new(0, e.to_string(), "", ErrorCode::FrontmatterParse)).to_json(),
    }
}

/// Markdownの見出し構造をYAML形式に変換する
///
/// # 引数
/// * `md_str` - Markdown文字列
///
/// # 戻り値
/// * 見出し構造に基づいたYAML文字列
///   - H1 → title フィールド
///   - H2 → sections 配列の要素
///   - H3 → sections[].subsections 配列の要素
#[wasm_bindgen]
pub fn md_headings_to_yaml(md_str: &str) -> String {
    md_transform::md_headings_to_yaml(md_str)
}

#[cfg(test)]
mod tests {
    #[test]
    fn parse_roundtrip_simple() {
        // 単純なYAML
        let yaml = r#"
        title: Test Note
        content: This is a test note
        "#;

        // YAML->JSON->YAML のラウンドトリップでデータが保持されるか検証
        let value: serde_yaml::Value = serde_yaml::from_str(yaml).unwrap();
        let json = serde_json::to_string(&value).unwrap();
        let value2: serde_yaml::Value = serde_json::from_str(&json).unwrap();
        let yaml2 = serde_yaml::to_string(&value2).unwrap();

        // 元のYAMLを正規化したものと比較
        let value1_norm: serde_yaml::Value = serde_yaml::from_str(yaml).unwrap();
        let yaml1_norm = serde_yaml::to_string(&value1_norm).unwrap();

        assert_eq!(yaml1_norm, yaml2);
    }
}
