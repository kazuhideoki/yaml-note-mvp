/**
 * @file SchemaEditor.tsx
 * @description YAMLスキーマを編集するためのエディタコンポーネント
 * File System Access APIを使ったファイル操作に対応
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { githubLight } from '@uiw/codemirror-theme-github';
import { useYamlCore } from '../hooks/useYamlCore';
import { ValidationError, ErrorCode } from '../hooks/validation-error.type';
import ErrorBadge from './ErrorBadge';
import useLogger from '../hooks/useLogger';

/**
 * SchemaEditor コンポーネントのプロパティ型
 */
interface SchemaEditorProps {
  /** スキーマファイルのパス */
  schemaPath: string;
  /** 初期スキーマ内容 */
  initialSchema: string;
  /** 保存時のコールバック */
  onSave: (content: string) => void;
  /** エディタがアクティブかどうか */
  active: boolean;
  /** 内容変更時のコールバック */
  onChange?: (content: string) => void;
  /** 表示用ファイル名（File System Access API用） */
  fileName?: string;
}

/**
 * スキーマエディタコンポーネント
 *
 * @component
 * @param {SchemaEditorProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element | null} スキーマエディタコンポーネント
 */
export const SchemaEditor: React.FC<SchemaEditorProps> = ({
  schemaPath,
  initialSchema,
  onSave,
  active,
  onChange,
  fileName = '',
}) => {
  const [content, setContent] = useState(initialSchema);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const { wasmLoaded, compileSchema } = useYamlCore();
  const [isDirty, setIsDirty] = useState(false);
  const { log } = useLogger();
  // CodeMirror インスタンスへの参照
  const editorRef = useRef<ReactCodeMirrorRef | null>(null);

  // 初期スキーマが変更されたとき、内容を更新（保存されたスキーマの場合のみ）
  useEffect(() => {
    // 初めてロードされたときだけ初期値をセット
    if (initialSchema && !isDirty) {
      setContent(initialSchema);
    }
  }, [initialSchema, isDirty]);

  // スキーマ検証ロジック
  useEffect(() => {
    if (!wasmLoaded || !active) return;

    const validateSchema = async () => {
      try {
        const validationErrors = await compileSchema(content);
        setErrors(validationErrors);

        // エラーログ記録
        if (validationErrors.length > 0) {
          log('warn', 'schema_validation_error', {
            errorCount: validationErrors.length,
            schemaPath,
          });
        }
      } catch (error) {
        console.error('Schema validation error:', error);
        setErrors([
          {
            line: 0,
            message: `スキーマコンパイルエラー: ${error instanceof Error ? error.message : String(error)}`,
            path: '',
            code: ErrorCode.SchemaCompile,
          },
        ]);

        log('error', 'schema_compile_error', {
          error: error instanceof Error ? error.message : String(error),
          schemaPath,
        });
      }
    };

    // デバウンス時間を0msに設定して即時実行
    const timerId = setTimeout(() => {
      validateSchema();
    }, 0);

    return () => clearTimeout(timerId);
  }, [content, wasmLoaded, compileSchema, active, schemaPath, log]);

  // 保存処理
  const handleSave = useCallback(() => {
    onSave(content);
    setIsDirty(false);
    log('info', 'schema_saved', {
      schemaPath,
      hasErrors: errors.length > 0,
      fileName: fileName || 'schema.yaml',
    });
  }, [content, onSave, errors.length, schemaPath, fileName, log]);

  // ショートカットキー処理
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, handleSave]);

  // エディタ変更ハンドラ
  const handleChange = useCallback(
    (value: string) => {
      setContent(value);
      setIsDirty(true);
      if (onChange) {
        onChange(value);
      }
    },
    [onChange]
  );

  // エラー行クリック時にエディタの該当行にジャンプ
  const handleErrorClick = useCallback((line: number) => {
    if (editorRef.current?.view && line > 0) {
      try {
        // CodeMirrorのAPIを使って指定行にジャンプ
        const lineInfo = editorRef.current.view.state.doc.line(line);
        editorRef.current.view.dispatch({
          selection: { anchor: lineInfo.from },
          scrollIntoView: true,
        });
      } catch (error) {
        console.error('Failed to navigate to line:', error);
      }
    }
  }, []);

  // ドラッグオーバーハンドラー
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // ドロップハンドラー
  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      // File System Access API のファイルハンドルを試みる
      if (
        'getAsFileSystemHandle' in event.dataTransfer.items[0] &&
        typeof event.dataTransfer.items[0].getAsFileSystemHandle === 'function'
      ) {
        try {
          const handle = (await (
            event.dataTransfer.items[0].getAsFileSystemHandle as () => Promise<FileSystemHandle>
          )()) as FileSystemFileHandle;

          if (handle && handle.kind === 'file') {
            const file = await handle.getFile();

            if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
              const fileContent = await file.text();
              setContent(fileContent);
              setIsDirty(true);
              if (onChange) {
                onChange(fileContent);
              }

              // getAsFileSystemHandleを使用した場合のログ
              log('info', 'schema_file_loaded_with_handle', {
                fileName: file.name,
                fileSize: file.size,
                handleAvailable: true,
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
      if (file && (file.name.endsWith('.yaml') || file.name.endsWith('.yml'))) {
        const reader = new FileReader();
        reader.onload = e => {
          const fileContent = e.target?.result as string;
          setContent(fileContent);
          setIsDirty(true);
          if (onChange) {
            onChange(fileContent);
          }

          // ファイル読み込みログ
          log('info', 'schema_file_loaded', {
            fileName: file.name,
            fileSize: file.size,
            handleAvailable: false,
          });
        };
        reader.readAsText(file);
      } else if (file) {
        // 非対応ファイル形式のログ
        log('warn', 'unsupported_schema_file', {
          fileName: file?.name,
          fileType: file?.type,
        });
      }
    },
    [log, onChange]
  );

  if (!active) return null;

  return (
    <div className="w-full h-full flex flex-col" onDragOver={handleDragOver} onDrop={handleDrop}>
      <div className="flex justify-between items-center p-2 bg-gray-100">
        <span className="text-sm text-gray-700">{fileName ? fileName : schemaPath}</span>
        <button
          className={`px-3 py-1 rounded text-sm ${
            isDirty ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'
          }`}
          onClick={handleSave}
          disabled={!isDirty}
        >
          保存 {isDirty && '*'}
        </button>
      </div>

      <div className="flex-grow relative">
        <CodeMirror
          value={content}
          height="100%"
          theme={githubLight}
          extensions={[yaml()]}
          onChange={handleChange}
          className="text-base"
          ref={editorRef}
        />
      </div>

      {errors.length > 0 && <ErrorBadge errors={errors} type="schema" onClick={handleErrorClick} />}
    </div>
  );
};

export default SchemaEditor;
