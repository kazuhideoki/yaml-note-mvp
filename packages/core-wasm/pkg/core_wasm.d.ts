/* tslint:disable */
/* eslint-disable */
/**
 * YAML文字列をパースしてJSON文字列に変換する
 *
 * # 引数
 * * `yaml_str` - YAML形式の文字列
 *
 * # 戻り値
 * * 成功時: JSONとしてパースされたYAMLデータの文字列
 * * 失敗時: エラー情報を含むJSON文字列
 */
export function parse_yaml(yaml_str: string): string;
/**
 * JSON文字列をYAML文字列に変換する
 *
 * # 引数
 * * `json_str` - JSON形式の文字列
 *
 * # 戻り値
 * * 成功時: YAML形式に変換された文字列
 * * 失敗時: エラー情報を含むJSON文字列
 */
export function stringify_yaml(json_str: string): string;
/**
 * YAMLを指定されたスキーマに対してバリデーションする
 *
 * # 引数
 * * `yaml_str` - バリデーション対象のYAML文字列
 * * `schema_str` - JSON Schema形式のバリデーションスキーマ（YAML形式）
 *
 * # 戻り値
 * * バリデーション結果を含むJSON文字列
 */
export function validate_yaml(yaml_str: string, schema_str: string): string;
/**
 * YAMLに対してパッチを適用する
 *
 * # 引数
 * * `yaml_str` - 対象のYAML文字列
 * * `patch_str` - 適用するパッチのJSON Patch形式文字列
 *
 * # 戻り値
 * * 成功時: パッチが適用されたYAML文字列
 * * 失敗時: エラー情報を含むJSON文字列
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
