// For TypeScript support for Jest-DOM matchers
import '@testing-library/jest-dom';

// For core-wasm module
declare module 'core-wasm' {
  export function parse_yaml(yaml_str: string): string;
  export function stringify_yaml(json_str: string): string;
  export function validate_yaml(yaml_str: string, schema_str: string): string;
  export function apply_patch(yaml_str: string, patch_str: string): string;
  export function version(): string;
  export function error_to_js_value(error: any): string;
  export function md_to_yaml(md: string): string;
  export function yaml_to_md(yaml: string): string;
  export function parse_and_validate_frontmatter(md: string): string;
}