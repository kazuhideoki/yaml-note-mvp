/**
 * YAML Note UXログ機能のためのユーティリティ関数
 */

/**
 * コンテンツのサマリーを生成する
 * プライバシーを保護するため、内容そのものは含めず、長さや構造情報のみを返す
 */
export const summarizeContent = (content: string): string => {
  // プライバシーを保護するためコンテンツのサマリーのみを作成
  const byteLength = new Blob([content]).size;
  
  // 行数とバイト数を含む概要情報のみ返す
  const lineCount = content.split('\n').length;
  
  return JSON.stringify({
    byteLength,
    lineCount,
    hasTitle: content.includes('title:'),
    hasContent: content.includes('content:'),
    hasTags: content.includes('tags:'),
    hasFrontmatter: content.includes('---'),
  });
};

/**
 * エラーオブジェクトを安全にシリアライズ化する
 */
export const formatError = (error: any): Record<string, any> => {
  if (!error) return { message: 'Unknown error' };
  
  return {
    message: error.message || 'No message',
    name: error.name || 'Error',
    // スタックトレースはオプション（開発時のみなど）
    ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {})
  };
};

/**
 * パフォーマンス計測ヘルパー
 * @param actionName アクション名
 * @returns 計測終了関数（呼び出すと計測結果を返す）
 */
export const createPerformanceMarker = (actionName: string) => {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    return {
      action: actionName,
      duration: endTime - startTime,
      start: startTime,
      end: endTime
    };
  };
};

/**
 * 高頻度イベントのスロットル処理
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall >= limit) {
      lastCall = now;
      func(...args);
    }
  };
};