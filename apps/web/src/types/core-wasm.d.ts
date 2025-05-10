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
   * バージョン情報を取得する
   */
  export function version(): string;
  
  /**
   * JSからのエラーメッセージをラップするためのコンバータ
   */
  export function error_to_js_value(error: any): string;
}