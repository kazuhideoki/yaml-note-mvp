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

use serde_json::{Value, json};
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

/// YAMLに対してパッチを適用する
pub fn apply_patch(yaml_str: &str, patch_str: &str) -> String {
    // YAMLをパース
    let yaml: Value = match serde_yaml::from_str(yaml_str) {
        Ok(y) => y,
        Err(e) => {
            return ValidationResult::single_error(
                ErrorInfo::from_yaml_error(&e)
            ).to_json();
        }
    };

    // パッチをパース
    let patch: Vec<Value> = match serde_json::from_str(patch_str) {
        Ok(p) => p,
        Err(e) => {
            return ValidationResult::single_error(
                ErrorInfo::new(0, format!("Invalid JSON Patch format: {}", e), "")
            ).to_json();
        }
    };

    // パッチを適用
    match apply_json_patch(&yaml, &patch) {
        Ok(patched) => {
            match serde_yaml::to_string(&patched) {
                Ok(yaml) => yaml,
                Err(e) => {
                    ValidationResult::single_error(
                        ErrorInfo::new(0, format!("Failed to serialize YAML after patch: {}", e), "")
                    ).to_json()
                }
            }
        },
        Err(e) => {
            ValidationResult::single_error(
                ErrorInfo::new(0, format!("Failed to apply patch: {}", e), "")
            ).to_json()
        }
    }
}

/// JSONパッチ適用の簡易実装
fn apply_json_patch(doc: &Value, patch: &[Value]) -> Result<Value, String> {
    let mut result = doc.clone();

    for op in patch {
        // 必要なフィールドを取得
        let op_type = match op.get("op") {
            Some(v) => v.as_str().ok_or("Invalid op field")?,
            None => return Err("Missing 'op' field in patch".to_string()),
        };

        let path = match op.get("path") {
            Some(v) => v.as_str().ok_or("Invalid path field")?,
            None => return Err("Missing 'path' field in patch".to_string()),
        };

        // パスをトークンに分割 (/foo/bar -> ["", "foo", "bar"])
        let path_tokens: Vec<&str> = path.split('/').collect();
        if path_tokens.is_empty() || path_tokens[0] != "" {
            return Err(format!("Invalid JSON Pointer: {}", path));
        }

        match op_type {
            "add" => {
                let value = match op.get("value") {
                    Some(v) => v.clone(),
                    None => return Err("Missing 'value' field for 'add' operation".to_string()),
                };

                add_value_at_path(&mut result, &path_tokens[1..], value)?;
            },
            "remove" => {
                remove_value_at_path(&mut result, &path_tokens[1..])?;
            },
            "replace" => {
                let value = match op.get("value") {
                    Some(v) => v.clone(),
                    None => return Err("Missing 'value' field for 'replace' operation".to_string()),
                };

                replace_value_at_path(&mut result, &path_tokens[1..], value)?;
            },
            _ => return Err(format!("Unsupported operation: {}", op_type)),
        }
    }

    Ok(result)
}

/// パスに値を追加
fn add_value_at_path(doc: &mut Value, path: &[&str], value: Value) -> Result<(), String> {
    if path.is_empty() {
        *doc = value;
        return Ok(());
    }

    match doc {
        Value::Object(map) => {
            if path.len() == 1 {
                map.insert(path[0].to_string(), value);
                Ok(())
            } else {
                match map.get_mut(path[0]) {
                    Some(v) => add_value_at_path(v, &path[1..], value),
                    None => {
                        map.insert(path[0].to_string(), json!({}));
                        add_value_at_path(map.get_mut(path[0]).unwrap(), &path[1..], value)
                    }
                }
            }
        },
        Value::Array(arr) => {
            if path.len() > 0 {
                if path[0] == "-" {
                    if path.len() == 1 {
                        arr.push(value);
                        Ok(())
                    } else {
                        Err("Cannot add nested value to array end index".to_string())
                    }
                } else {
                    let index = path[0].parse::<usize>().map_err(|_| format!("Invalid array index: {}", path[0]))?;
                    if index > arr.len() {
                        return Err(format!("Array index out of bounds: {}", index));
                    }

                    if path.len() == 1 {
                        if index == arr.len() {
                            arr.push(value);
                        } else {
                            arr.insert(index, value);
                        }
                        Ok(())
                    } else if index < arr.len() {
                        add_value_at_path(&mut arr[index], &path[1..], value)
                    } else {
                        Err(format!("Cannot access nested path at index {}", index))
                    }
                }
            } else {
                *doc = value;
                Ok(())
            }
        },
        _ => Err("Cannot add value to non-object and non-array".to_string()),
    }
}

