import { useState, useEffect } from 'react';
import * as yaml from 'js-yaml';

/**
 * useMarkdownContentの返却型
 * @interface
 * @property {string} markdownContent - 抽出されたMarkdown文字列
 * @property {string | null} error - エラー内容（なければnull）
 * @description
 * YAMLからcontentフィールドを抽出し、Markdownとして返すフックの返却型。
 */
export interface UseMarkdownContentResult {
  markdownContent: string;
  error: string | null;
}

/**
 * YAML文字列からcontentフィールドを抽出し、Markdownとして利用するカスタムフック
 *
 * @param {string} yamlString - YAML形式のノートデータ
 * @returns {UseMarkdownContentResult}
 * @description
 * YAMLをパースし、contentフィールドをMarkdownとして抽出。パース失敗やcontent未検出時はエラーを返す。
 */
export function useMarkdownContent(yamlString: string): UseMarkdownContentResult {
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