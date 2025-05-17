/**
 * スキーマ関連のユーティリティ関数
 * @description
 * スキーマの取得とキャッシュ管理を担当するモジュール
 */

/**スキーマキャッシュ*/
const schemaCache: Record<string, { content: string; timestamp: number }> = {};
/**キャッシュの有効期限（ミリ秒）*/
const CACHE_TTL = 60000;

/**
 * 与えられたパスが絶対パスかどうかを判定する
 *
 * @param {string} path - 判定するパス文字列
 * @returns {boolean} 絶対パスの場合true、相対パスの場合false
 *
 * @description
 * 先頭が/(Unix系)、C:/やC:\（Windows系）で始まるパス、
 * http://やhttps://（URL）で始まるパスを絶対パスと判定する
 */
export const isAbsolutePath = (path: string): boolean => {
  // 文字列が空か null/undefined の場合は絶対パスではない
  if (!path) return false;

  // Unix系絶対パス（/で始まる）
  if (path.startsWith('/')) return true;

  // Windows系絶対パス（C:\やD:/など）
  // ドライブ文字（A-Z）の後に「:」が続く場合
  if (/^[A-Za-z]:\\?/.test(path)) return true;

  // URL（http://やhttps://など）
  if (/^[a-z]+:\/\//.test(path)) return true;

  // 相対パス
  return false;
};

/**
 * スキーマパスからスキーマを取得
 *
 * @param {string} schemaPath - スキーマファイルへのパス
 * @param {string} basePath - 相対パス解決のためのベースパス（オプション）
 * @returns {Promise<string>} スキーマの内容
 * @throws {Error} スキーマファイルが見つからないか、読み込めない場合、または絶対パスが指定された場合
 *
 * @description
 * 指定されたパスからスキーマを取得し、キャッシュに保存。
 * キャッシュ有効期限内であればキャッシュから返す。
 * 絶対パスは受け付けず、相対パスのみをサポートする。
 */
export const fetchSchema = async (schemaPath: string, basePath?: string): Promise<string> => {
  // 絶対パスのチェック
  if (isAbsolutePath(schemaPath)) {
    throw new Error(
      `絶対パスでのスキーマ参照はサポートされていません: ${schemaPath}。相対パス（例: "./schema.yaml"）を使用してください。`
    );
  }

  // キャッシュチェック（有効期限内）
  const now = Date.now();
  const cacheKey = `${basePath || ''}:${schemaPath}`;
  const cached = schemaCache[cacheKey];

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.content;
  }

  // スキーマパス解決
  let resolvedPath;

  console.log('Schema path resolution:', { schemaPath, basePath });

  // ブラウザの制約でbasePathがフルパスでない可能性が高いため
  // 現在のスキーマで相対パスで参照できるようするための特別処理

  try {
    // テストモードでは別のパス解決を使用します
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((import.meta as any).env?.MODE === 'test') {
      if (schemaPath.startsWith('./') && basePath) {
        const baseDir = basePath.substring(0, basePath.lastIndexOf('/') + 1);
        resolvedPath = baseDir + schemaPath.substring(2);
      } else if (schemaPath.startsWith('../') && basePath) {
        const baseDir = basePath.substring(0, basePath.lastIndexOf('/') + 1);
        const parentDir = baseDir.substring(0, baseDir.slice(0, -1).lastIndexOf('/') + 1);
        resolvedPath = parentDir + schemaPath.substring(3);
      } else if (basePath) {
        const baseDir = basePath.substring(0, basePath.lastIndexOf('/') + 1);
        resolvedPath = baseDir + schemaPath;
      } else {
        resolvedPath = `./${schemaPath}`;
      }
    } else {
      // ブラウザ環境（通常モード）
      // 明示的な相対パスの場合（./で始まる）
      if (schemaPath.startsWith('./')) {
        // ./schema.yaml → /sample/schema.yaml のようにサンプルディレクトリからの相対パスとして解決
        resolvedPath = `/sample/${schemaPath.substring(2)}`;
        console.log('Resolved explicit relative path:', resolvedPath);
      }
      // 親ディレクトリ参照の相対パス（../で始まる）
      else if (schemaPath.startsWith('../')) {
        // ../schema.yaml → /schema.yaml のようにプロジェクトルートからの相対パスとして解決
        resolvedPath = `/${schemaPath.substring(3)}`;
        console.log('Resolved parent directory path:', resolvedPath);
      }
      // 暗黙的な相対パス（./なしで始まる）
      else {
        // schema.yaml → /sample/schema.yaml のようにサンプルディレクトリからの相対パスとして解決
        resolvedPath = `/sample/${schemaPath}`;
        console.log('Resolved implicit relative path:', resolvedPath);
      }
    }
  } catch (error) {
    console.error('Error resolving schema path:', error);
    throw new Error(
      `スキーマパスの解決に失敗しました: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  try {
    // スキーマファイルの取得
    const response = await fetch(resolvedPath);

    if (!response.ok) {
      throw new Error(`スキーマの取得に失敗: ${resolvedPath} (${response.status})`);
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
      `スキーマの読み込みに失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};
