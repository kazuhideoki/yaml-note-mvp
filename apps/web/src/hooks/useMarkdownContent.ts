import { useState, useEffect } from 'react';
import * as yaml from 'js-yaml';

/**
 * YAML文字列からcontentフィールドを抽出し、Markdownとして利用するカスタムフック
 *
 * @param {string} yamlString - YAML形式のノートデータ
 * @returns {{
 *   markdownContent: string;
 *   error: string | null;
 * }}
 *
 * @description
 * YAMLをパースし、contentフィールドをMarkdownとして抽出。パース失敗やcontent未検出時はエラーを返す。
 */
export function useMarkdownContent(yamlString: string) {
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // YAMLをパース
      const parsed = yaml.load(yamlString) as any;
      
      // contentフィールドを抽出
      if (parsed && typeof parsed === 'object' && 'content' in parsed) {
        setMarkdownContent(String(parsed.content));
        setError(null);
      } else {
        setMarkdownContent('');
        setError('YAMLにcontentフィールドが見つかりません');
      }
    } catch (err) {
      console.error('YAMLパースエラー:', err);
      setMarkdownContent('');
      setError(`YAMLのパースに失敗しました: ${err}`);
    }
  }, [yamlString]);

  return { markdownContent, error };
}

export default useMarkdownContent;