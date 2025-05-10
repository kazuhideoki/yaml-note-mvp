/* tslint:disable */
/* eslint-disable */
/**
* YAML文字列をバリデーションする
* @param {string} yaml_str - バリデーション対象のYAML文字列
* @param {string} schema_str - JSON Schema形式のバリデーションスキーマ（YAML形式）
* @returns {string} - バリデーション結果を含むJSON文字列
*/
export function validate_yaml(yaml_str: string, schema_str: string): string;
/**
* YAML文字列をパースしてJSON文字列に変換する
* @param {string} yaml_str - YAML形式の文字列
* @returns {string} - JSONとしてパースされたYAMLデータの文字列またはエラー情報
*/
export function parse_yaml(yaml_str: string): string;
/**
* JSON文字列をYAML文字列に変換する
* @param {string} json_str - JSON形式の文字列
* @returns {string} - YAML形式に変換された文字列またはエラー情報
*/
export function stringify_yaml(json_str: string): string;
/**
* YAMLに対してパッチを適用する
* @param {string} yaml_str - 対象のYAML文字列
* @param {string} patch_str - 適用するパッチのJSON Patch形式文字列
* @returns {string} - パッチが適用されたYAML文字列またはエラー情報
*/
export function apply_patch(yaml_str: string, patch_str: string): string;
/**
* バージョン情報を取得する
* @returns {string} - バージョン文字列
*/
export function version(): string;