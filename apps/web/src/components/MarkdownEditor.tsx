import React, { useState, useCallback, useRef, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { githubLight } from '@uiw/codemirror-theme-github';
import useValidator from '../hooks/useValidator';
import ErrorBadge from './ErrorBadge';
import useLogger from '../hooks/useLogger';
import { ValidationError } from '../hooks/validation-error.type';

interface MarkdownEditorProps {
  initialContent: string;
  onChange: (content: string) => void;
  onSave: (content: string) => void;
  validationErrors?: ValidationError[];
}

/**
 * Markdownエディタコンポーネント
 *
 * @component
 * @param {MarkdownEditorProps} props - コンポーネントのプロパティ
 * @param {string} props.initialContent - 初期コンテンツ
 * @param {function} props.onChange - 内容変更時のコールバック
 * @param {function} props.onSave - 保存時のコールバック
 * @param {ValidationError[]} [props.validationErrors] - バリデーションエラー一覧
 * @returns {JSX.Element}
 *
 * @description
 * CodeMirrorベースのMarkdownエディタを提供し、ファイルのドラッグ＆ドロップ、
 * フロントマター検証機能を備える。エラー状態の適切な管理とリセットを行う。
 */
export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  initialContent = '',
  onChange,
  onSave,
  validationErrors = []
}) => {
  const [content, setContent] = useState<string>(initialContent);
  const editorRef = useRef<any>(null);
  const { isValidating, clearErrors } = useValidator(content);
  const { log } = useLogger();
  const prevContentRef = useRef<string>('');

  // エディタ内容が変更された場合、前回の内容と比較して大きな変更があった場合にエラーを手動クリア
  useEffect(() => {
    if (prevContentRef.current && content) {
      // ファイル内容が完全に変わった場合（別ファイルのロードなど）
      const contentLengthDiff = Math.abs(content.length - prevContentRef.current.length);
      if (contentLengthDiff > 100) {
        // 大きな変更があった場合
        clearErrors(); // エラー状態を明示的にリセット
        log('info', 'validation_reset_on_major_change', {
          contentLengthDiff,
        });
      }
    }
    prevContentRef.current = content;
  }, [content, clearErrors, log]);

  // 初期コンテンツが変更された場合に更新
  useEffect(() => {
    if (initialContent !== content) {
      setContent(initialContent);
    }
  }, [initialContent]);

  // CodeMirrorの内容変更ハンドラー
  const handleChange = useCallback((value: string) => {
    setContent(value);
    onChange(value);
  }, [onChange]);

  // エラーバッジクリック時の処理
  const handleErrorClick = useCallback((line: number) => {
    if (editorRef.current && line > 0) {
      // CodeMirrorのAPIを使って指定行にジャンプ
      const lineInfo = editorRef.current.view.state.doc.line(line);
      editorRef.current.view.dispatch({
        selection: { anchor: lineInfo.from },
        scrollIntoView: true,
      });
    }
  }, []);

  // ドラッグオーバーハンドラー
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // 保存ハンドラー
  const handleSave = useCallback(() => {
    onSave(content);
    log('info', 'markdown_saved', {
      contentLength: content.length
    });
  }, [content, onSave, log]);

  // ショートカットキー処理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // ドロップハンドラー
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const file = event.dataTransfer.files[0];
      if (file && file.name.endsWith('.md')) {
        const reader = new FileReader();
        reader.onload = e => {
          // ファイルをロードする前にエラーをクリア
          clearErrors();

          const content = e.target?.result as string;
          setContent(content);
          onChange(content);

          // ファイル読み込みログ
          log('info', 'file_loaded', {
            fileName: file.name,
            fileSize: file.size,
            type: 'markdown',
          });
        };
        reader.readAsText(file);
      } else {
        // 非対応ファイル形式のログ
        log('warn', 'unsupported_file', {
          fileName: file?.name,
          fileType: file?.type,
        });
      }
    },
    [log, clearErrors, onChange]
  );

  return (
    <div className="h-full w-full relative" onDragOver={handleDragOver} onDrop={handleDrop}>
      {content ? (
        <>
          <CodeMirror
            value={content}
            height="100%"
            theme={githubLight}
            extensions={[markdown()]}
            onChange={handleChange}
            ref={editorRef}
            className="text-base"
          />
          <ErrorBadge errors={validationErrors} onClick={handleErrorClick} />
          {isValidating && (
            <div className="absolute bottom-4 left-4 bg-gray-800 text-white px-2 py-1 rounded-md text-xs opacity-70">
              検証中...
            </div>
          )}
          <div className="absolute top-4 right-4">
            <button
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
              onClick={handleSave}
            >
              保存
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-md">
          <div className="text-center">
            <p className="text-gray-500">Markdownファイル (.md) をドラッグ＆ドロップしてください</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownEditor;
