/**
 * スキーマ関連のユーティリティ関数
 * @description
 * スキーマの取得とキャッシュ管理を担当するモジュール
 */

// スキーマキャッシュ
const schemaCache: Record<string, { content: string; timestamp: number }> = {};
const CACHE_TTL = 60000; // キャッシュの有効期限（ミリ秒）

/**
 * スキーマパスからスキーマを取得
 *
 * @param {string} schemaPath - スキーマファイルへのパス
 * @param {string} basePath - 相対パス解決のためのベースパス（オプション）
 * @returns {Promise<string>} スキーマの内容
 * @throws {Error} スキーマファイルが見つからないか、読み込めない場合
 *
 * @description
 * 指定されたパスからスキーマを取得し、キャッシュに保存。
 * キャッシュ有効期限内であればキャッシュから返す。
 */
export const fetchSchema = async (
  schemaPath: string,
  basePath?: string,
): Promise<string> => {
  // キャッシュチェック（有効期限内）
  const now = Date.now();
  const cacheKey = `${basePath || ""}:${schemaPath}`;
  const cached = schemaCache[cacheKey];

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.content;
  }

  // スキーマパス解決
  let resolvedPath = schemaPath;

  // 相対パスの場合、basePathと結合
  if (schemaPath.startsWith("./") && basePath) {
    // basePathからディレクトリ部分のみを抽出
    const baseDir = basePath.substring(0, basePath.lastIndexOf("/") + 1);
    resolvedPath = baseDir + schemaPath.substring(2);
  }
  // 相対パスだがbasePathがない場合は/schemas/基準で解決
  else if (schemaPath.startsWith("./")) {
    resolvedPath = "/schemas/" + schemaPath.substring(2);
  }
  // 絶対パスの場合（先頭が/で始まる場合）
  else if (schemaPath.startsWith("/")) {
    resolvedPath = schemaPath;
  }
  // デフォルトのスキーマパス（プロジェクトルート相対）
  else {
    resolvedPath = `/schemas/${schemaPath}`;
  }

  try {
    // スキーマファイルの取得
    const response = await fetch(resolvedPath);

    if (!response.ok) {
      throw new Error(
        `スキーマの取得に失敗: ${resolvedPath} (${response.status})`,
      );
    }

    const schemaContent = await response.text();

    // キャッシュに保存
    schemaCache[cacheKey] = {
      content: schemaContent,
      timestamp: now,
    };

    return schemaContent;
  } catch (error) {
    console.error(`スキーマ読み込みエラー: ${resolvedPath}`, error);
    throw new Error(
      `スキーマの読み込みに失敗: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

/**
 * キャッシュからスキーマを削除
 *
 * @param {string} schemaPath - 削除するスキーマのパス
 * @param {string} basePath - 相対パス解決のためのベースパス（オプション）
 */
export const invalidateSchemaCache = (
  schemaPath: string,
  basePath?: string,
): void => {
  const cacheKey = `${basePath || ""}:${schemaPath}`;
  delete schemaCache[cacheKey];
};

/**
 * キャッシュ全体をクリア
 */
export const clearSchemaCache = (): void => {
  Object.keys(schemaCache).forEach((key) => delete schemaCache[key]);
};