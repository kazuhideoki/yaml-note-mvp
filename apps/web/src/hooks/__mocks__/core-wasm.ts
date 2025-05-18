/* eslint-disable @typescript-eslint/no-unused-vars */
// Mock なので特別に type,lint rule を緩くしている。
// Mock implementation of core-wasm module

export function validate_yaml(yaml_str: string, _schema_str: string): string {
  if (yaml_str.includes('error')) {
    return JSON.stringify({
      success: false,
      errors: [
        {
          message: 'Mock validation error',
          line: 1,
          path: '',
          code: 4, // ErrorCode.SchemaValidation
        },
      ],
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
          code: 3, // ErrorCode.FrontmatterValidation
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
