// Mock implementation of core-wasm module
export function parse_yaml(yaml_str: string): string {
  try {
    return JSON.stringify({ success: true, content: "parsed yaml" });
  } catch (error) {
    return JSON.stringify({ 
      success: false, 
      errors: [{ message: "Mock parse error", line: 1, path: "" }] 
    });
  }
}

export function stringify_yaml(json_str: string): string {
  try {
    return "title: Mock YAML\ncontent: test";
  } catch (error) {
    return JSON.stringify({ 
      success: false, 
      errors: [{ message: "Mock stringify error", line: 1, path: "" }] 
    });
  }
}

export function validate_yaml(yaml_str: string, schema_str: string): string {
  if (yaml_str.includes("error")) {
    return JSON.stringify({ 
      success: false, 
      errors: [{ message: "Mock validation error", line: 1, path: "" }] 
    });
  }
  return JSON.stringify({ success: true, errors: [] });
}

export function md_to_yaml(md: string): string {
  if (md.includes("error")) {
    return JSON.stringify({ 
      success: false, 
      errors: [{ message: "Mock md_to_yaml error", line: 1, path: "" }] 
    });
  }
  return "title: Mock Title\ncontent: Mock Content";
}

export function yaml_to_md(yaml: string): string {
  if (yaml.includes("error")) {
    return JSON.stringify({ 
      success: false, 
      errors: [{ message: "Mock yaml_to_md error", line: 1, path: "" }] 
    });
  }
  return "# Mock Title\n\nMock Content";
}

export function parse_and_validate_frontmatter(md: string): string {
  if (md.includes("frontmatter_error")) {
    return JSON.stringify({ 
      success: false, 
      errors: [{ message: "Frontmatter validation error", line: 2, path: "schema_path" }] 
    });
  }
  return JSON.stringify({ success: true, errors: [] });
}

export function apply_patch(yaml_str: string, patch_str: string): string {
  return "patched yaml";
}

export function version(): string {
  return "1.0.0-mock";
}

export function error_to_js_value(error: any): string {
  return JSON.stringify({ message: String(error) });
}