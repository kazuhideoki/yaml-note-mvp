/**
 * @file MarkdownEditor.tsx
 * @description マークダウンエディタコンポーネント
 * File System Access APIを使ったファイル操作に対応
 */
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
  onChange?: (content: string) => void;
  onSave: (content: string) => void;
  validationErrors?: ValidationError[];
  fileName?: string;
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
 * @param {string} [props.fileName] - 現在開いているファイル名
 * @returns {JSX.Element}
 *
 * @description
 * CodeMirrorベースのMarkdownエディタを提供し、ファイルのドラッグ＆ドロップ、
 * フロントマター検証機能を備える。エラー状態の適切な管理とリセットを行う。
 * File System Access APIを使ったファイル操作に対応。
 */
export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  initialContent = '',
  onChange,
  onSave,
  validationErrors = [],
  fileName = ''
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
    if (onChange) {
      onChange(value);
    }
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
      contentLength: content.length,
      fileName
    });
  }, [content, onSave, log, fileName]);

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
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      // File System Access API のファイルハンドルを試みる
      if ('getAsFileSystemHandle' in event.dataTransfer.items[0] && 
          typeof event.dataTransfer.items[0].getAsFileSystemHandle === 'function') {
        try {
          const handle = await (event.dataTransfer.items[0].getAsFileSystemHandle as () => Promise<FileSystemHandle>)() as FileSystemFileHandle;
          
          if (handle && handle.kind === 'file') {
            const file = await handle.getFile();
            
            if (file.name.endsWith('.md')) {
              // ファイルをロードする前にエラーをクリア
              clearErrors();
              
              const content = await file.text();
              setContent(content);
              if (onChange) {
                onChange(content);
              }
              
              // getAsFileSystemHandleを使用した場合のログ
              log('info', 'file_loaded_with_handle', {
                fileName: file.name,
                fileSize: file.size,
                type: 'markdown',
                handleAvailable: true
              });
              
              return; // 成功したのでここで終了
            }
          }
        } catch (error) {
          console.error('Failed to get file handle:', error);
          // 従来のテキスト読み込みにフォールバック（下記で処理）
        }
      }
      
      // 従来のファイル読み込み方法
      const file = event.dataTransfer.files[0];
      if (file && file.name.endsWith('.md')) {
        const reader = new FileReader();
        reader.onload = e => {
          // ファイルをロードする前にエラーをクリア
          clearErrors();

          const content = e.target?.result as string;
          setContent(content);
          if (onChange) {
            onChange(content);
          }

          // ファイル読み込みログ
          log('info', 'file_loaded', {
            fileName: file.name,
            fileSize: file.size,
            type: 'markdown',
            handleAvailable: false
          });
        };
        reader.readAsText(file);
      } else if (file) {
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
          <div className="flex justify-between items-center p-2 bg-gray-100">
            <span className="text-sm text-gray-700">{fileName || 'Untitled.md'}</span>
          </div>
          <CodeMirror
            value={content}
            height="calc(100% - 40px)"
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
        </>
      ) : (
        <div className="flex items-center justify-center h-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-md">
          <div className="text-center">
            <p className="text-gray-500">Markdownファイル (.md) をドラッグ＆ドロップしてください</p>
            <p className="text-gray-400 text-sm mt-2">または「開く」ボタンをクリックしてファイルを選択</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarkdownEditor;
