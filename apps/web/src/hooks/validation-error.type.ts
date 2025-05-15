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
}
