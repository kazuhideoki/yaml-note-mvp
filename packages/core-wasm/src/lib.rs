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

use serde_json::Value;
use wasm_bindgen::prelude::*;

mod error;
mod validate;
mod md_transform;

pub use error::{CoreError, ErrorInfo, ValidationResult};

/// YAML文字列をパースしてJSON文字列に変換する
///
/// # 概要
/// YAML形式の文字列を受け取り、serde_yamlでパース後、serde_jsonでJSON文字列に変換します。
/// 変換に失敗した場合は、エラー情報を含むJSON文字列を返します。
///
/// # 引数
/// * `yaml_str` - YAML形式の文字列
///
/// # 戻り値
/// * 成功時: JSONとしてパースされたYAMLデータの文字列
/// * 失敗時: エラー情報を含むJSON文字列
///
/// # 例
/// ```
/// use core_wasm::parse_yaml;
/// let yaml = "title: Hello\ncontent: World";
/// let json = parse_yaml(yaml);
/// // => "{\"title\":\"Hello\",\"content\":\"World\"}"
/// ```
///
/// # WASMバインディング
/// JavaScriptからは `coreWasm.parse_yaml(yamlStr)` のように呼び出せます。
///
/// # エラー
/// - YAMLパースエラー時: エラー内容を含むJSON文字列
/// - JSONシリアライズエラー時: エラー内容を含むJSON文字列
#[wasm_bindgen]
pub fn parse_yaml(yaml_str: &str) -> String {
    match serde_yaml::from_str::<Value>(yaml_str) {
        Ok(value) => {
            match serde_json::to_string(&value) {
                Ok(json) => json,
                Err(e) => {
                    let result = ValidationResult::single_error(
                        ErrorInfo::new(0, format!("JSON serialization error: {}", e), "")
                    );
                    result.to_json()
                }
            }
        }
        Err(e) => {
            let result = ValidationResult::single_error(
                ErrorInfo::new(0, format!("YAML parse error: {}", e), "")
            );
            result.to_json()
        }
    }
}

/// Markdown文字列をYAML文字列に変換する
///
/// # 引数
/// * `md_str` - Markdown形式の文字列
///
/// # 戻り値
/// * 成功時: YAML形式の文字列
/// * 失敗時: エラー情報を含むJSON文字列
#[wasm_bindgen]
pub fn md_to_yaml(md_str: &str) -> String {
    md_transform::md_to_yaml(md_str)
}

/// YAML文字列をMarkdown文字列に変換する
///
/// # 引数
/// * `yaml_str` - YAML形式の文字列
///
/// # 戻り値
/// * 成功時: Markdown形式の文字列
/// * 失敗時: エラー情報を含むJSON文字列
#[wasm_bindgen]
pub fn yaml_to_md(yaml_str: &str) -> String {
    md_transform::yaml_to_md(yaml_str)
}

/// JSON文字列をYAML文字列に変換する
///
/// # 引数
/// * `json_str` - JSON形式の文字列
///
/// # 戻り値
/// * 成功時: YAML形式に変換された文字列
/// * 失敗時: エラー情報を含むJSON文字列
#[wasm_bindgen]
pub fn stringify_yaml(json_str: &str) -> String {
    match serde_json::from_str::<Value>(json_str) {
        Ok(value) => {
            match serde_yaml::to_string(&value) {
                Ok(yaml) => yaml,
                Err(e) => {
                    let result = ValidationResult::single_error(
                        ErrorInfo::new(0, format!("YAML serialization error: {}", e), "")
                    );
                    result.to_json()
                }
            }
        },
        Err(e) => {
            let result = ValidationResult::single_error(
                ErrorInfo::new(0, format!("JSON parse error: {}", e), "")
            );
            result.to_json()
        }
    }
}

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
#[wasm_bindgen]
pub fn compile_schema(schema_str: &str) -> String {
    validate::compile_schema(schema_str)
}

/// バージョン情報を取得する
#[wasm_bindgen]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}


#[cfg(test)]
mod tests {
    use super::*;

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

    #[test]
    fn parse_roundtrip_complex() {
        // 複雑なYAML (配列、ネストされたオブジェクトを含む)
        let yaml = r#"
        title: Complex Test
        tags:
          - yaml
          - test
          - nested
        metadata:
          created: 2023-05-10
          author:
            name: Test User
            email: test@example.com
        items:
          - id: 1
            name: Item 1
          - id: 2
            name: Item 2
        "#;

        // WASM API経由でラウンドトリップをテスト
        let json = parse_yaml(yaml);
        let yaml2 = stringify_yaml(&json);

        // JSONにエラー情報が含まれていないことを確認
        assert!(!json.contains("\"success\":false"));

        // 元のYAMLをパースした結果と比較
        let value1: serde_yaml::Value = serde_yaml::from_str(yaml).unwrap();
        let value2: serde_yaml::Value = serde_yaml::from_str(&yaml2).unwrap();

        assert_eq!(value1, value2);
    }

    #[test]
    fn parse_yaml_invalid() {
        // 不正なYAML
        let invalid_yaml = r#"
        title: Invalid
          indentation: wrong
        unclosed: "string
        "#;

        let result = parse_yaml(invalid_yaml);

        // エラー情報が含まれていることを確認
        assert!(result.contains("\"success\":false"));
        assert!(result.contains("\"message\":"));
    }
}