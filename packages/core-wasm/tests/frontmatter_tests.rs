use core_wasm::{parse_and_validate_frontmatter, md_headings_to_yaml};
use wasm_bindgen_test::*;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn test_parse_and_validate_frontmatter_valid() {
    let md = r#"---
schema_path: ./schemas/note.yaml
validated: true
---
# Test Document"#;

    let result = parse_and_validate_frontmatter(md);
    assert!(result.contains(r#""success":true"#));
}

#[wasm_bindgen_test]
fn test_parse_and_validate_frontmatter_invalid() {
    let md = r#"---
schema_path: 
validated: invalid_bool
---
# Test Document"#;

    let result = parse_and_validate_frontmatter(md);
    assert!(result.contains(r#""success":false"#));
}

#[wasm_bindgen_test]
fn test_parse_and_validate_frontmatter_missing() {
    let md = "# Test Document\nNo frontmatter here";
    
    let result = parse_and_validate_frontmatter(md);
    assert!(result.contains(r#""success":false"#));
    assert!(result.contains("フロントマターが見つからないか不完全です"));
}

#[wasm_bindgen_test]
fn test_md_headings_to_yaml_basic() {
    let md = r#"# Main Title
## Section 1
Some content
## Section 2
More content
### Subsection 2.1
Nested content"#;

    let yaml = md_headings_to_yaml(md);

    // YAML形式チェック
    assert!(yaml.contains("title: Main Title"));
    assert!(yaml.contains("heading: Section 1"));
    assert!(yaml.contains("heading: Section 2"));
    assert!(yaml.contains("heading: Subsection 2.1"));
}

#[wasm_bindgen_test]
fn test_md_headings_to_yaml_empty() {
    let md = "";
    let yaml = md_headings_to_yaml(md);
    
    // 空のドキュメントでもエラーにならないこと
    assert!(!yaml.contains("title: Error"));
}

#[wasm_bindgen_test]
fn test_md_headings_to_yaml_title_only() {
    let md = "# Just a Title";
    let yaml = md_headings_to_yaml(md);
    
    assert!(yaml.contains("title: Just a Title"));
    assert!(!yaml.contains("sections:"));
}