import React, { useState, useCallback, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { githubLight } from '@uiw/codemirror-theme-github';
import useValidator from '../hooks/useValidator';
import ErrorBadge from './ErrorBadge';
import useLogger from '../hooks/useLogger';

/**
 * Markdownエディタコンポーネント
 *
 * @component
 * @returns {JSX.Element}
 *
 * @description
 * CodeMirrorベースのMarkdownエディタを提供し、ファイルのドラッグ＆ドロップ、
 * フロントマター検証機能を備える。
 */
export const MarkdownEditor: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const editorRef = useRef<any>(null);
  const { errors, isValidating } = useValidator(content);
  const { log } = useLogger();

  // CodeMirrorの内容変更ハンドラー
  const handleChange = useCallback((value: string) => {
    setContent(value);
  }, []);

  // エラーバッジクリック時の処理
  const handleErrorClick = useCallback((line: number) => {
    if (editorRef.current && line > 0) {
      // CodeMirrorのAPIを使って指定行にジャンプ
      const lineInfo = editorRef.current.view.state.doc.line(line);
      editorRef.current.view.dispatch({
        selection: { anchor: lineInfo.from },
        scrollIntoView: true
      });
    }
  }, []);

  // ドラッグオーバーハンドラー
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // ドロップハンドラー
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const file = event.dataTransfer.files[0];
    if (file && file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setContent(content);
        setFileName(file.name);

        // ファイル読み込みログ
        log('info', 'file_loaded', {
          fileName: file.name,
          fileSize: file.size,
          type: 'markdown'
        });
      };
      reader.readAsText(file);
    } else {
      // 非対応ファイル形式のログ
      log('warn', 'unsupported_file', {
        fileName: file?.name,
        fileType: file?.type
      });
    }
  }, [log]);

  return (
    <div
      className="h-full w-full relative"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
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
          <ErrorBadge
            errors={errors}
            onClick={handleErrorClick}
          />
          {isValidating && (
            <div className="absolute bottom-4 left-4 bg-gray-800 text-white px-2 py-1 rounded-md text-xs opacity-70">
              検証中...
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-md">
          <div className="text-center">
            <p className="text-gray-500">
              Markdownファイル (.md) をドラッグ＆ドロップしてください
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownEditor;