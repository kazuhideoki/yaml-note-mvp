/* eslint-disable @typescript-eslint/no-unused-vars */
// Mock なので特別に type,lint rule を緩くしている。
// Mock implementation of core-wasm module

export function validate_yaml(yaml_str: string, _schema_str: string): string {
  if (yaml_str.includes('error')) {
    return JSON.stringify({
      success: false,
      errors: [{ message: 'Mock validation error', line: 1, path: '' }],
    });
  }
  return JSON.stringify({ success: true, errors: [] });
}

export function parse_and_validate_frontmatter(md: string): string {
  if (md.includes('frontmatter_error')) {
    return JSON.stringify({
      success: false,
      errors: [
        {
          message: 'Frontmatter validation error',
          line: 2,
          path: 'schema_path',
        },
      ],
    });
  }
  return JSON.stringify({ success: true, errors: [] });
}

export function apply_patch(_yaml_str: string, _patch_str: string): string {
  return 'patched yaml';
}

export function version(): string {
  return '1.0.0-mock';
}

export function error_to_js_value(error: any): string {
  return JSON.stringify({ message: String(error) });
}
