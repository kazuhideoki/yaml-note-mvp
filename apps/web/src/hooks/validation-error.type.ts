/**
 * バリデーションエラー情報
 *
 * @property {number} line - エラー発生行番号（0の場合は特定不可）
 * @property {string} message - エラーメッセージ
 * @property {string} path - エラー発生箇所のパス（YAML/JSON Pointer等）
 */
export interface ValidationError {
  line: number;
  message: string;
  path: string;
  code: ErrorCode;
}

/** バリデーションエラー種別 */
export enum ErrorCode {
  YamlParse = 'YamlParse',
  SchemaCompile = 'SchemaCompile',
  FrontmatterParse = 'FrontmatterParse',
  FrontmatterValidation = 'FrontmatterValidation',
  SchemaValidation = 'SchemaValidation',
  Unknown = 'Unknown',
}
