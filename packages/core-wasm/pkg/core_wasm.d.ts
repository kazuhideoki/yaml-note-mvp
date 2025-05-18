/* tslint:disable */
/* eslint-disable */
export enum ErrorCode {
  YamlParse = "YamlParse",
  SchemaCompile = "SchemaCompile",
  FrontmatterParse = "FrontmatterParse",
  FrontmatterValidation = "FrontmatterValidation",
  SchemaValidation = "SchemaValidation",
  Unknown = "Unknown"
}
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
 * JSON Schemaをコンパイルし、スキーマ自体が有効かどうかを検証する
 *
 * # 引数
 * * `schema_str` - 検証対象のJSON Schema文字列（YAML形式）
 *
 * # 戻り値
 * * バリデーション結果を含むJSON文字列
 *
 * # エラーケース
 * - YAMLパースエラー
 * - スキーマ構文エラー（無効なtypeフィールドなど）
 * - 論理エラー（存在しないプロパティをrequiredに指定など）
 */
export function compile_schema(schema_str: string): string;
/**
 * バージョン情報を取得する
 */
export function version(): string;
/**
 * Markdownからフロントマターを解析して検証結果を返す
 *
 * # 引数
 * * `md_str` - フロントマターを含むMarkdown文字列
 *
 * # 戻り値
 * * 検証結果を含むJSON文字列
 *   - 成功時: `{"success":true,"errors":[]}`
 *   - 失敗時: `{"success":false,"errors":[ErrorInfo, ...]}`
 *
 * # エラーケース
 * - フロントマターがない、または不完全な場合
 * - YAMLパースエラー
 * - フロントマター構文エラー（空のschema_pathなど）
 */
export function parse_and_validate_frontmatter(md_str: string): string;
/**
 * Markdownの見出し構造をYAML形式に変換する
 *
 * # 引数
 * * `md_str` - Markdown文字列
 *
 * # 戻り値
 * * 見出し構造に基づいたYAML文字列
 *   - H1 → title フィールド
 *   - H2 → sections 配列の要素
 *   - H3 → sections[].subsections 配列の要素
 */
export function md_headings_to_yaml(md_str: string): string;
/**
 * JSからのエラーメッセージをラップするためのコンバータ
 */
export function error_to_js_value(error: any): string;
