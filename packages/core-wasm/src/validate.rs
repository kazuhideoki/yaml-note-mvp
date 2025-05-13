//! validate.rs
//!
//! このモジュールはYAML Note MVPのコアWASMロジックの一部として、
//! YAMLデータのバリデーション機能を提供します。
//! YAML文字列とスキーマ（JSON Schema, YAML形式可）を受け取り、
//! バリデーション結果をJSON形式で返します。
//!
//! - serde_yaml, serde_jsonによるパース
//! - jsonschema-validによるスキーマ検証
//! - エラー情報の構造化
//!
//! WASMバインディング経由でJavaScriptから利用されることを想定しています。

use serde_json::Value;
use crate::error::{ErrorInfo, ValidationResult};

use jsonschema_valid::schemas::Draft;
use jsonschema_valid::Config;

/// YAMLデータを指定スキーマでバリデーションし、結果をJSON文字列で返す
///
/// # 引数
/// * `yaml_str` - バリデーション対象のYAML文字列
/// * `schema_str` - JSON Schema（YAMLまたはJSON形式）
///
/// # 返り値
/// * バリデーション成功時: `{"success": true, "errors": []}`
/// * バリデーション失敗時: `{"success": false, "errors": [ErrorInfo, ...]}`
///
/// # エラーケース
/// - YAMLパースエラー、スキーマパースエラー、スキーマコンパイルエラー時も
///   `success: false` でエラー内容を含むJSONを返す
///
/// # 用途
/// - WASMバインディング経由でJSから呼び出される
pub fn validate_yaml(yaml_str: &str, schema_str: &str) -> String {
    // YAMLをパース
    let yaml_value: Value = match serde_yaml::from_str(yaml_str) {
        Ok(v) => v,
        Err(e) => {
            return ValidationResult::error(vec![ErrorInfo::from_yaml_error(&e)]).to_json();
        }
    };

    // スキーマをパース
    let schema_value: Value = match serde_yaml::from_str(schema_str) {
        Ok(v) => v,
        Err(e) => {
            return ValidationResult::error(vec![ErrorInfo::from_yaml_error(&e)]).to_json();
        }
    };

    // スキーマをコンパイル
    let compiled = match Config::from_schema(&schema_value, Some(Draft::Draft7)) {
        Ok(c) => c,
        Err(e) => {
            return ValidationResult::error(vec![ErrorInfo::new(0, format!("Schema compile error: {}", e), "")]).to_json();
        }
    };

    // バリデーション実行
    let result = compiled.validate(&yaml_value);

    match result {
        Ok(_) => ValidationResult::success().to_json(),
        Err(errors) => {
            let errors: Vec<ErrorInfo> = errors
                .map(|err| {
                    let path = if !err.instance_path.is_empty() {
                        format!("/{}", err.instance_path.join("/"))
                    } else {
                        "".to_string()
                    };
                    let line = find_line_for_path(yaml_str, path.clone());
                    ErrorInfo {
                        line,
                        message: err.to_string(),
                        path,
                    }
                })
                .collect();
            ValidationResult::error(errors).to_json()
        }
    }
}

