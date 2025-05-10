use serde_json::Value;
use wasm_bindgen::prelude::*;

mod error;
mod validate;

pub use error::{CoreError, ErrorInfo, ValidationResult};

/// YAML文字列をパースしてJSON文字列に変換する
///
/// # 引数
/// * `yaml_str` - YAML形式の文字列
///
/// # 戻り値
/// * 成功時: JSONとしてパースされたYAMLデータの文字列
/// * 失敗時: エラー情報を含むJSON文字列
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
        },
        Err(e) => {
            let result = ValidationResult::single_error(
                ErrorInfo::from_yaml_error(&e)
            );
            result.to_json()
        }
    }
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

/// YAMLに対してパッチを適用する
///
/// # 引数
/// * `yaml_str` - 対象のYAML文字列
/// * `patch_str` - 適用するパッチのJSON Patch形式文字列
///
/// # 戻り値
/// * 成功時: パッチが適用されたYAML文字列
/// * 失敗時: エラー情報を含むJSON文字列
#[wasm_bindgen]
pub fn apply_patch(yaml_str: &str, patch_str: &str) -> String {
    validate::apply_patch(yaml_str, patch_str)
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