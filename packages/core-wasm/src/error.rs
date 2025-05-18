use serde::{Deserialize, Serialize};
use thiserror::Error;
use wasm_bindgen::prelude::*;

use crate::error_code::ErrorCode;

/// コアモジュールのエラー型
///
/// # 概要
/// YAML Note MVPコアWASMロジックで発生しうる主要なエラー種別を網羅します。
/// - YAML/JSONパースエラー
/// - スキーマエラー
/// - バリデーションエラー
/// - フロントマターエラー
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

    #[error("Frontmatter parse error: {0}")]
    FrontmatterParseError(String),

    #[error("Frontmatter validation error: {0}")]
    FrontmatterValidationError(String),
}

/// フロントエンドに返すエラー情報
/// バリデーションやパース時のエラー情報
///
/// # フィールド
/// - `line`: エラー発生行番号（0の場合は特定不可）
/// - `message`: エラーメッセージ
/// - `path`: エラー発生箇所のパス（YAML/JSON Pointer等）
/// - `code`: エラー種別を表すコード
#[wasm_bindgen]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorInfo {
    #[wasm_bindgen(readonly)]
    pub line: u32,
    #[wasm_bindgen(getter_with_clone)]
    pub message: String,
    #[wasm_bindgen(getter_with_clone)]
    pub path: String,
    #[wasm_bindgen(readonly)]
    pub code: ErrorCode,
}

impl ErrorInfo {
    /// 新しいErrorInfoを生成
    pub fn new(
        line: u32,
        message: impl Into<String>,
        path: impl Into<String>,
        code: ErrorCode,
    ) -> Self {
        Self {
            line,
            message: message.into(),
            path: path.into(),
            code,
        }
    }

    /// serde_yaml::ErrorからErrorInfoを生成
    pub fn from_yaml_error(error: &serde_yaml::Error, code: ErrorCode) -> Self {
        let line = match error.location() {
            Some(location) => location.line() as u32,
            None => 0,
        };
        Self {
            line,
            message: error.to_string(),
            path: "".to_string(),
            code,
        }
    }
}

/// フロントエンドに返す結果型
/// バリデーションの結果を表す構造体
///
/// # フィールド
/// - `success`: バリデーション成功時はtrue
/// - `errors`: エラー情報の配列（成功時は空配列）
#[wasm_bindgen]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    #[wasm_bindgen(readonly)]
    pub success: bool,
    #[wasm_bindgen(getter_with_clone)]
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
