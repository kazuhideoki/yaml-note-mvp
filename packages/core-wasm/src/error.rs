use serde::{Deserialize, Serialize};
use thiserror::Error;
use wasm_bindgen::prelude::*;

/// コアモジュールのエラー型
#[derive(Error, Debug)]
pub enum CoreError {
    #[error("YAML parse error: {0}")]
    YamlParseError(#[from] serde_yaml::Error),

    #[error("JSON parse error: {0}")]
    JsonParseError(#[from] serde_json::Error),

    #[error("Schema error: {0}")]
    SchemaError(String),

    #[error("Validation error: {0}")]
    ValidationError(String),
}

/// フロントエンドに返すエラー情報
#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorInfo {
    pub line: u32,
    pub message: String,
    pub path: String,
}

impl ErrorInfo {
    pub fn new(line: u32, message: impl Into<String>, path: impl Into<String>) -> Self {
        Self {
            line,
            message: message.into(),
            path: path.into(),
        }
    }

    pub fn from_yaml_error(error: &serde_yaml::Error) -> Self {
        let line = match error.location() {
            Some(location) => location.line() as u32,
            None => 0,
        };

        Self {
            line,
            message: format!("YAML parse error: {}", error),
            path: "".to_string(),
        }
    }
}

/// フロントエンドに返す結果型
#[derive(Debug, Serialize, Deserialize)]
pub struct ValidationResult {
    pub success: bool,
    pub errors: Vec<ErrorInfo>,
}

impl ValidationResult {
    pub fn success() -> Self {
        Self {
            success: true,
            errors: vec![],
        }
    }

    pub fn error(errors: Vec<ErrorInfo>) -> Self {
        Self {
            success: false,
            errors,
        }
    }

    pub fn single_error(error: ErrorInfo) -> Self {
        Self {
            success: false,
            errors: vec![error],
        }
    }

    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| {
            r#"{"success":false,"errors":[{"line":0,"message":"Failed to serialize errors","path":""}]}"#.to_string()
        })
    }
}

/// JSからのエラーメッセージをラップするためのコンバータ
#[wasm_bindgen]
pub fn error_to_js_value(error: &JsValue) -> String {
    format!("JS Error: {:?}", error)
}