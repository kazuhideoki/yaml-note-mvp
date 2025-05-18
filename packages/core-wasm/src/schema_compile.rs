//! schema_compile.rs
//!
//! JSONスキーマの構文/意味論的検証機能を提供する。
//! - YAMLパースエラーの検出
//! - JSONスキーマとしての検証（メタスキーマに対する検証）

use serde_json::Value;
use crate::error::{ErrorInfo, ValidationResult};
use crate::error_code::ErrorCode;

/// JSONスキーマをコンパイルして検証する
///
/// # 引数
/// * `schema_yaml` - 検証対象のスキーマYAML文字列
///
/// # 戻り値
/// * JSON形式のバリデーション結果
/// * 成功時: `{"success": true, "errors": []}`
/// * 失敗時: `{"success": false, "errors": [ErrorInfo, ...]}`
///
/// # エラーケース
/// - YAMLパースエラー時
/// - JSONスキーマとして無効な場合（必須フィールドの欠落など）
pub fn compile_schema(schema_yaml: &str) -> String {
    // YAMLをパース
    let schema_value: Result<Value, serde_yaml::Error> = serde_yaml::from_str(schema_yaml);
    
    // パースエラーがあればそれを返す
    match schema_value {
        Ok(value) => {
            // スキーマの基本検証
            if let Err(error) = validate_schema_basics(&value) {
                return ValidationResult::error(vec![ErrorInfo::new(0, error, "", ErrorCode::SchemaCompile)]).to_json();
            }

            // メタスキーマによる検証
            if let Err(error) = validate_schema_structure(&value) {
                return ValidationResult::error(vec![ErrorInfo::new(0, error, "", ErrorCode::SchemaCompile)]).to_json();
            }

            // 成功
            ValidationResult::success().to_json()
        },
        Err(err) => {
            let line = match err.location() {
                Some(location) => location.line() as u32,
                None => 0,
            };
            
            // エラーを構造化して返す
            ValidationResult::error(vec![
                ErrorInfo::new(
                    line,
                    format!("スキーマ構文エラー: YAML解析に失敗しました - {}", err),
                    "",
                    ErrorCode::YamlParse,
                )
            ]).to_json()
        }
    }
}

/// スキーマの基本的な構造を検証する内部関数
fn validate_schema_basics(schema: &Value) -> Result<(), String> {
    // スキーマにはtypeフィールドが必要
    let type_value = match schema.get("type") {
        Some(t) => t,
        None => return Err("スキーマ構文エラー: スキーマには 'type' フィールドが必要です".to_string()),
    };

    // typeは文字列である必要がある
    let type_str = match type_value.as_str() {
        Some(s) => s,
        None => return Err("スキーマ構文エラー: 'type' フィールドは文字列でなければなりません".to_string()),
    };

    // typeは有効な値である必要がある
    let valid_types = ["object", "array", "string", "number", "integer", "boolean", "null"];
    if !valid_types.contains(&type_str) {
        return Err(format!(
            "スキーマ構文エラー: '{}' は有効なtypeではありません。object, array, string, number, integer, boolean, nullのいずれかである必要があります", 
            type_str
        ));
    }

    // objectタイプの場合はpropertiesフィールドが必要
    if type_str == "object" && schema.get("properties").is_none() {
        return Err("スキーマ構文エラー: objectタイプのスキーマには 'properties' フィールドが必要です".to_string());
    }

    // arrayタイプの場合はitemsフィールドが必要
    if type_str == "array" && schema.get("items").is_none() {
        return Err("スキーマ構文エラー: arrayタイプのスキーマには 'items' フィールドが必要です".to_string());
    }

    Ok(())
}

/// スキーマの詳細構造を検証する内部関数
/// より詳細なスキーマの構造上の問題を検出する
fn validate_schema_structure(schema: &Value) -> Result<(), String> {
    // プロパティの検証
    if let Some(properties) = schema.get("properties") {
        if !properties.is_object() {
            return Err("スキーマ構文エラー: 'properties' フィールドはオブジェクトでなければなりません".to_string());
        }

        // 各プロパティの検証
        let props = properties.as_object().unwrap();
        for (prop_name, prop_schema) in props {
            // 各プロパティはオブジェクトである必要がある
            if !prop_schema.is_object() {
                return Err(format!(
                    "スキーマ構文エラー: プロパティ '{}' の定義がオブジェクトではありません", 
                    prop_name
                ));
            }

            // プロパティにtypeフィールドがあるか確認
            if prop_schema.get("type").is_none() {
                return Err(format!(
                    "スキーマ構文エラー: プロパティ '{}' に 'type' フィールドがありません", 
                    prop_name
                ));
            }
        }
    }

    // requiredフィールドの検証
    if let Some(required) = schema.get("required") {
        if !required.is_array() {
            return Err("スキーマ構文エラー: 'required' フィールドは配列でなければなりません".to_string());
        }

        // requiredフィールドの各要素が文字列であることを確認
        let required_arr = required.as_array().unwrap();
        for (i, item) in required_arr.iter().enumerate() {
            if !item.is_string() {
                return Err(format!(
                    "スキーマ構文エラー: 'required' 配列の要素 {} は文字列でなければなりません", 
                    i
                ));
            }

            // propertiesに存在しない項目がrequiredになっていないかチェック
            if let Some(properties) = schema.get("properties") {
                let props = properties.as_object().unwrap();
                let prop_name = item.as_str().unwrap();
                if !props.contains_key(prop_name) {
                    return Err(format!(
                        "スキーマ構文エラー: required指定されたプロパティ '{}' がpropertiesに定義されていません", 
                        prop_name
                    ));
                }
            }
        }
    }

    // より詳細な検証ルールはここに追加可能

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_valid_schema() {
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

        let result = compile_schema(schema);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["success"], json!(true));
    }

    #[test]
    fn test_invalid_yaml_syntax() {
        // Use actually invalid YAML syntax with mismatched brackets
        let schema = r#"
            type: object
            properties:
              title: {
                type: string
              
              content:
                type: string
            required:
              - title
        "#;

        let result = compile_schema(schema);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["success"], json!(false));
        assert!(parsed["errors"][0]["message"].as_str().unwrap().contains("スキーマ構文エラー"));
    }

    #[test]
    fn test_missing_type() {
        let schema = r#"
            properties:
              title:
                type: string
              content:
                type: string
        "#;

        let result = compile_schema(schema);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["success"], json!(false));
        assert!(parsed["errors"][0]["message"].as_str().unwrap().contains("type"));
    }

    #[test]
    fn test_invalid_type() {
        let schema = r#"
            type: invalid_type
            properties:
              title:
                type: string
        "#;

        let result = compile_schema(schema);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["success"], json!(false));
        assert!(parsed["errors"][0]["message"].as_str().unwrap().contains("有効なtype"));
    }

    #[test]
    fn test_missing_properties() {
        let schema = r#"
            type: object
            required:
              - title
        "#;

        let result = compile_schema(schema);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["success"], json!(false));
        assert!(parsed["errors"][0]["message"].as_str().unwrap().contains("properties"));
    }

    #[test]
    fn test_invalid_required() {
        let schema = r#"
            type: object
            properties:
              title:
                type: string
            required:
              - non_existent_property
        "#;

        let result = compile_schema(schema);
        let parsed: serde_json::Value = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed["success"], json!(false));
        assert!(parsed["errors"][0]["message"].as_str().unwrap().contains("non_existent_property"));
    }
}