/// JSONスキーマ自体の妥当性を検証する関数
///
/// # 引数
/// * `schema_str` - 検証対象のJSON Schemaをテキスト形式で受け取る（YAML形式可）
///
/// # 返り値
/// * バリデーション成功時: `{"success": true, "errors": []}`
/// * バリデーション失敗時: `{"success": false, "errors": [ErrorInfo, ...]}`
///
/// # エラーケース
/// - YAMLパースエラー、JSON Schemaとして妥当でない場合にエラー情報を含むJSONを返す
///
/// # 用途
/// - WASMバインディング経由でJSから呼び出され、スキーマ自体の検証に使用される
pub fn compile_schema(schema_str: &str) -> String {
    // スキーマをパース
    let schema_value: Value = match serde_yaml::from_str(schema_str) {
        Ok(v) => v,
        Err(e) => {
            return ValidationResult::error(vec![ErrorInfo::from_yaml_error(&e)]).to_json();
        }
    };

    // スキーマのタイプをチェック
    match schema_value.get("type") {
        Some(type_value) => {
            // Verify the type value is valid
            let valid_types = ["object", "array", "string", "number", "integer", "boolean", "null"];
            let type_str = match type_value.as_str() {
                Some(s) => s,
                None => {
                    return ValidationResult::error(vec![
                        ErrorInfo::new(0, "Schema 'type' field must be a string", "")
                    ]).to_json();
                }
            };
            
            if !valid_types.contains(&type_str) {
                return ValidationResult::error(vec![
                    ErrorInfo::new(0, format!("Invalid schema type: '{}'. Must be one of: object, array, string, number, integer, boolean, null", type_str), "")
                ]).to_json();
            }
        },
        None => {
            return ValidationResult::error(vec![
                ErrorInfo::new(0, "Schema missing 'type' field", "")
            ]).to_json();
        }
    }

    // スキーマをコンパイル（スキーマ自体が有効かチェック）
    match Config::from_schema(&schema_value, Some(Draft::Draft7)) {
        Ok(_) => {
            // コンパイル成功 - スキーマは有効
            ValidationResult::success().to_json()
        },
        Err(e) => {
            // コンパイルエラー - スキーマが無効
            ValidationResult::error(vec![
                ErrorInfo::new(0, format!("Schema compilation error: {}", e), "")
            ]).to_json()
        }
    }
}

/// JSONパスから対応するYAMLの行番号を見つける関数
fn find_line_for_path(yaml_str: &str, path: String) -> u32 {
    // 簡易実装: パスからキーを抽出して行番号を見つける
    // 実際の実装では、より効率的で正確なアルゴリズムが必要
    let lines: Vec<&str> = yaml_str.lines().collect();
    let last_key = path.split('/').next_back().unwrap_or("");

    for (i, line) in lines.iter().enumerate() {
        if line.contains(last_key) && line.contains(':') {
            return (i + 1) as u32;
        }
    }

    0 // デフォルト値
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_ok() {
        let schema = r#"
        type: object
        properties:
          title:
            type: string
          content:
            type: string
        required:
          - title
        "#;

        let valid_yaml = r#"
        title: Test Note
        content: This is a test content
        "#;

        let result = validate_yaml(valid_yaml, schema);
        assert!(result.contains(r#""success":true"#));
    }

    #[test]
    fn validate_error() {
        let schema = r#"
        type: object
        properties:
          title:
            type: string
          content:
            type: string
        required:
          - title
        "#;

        let invalid_yaml = r#"
        content: Missing title field
        "#;

        let result = validate_yaml(invalid_yaml, schema);
        assert!(result.contains(r#""success":false"#));
        assert!(result.contains(r#""message":"#)); // エラーメッセージがあること
    }
}

#[cfg(test)]
mod compile_schema_tests {
    use super::*;

    #[test]
    fn test_valid_schema() {
        let valid_schema = r#"
        type: object
        properties:
          title:
            type: string
          content:
            type: string
        required:
          - title
        "#;

        let result = compile_schema(valid_schema);
        assert!(result.contains(r#""success":true"#));
    }

    #[test]
    fn test_invalid_schema() {
        let invalid_schema = r#"
        type: invalid_type  # Invalid type value
        properties:
          title:
            type: string
        "#;

        let result = compile_schema(invalid_schema);
        assert!(result.contains(r#""success":false"#));
    }

    #[test]
    fn test_missing_type_schema() {
        let missing_type_schema = r#"
        properties:
          title:
            type: string
        "#;

        let result = compile_schema(missing_type_schema);
        assert!(result.contains(r#""success":false"#));
        assert!(result.contains("missing 'type' field"));
    }
}