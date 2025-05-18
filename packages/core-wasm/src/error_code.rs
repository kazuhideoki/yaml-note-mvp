use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// バリデーションエラー種別を表すコード
///
/// JS側でも利用できるよう `wasm_bindgen` で公開する
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum ErrorCode {
    /// YAMLパースエラー
    YamlParse,
    /// スキーマコンパイルエラー
    SchemaCompile,
    /// フロントマターパースエラー
    FrontmatterParse,
    /// フロントマター検証エラー
    FrontmatterValidation,
    /// スキーマ検証エラー
    SchemaValidation,
    /// 未分類のエラー
    Unknown,
}