/// パスの値を削除
fn remove_value_at_path(doc: &mut Value, path: &[&str]) -> Result<(), String> {
    if path.is_empty() {
        return Err("Cannot remove root".to_string());
    }

    match doc {
        Value::Object(map) => {
            if path.len() == 1 {
                if !map.contains_key(path[0]) {
                    return Err(format!("Path not found: /{}", path[0]));
                }
                map.remove(path[0]);
                Ok(())
            } else {
                match map.get_mut(path[0]) {
                    Some(v) => remove_value_at_path(v, &path[1..]),
                    None => Err(format!("Path not found: /{}", path.join("/"))),
                }
            }
        },
        Value::Array(arr) => {
            if path.len() > 0 {
                if path[0] == "-" {
                    return Err("Cannot remove from end of array marker".to_string());
                }

                let index = path[0].parse::<usize>().map_err(|_| format!("Invalid array index: {}", path[0]))?;
                if index >= arr.len() {
                    return Err(format!("Array index out of bounds: {}", index));
                }

                if path.len() == 1 {
                    arr.remove(index);
                    Ok(())
                } else {
                    remove_value_at_path(&mut arr[index], &path[1..])
                }
            } else {
                Err("Cannot remove from empty path".to_string())
            }
        },
        _ => Err("Cannot remove value from non-object and non-array".to_string()),
    }
}

/// パスの値を置換
fn replace_value_at_path(doc: &mut Value, path: &[&str], value: Value) -> Result<(), String> {
    if path.is_empty() {
        *doc = value;
        return Ok(());
    }

    match doc {
        Value::Object(map) => {
            if path.len() == 1 {
                if !map.contains_key(path[0]) {
                    return Err(format!("Path not found for replace: /{}", path[0]));
                }
                map.insert(path[0].to_string(), value);
                Ok(())
            } else {
                match map.get_mut(path[0]) {
                    Some(v) => replace_value_at_path(v, &path[1..], value),
                    None => Err(format!("Path not found for replace: /{}", path.join("/"))),
                }
            }
        },
        Value::Array(arr) => {
            if path.len() > 0 {
                if path[0] == "-" {
                    return Err("Cannot replace end of array marker".to_string());
                }

                let index = path[0].parse::<usize>().map_err(|_| format!("Invalid array index: {}", path[0]))?;
                if index >= arr.len() {
                    return Err(format!("Array index out of bounds: {}", index));
                }

                if path.len() == 1 {
                    arr[index] = value;
                    Ok(())
                } else {
                    replace_value_at_path(&mut arr[index], &path[1..], value)
                }
            } else {
                *doc = value;
                Ok(())
            }
        },
        _ => Err("Cannot replace value in non-object and non-array".to_string()),
    }
}

// Full JSON Schema validation is removed for WASM compatibility
// This function is kept for future implementation
// Note: This is a temporary implementation that only checks YAML syntax

/// JSONパスから対応するYAMLの行番号を見つける関数
fn find_line_for_path(yaml_str: &str, path: String) -> u32 {
    // 簡易実装: パスからキーを抽出して行番号を見つける
    // 実際の実装では、より効率的で正確なアルゴリズムが必要
    let lines: Vec<&str> = yaml_str.lines().collect();
    let last_key = path.split('/').last().unwrap_or("");

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

    #[test]
    fn apply_patch_add() {
        let yaml = r#"
        title: Test Note
        content: Original content
        "#;

        let patch = r#"[
            { "op": "add", "path": "/tags", "value": ["test", "yaml"] },
            { "op": "add", "path": "/metadata", "value": { "author": "Test User" } }
        ]"#;

        let result = apply_patch(yaml, patch);

        // 新しいフィールドが追加されていることを確認
        assert!(result.contains("tags:"));
        assert!(result.contains("- test"));
        assert!(result.contains("- yaml"));
        assert!(result.contains("metadata:"));
        assert!(result.contains("author: Test User"));
    }

    #[test]
    fn apply_patch_replace() {
        let yaml = r#"
        title: Test Note
        content: Original content
        tags:
          - old
        "#;

        let patch = r#"[
            { "op": "replace", "path": "/content", "value": "Updated content" },
            { "op": "replace", "path": "/tags/0", "value": "new" }
        ]"#;

        let result = apply_patch(yaml, patch);

        // フィールドが置換されていることを確認
        assert!(result.contains("content: Updated content"));
        assert!(result.contains("- new"));
        assert!(!result.contains("- old"));
    }

    #[test]
    fn apply_patch_remove() {
        let yaml = r#"
        title: Test Note
        content: Original content
        tags:
          - test
          - remove-me
        "#;

        let patch = r#"[
            { "op": "remove", "path": "/tags/1" }
        ]"#;

        let result = apply_patch(yaml, patch);

        // フィールドが削除されていることを確認
        assert!(result.contains("- test"));
        assert!(!result.contains("- remove-me"));
    }

    #[test]
    fn apply_patch_invalid() {
        let yaml = r#"
        title: Test Note
        content: Original content
        "#;

        let invalid_patch = r#"[
            { "op": "unknown", "path": "/content", "value": "test" }
        ]"#;

        let result = apply_patch(yaml, invalid_patch);

        // エラーが含まれていることを確認
        assert!(result.contains(r#""success":false"#));
        assert!(result.contains(r#""message":"#));
    }
}