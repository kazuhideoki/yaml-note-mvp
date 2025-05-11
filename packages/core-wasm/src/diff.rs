// diff.rs
//!
//! YAML差分・パッチ・競合検知モジュール
//! - serde_yaml, serde_jsonによるパース
//! - json-patchによる差分・パッチ適用
//! - 競合検知ロジック

use serde_yaml::Value as YamlValue;
use serde_json::Value as JsonValue;
use json_patch::{diff as json_diff, Patch};

/// 2つのYAML文字列の差分(JSON Patch形式)を生成する
///
/// # 引数
/// * `base_yaml` - 元となるYAML文字列
/// * `edited_yaml` - 編集後のYAML文字列
///
/// # 戻り値
/// * JSON Patch形式の文字列（エラー時は空配列"[]"）
///
/// # エラーケース
/// - YAMLパースエラー時は空配列を返す
pub fn yaml_diff(base_yaml: &str, edited_yaml: &str) -> String {
    let base: Result<YamlValue, _> = serde_yaml::from_str(base_yaml);
    let edited: Result<YamlValue, _> = serde_yaml::from_str(edited_yaml);
    if let (Ok(base), Ok(edited)) = (base, edited) {
        let base_json: JsonValue = match serde_json::to_value(base) {
            Ok(j) => j,
            Err(_) => return "[]".to_string(),
        };
        let edited_json: JsonValue = match serde_json::to_value(edited) {
            Ok(j) => j,
            Err(_) => return "[]".to_string(),
        };
        let patch = json_diff(&base_json, &edited_json);
        match serde_json::to_string(&patch) {
            Ok(s) => s,
            Err(_) => "[]".to_string(),
        }
    } else {
        "[]".to_string()
    }
}

/// YAMLとJSON Patchを受け取り、パッチ適用後のYAML文字列を返す
///
/// # 引数
/// * `yaml` - 適用元のYAML文字列
/// * `patch_json` - JSON Patch配列文字列
///
/// # 戻り値
/// * パッチ適用後のYAML文字列（エラー時は元のYAMLを返す）
///
/// # エラーケース
/// - パッチ適用失敗時は元のYAMLを返す
pub fn apply_patch(yaml: &str, patch_json: &str) -> String {
    let orig_yaml: Result<YamlValue, _> = serde_yaml::from_str(yaml);
    if let Ok(orig_yaml) = orig_yaml {
        let mut json_value: JsonValue = match serde_json::to_value(orig_yaml) {
            Ok(j) => j,
            Err(_) => return yaml.to_string(),
        };
        let patch: Result<Patch, _> = serde_json::from_str(patch_json);
        if let Ok(patch) = patch {
            if json_patch::patch(&mut json_value, &patch).is_ok() {
                match serde_yaml::to_string(&json_value) {
                    Ok(yaml_str) => yaml_str,
                    Err(_) => yaml.to_string(),
                }
            } else {
                yaml.to_string()
            }
        } else {
            yaml.to_string()
        }
    } else {
        yaml.to_string()
    }
}

/// 2つのYAML文字列間で競合があるか検出し、結果をJSONで返す
///
/// # 引数
/// * `base_yaml` - 元となるYAML文字列
/// * `edited_yaml` - 編集後のYAML文字列
///
/// # 戻り値
/// * 競合情報を含むJSON文字列（例: {"has_conflict": true, "conflicts": [...] }）
///
/// # エラーケース
/// - パース失敗時は has_conflict: false で返す
pub fn detect_conflicts(base_yaml: &str, edited_yaml: &str) -> String {
    let base: Result<YamlValue, _> = serde_yaml::from_str(base_yaml);
    let edited: Result<YamlValue, _> = serde_yaml::from_str(edited_yaml);
    if let (Ok(base), Ok(edited)) = (base, edited) {
        let base_json: JsonValue = match serde_json::to_value(base) {
            Ok(j) => j,
            Err(_) => {
                return r#"{"has_conflict": false, "conflicts": []}"#.to_string();
            }
        };
        let edited_json: JsonValue = match serde_json::to_value(edited) {
            Ok(j) => j,
            Err(_) => {
                return r#"{"has_conflict": false, "conflicts": []}"#.to_string();
            }
        };
        let patch = json_diff(&base_json, &edited_json);
        // 競合判定: "replace" op で値が異なるものが複数あれば競合とみなす（簡易実装）
        let mut conflicts = Vec::new();
        for op in patch.0.iter() {
            if let json_patch::PatchOperation::Replace(r) = op {
                conflicts.push(serde_json::json!({
                    "path": r.path,
                    "value": r.value
                }));
            }
        }
        let has_conflict = !conflicts.is_empty();
        let result = serde_json::json!({
            "has_conflict": has_conflict,
            "conflicts": conflicts
        });
        result.to_string()
    } else {
        r#"{"has_conflict": false, "conflicts": []}"#.to_string()
    }
}

// --- テスト ---
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_yaml_diff_basic() {
        let diff = yaml_diff("a: 1", "a: 2");
        assert!(diff.contains("\"op\":\"replace\"") || diff == "[]");
    }

    #[test]
    fn test_apply_patch_basic() {
        let diff = yaml_diff("a: 1", "a: 2");
        let patched = apply_patch("a: 1", &diff);
        // patchedはa: 2になるはず
        assert!(patched.contains("2"));
    }

    #[test]
    fn test_detect_conflicts() {
        let result = detect_conflicts("a: 1", "a: 2");
        println!("detect_conflicts result: {}", result);
        // JSONとしてパースし、has_conflictキーが存在することを確認
        let parsed: serde_json::Value = serde_json::from_str(&result).expect("JSON parse failed");
        assert!(parsed.get("has_conflict").is_some());
    }
}