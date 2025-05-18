/**
 * フロントマター情報を表す型
 *
 * @property {string | undefined} schema_path - 参照するスキーマのパス
 * @property {boolean | undefined} validated - スキーマ検証を行うかどうか
 *
 * @description
 * Markdown ファイル冒頭に記述されるフロントマターから取得できる
 * 情報を表現するインターフェース。
 */
export interface Frontmatter {
  schema_path?: string;
  validated?: boolean;
  [key: string]: string | boolean | undefined;
}
