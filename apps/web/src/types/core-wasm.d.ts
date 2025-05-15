declare module 'core-wasm' {
  /**
   * YAML文字列をパースしてJSON文字列に変換する
   */
  export function parse_yaml(yaml_str: string): string;

  /**
   * JSON文字列をYAML文字列に変換する
   */
  export function stringify_yaml(json_str: string): string;

  /**
   * YAMLを指定されたスキーマに対してバリデーションする
   */
  export function validate_yaml(yaml_str: string, schema_str: string): string;

  /**
   * YAMLに対してパッチを適用する
   */
  export function apply_patch(yaml_str: string, patch_str: string): string;

  /**
   * 2つのYAML文字列の差分(JSON Patch形式)を生成する
   */
  export function yaml_diff(base_yaml: string, edited_yaml: string): string;

  /**
   * 2つのYAML文字列間で競合があるか検出し、結果をJSONで返す
   */
  export function detect_conflicts(base_yaml: string, edited_yaml: string): string;

  /**
   * バージョン情報を取得する
   */
  export function version(): string;

  /**
   * Markdown文字列をYAML文字列に変換する
   */
  export function md_to_yaml(md: string): string;

  /**
   * YAML文字列をMarkdown文字列に変換する
   */
  export function yaml_to_md(yaml: string): string;

  /**
   * JSからのエラーメッセージをラップするためのコンバータ
   */
  export function error_to_js_value(error: any): string;
}
