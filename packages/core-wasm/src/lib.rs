use wasm_bindgen::prelude::*;

mod validate;

#[wasm_bindgen]
pub fn validate_yaml(yaml_str: &str, schema_str: &str) -> String {
    validate::validate_yaml(yaml_str, schema_str)
}

#[wasm_bindgen]
pub fn hello_world() -> String {
    "Hello from YAML Note Core!".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_roundtrip() {
        // サンプルYAML
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
}