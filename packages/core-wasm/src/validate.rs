use jsonschema::JSONSchema;
use serde_json::{Value, json};
use std::collections::HashMap;

/// YAMLをバリデーションして結果をJSON文字列で返す
pub fn validate_yaml(yaml_str: &str, schema_str: &str) -> String {
    // エラーをキャッチしてJSONにシリアライズする
    match do_validate(yaml_str, schema_str) {
        Ok(_) => json_success(),
        Err(errors) => json_errors(errors),
    }
}

/// 実際のバリデーションロジック
fn do_validate(yaml_str: &str, schema_str: &str) -> Result<(), Vec<ValidationErrorInfo>> {
    // 入力YAMLをパース
    let yaml: Value = match serde_yaml::from_str(yaml_str) {
        Ok(y) => y,
        Err(e) => return Err(vec![ValidationErrorInfo {
            line: locate_yaml_error(yaml_str, &e),
            message: format!("YAML parsing error: {}", e),
            path: "".to_string(),
        }]),
    };

    // スキーマをパース
    let schema: Value = match serde_yaml::from_str(schema_str) {
        Ok(s) => s,
        Err(e) => return Err(vec![ValidationErrorInfo {
            line: 0, // スキーマエラーの場合は行番号0
            message: format!("Schema parsing error: {}", e),
            path: "".to_string(),
        }]),
    };

    // JSONSchemaコンパイル
    let compiled = match JSONSchema::compile(&schema) {
        Ok(s) => s,
        Err(e) => return Err(vec![ValidationErrorInfo {
            line: 0,
            message: format!("Schema compilation error: {}", e),
            path: "".to_string(),
        }]),
    };

    // バリデーション実行
    let result = compiled.validate(&yaml);
    if let Err(errors) = result {
        // ValidationErrorをカスタム形式に変換
        let validation_errors: Vec<ValidationErrorInfo> = errors
            .map(|e| ValidationErrorInfo {
                line: find_line_for_path(yaml_str, e.instance_path.to_string()),
                message: e.to_string(),
                path: e.instance_path.to_string(),
            })
            .collect();
        return Err(validation_errors);
    }

    Ok(())
}

/// YAMLエラーの行番号を特定する関数
fn locate_yaml_error(_yaml_str: &str, error: &serde_yaml::Error) -> u32 {
    // serde_yaml::Errorから行番号を抽出
    // 実際の実装ではより複雑なロジックが必要かもしれない
    match error.location() {
        Some(location) => location.line() as u32,
        None => 0,
    }
}

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

/// バリデーションエラー情報
#[derive(Debug)]
struct ValidationErrorInfo {
    line: u32,
    message: String,
    path: String,
}

/// 成功時のJSONレスポンス
fn json_success() -> String {
    r#"{"success":true,"errors":[]}"#.to_string()
}

/// エラー時のJSONレスポンス
fn json_errors(errors: Vec<ValidationErrorInfo>) -> String {
    let errors_json: Vec<Value> = errors
        .into_iter()
        .map(|e| {
            json!({
                "line": e.line,
                "message": e.message,
                "path": e.path
            })
        })
        .collect();

    let result = json!({
        "success": false,
        "errors": errors_json
    });

    serde_json::to_string(&result).unwrap_or_else(|_|
        r#"{"success":false,"errors":[{"line":0,"message":"Failed to serialize errors","path":""}]}"#.to_string()
    )
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