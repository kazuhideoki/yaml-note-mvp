/**
 * スキーマエディタコンポーネント
 * @component
 * @description
 * YAMLスキーマを編集するためのCodeMirrorベースのエディタ。
 * スキーマの構文検証と保存機能を提供する。
 */
import React, { useEffect, useState, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { githubLight } from '@uiw/codemirror-theme-github';
import { useYamlCore } from '../hooks/useYamlCore';
import { ValidationError } from '../hooks/validation-error.type';
import ErrorBadge from './ErrorBadge';
import useLogger from '../hooks/useLogger';

interface SchemaEditorProps {
  schemaPath: string;
  initialSchema: string;
  onSave: (content: string) => void;
  active: boolean;
  onChange?: (content: string) => void;
}

/**
 * スキーマエディタコンポーネント
 * 
 * @component
 * @param {SchemaEditorProps} props - コンポーネントのプロパティ
 * @param {string} props.schemaPath - スキーマファイルのパス
 * @param {string} props.initialSchema - 初期スキーマ内容
 * @param {(content: string) => void} props.onSave - 保存時のコールバック関数
 * @param {boolean} props.active - アクティブかどうか
 * @returns {JSX.Element | null} スキーマエディタコンポーネント
 */
export const SchemaEditor: React.FC<SchemaEditorProps> = ({
  schemaPath,
  initialSchema,
  onSave,
  active,
  onChange,
}) => {
  const [content, setContent] = useState(initialSchema);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const { wasmLoaded, compileSchema } = useYamlCore();
  const [isDirty, setIsDirty] = useState(false);
  const { log } = useLogger();

  // 初期スキーマが変更されたとき、内容を更新（保存されたスキーマの場合のみ）
  useEffect(() => {
    // 初めてロードされたときだけ初期値をセット
    if (initialSchema && content === '' && !isDirty) {
      setContent(initialSchema);
    }
  }, [initialSchema, content, isDirty]);

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
    });
  }, [content, onSave, errors.length, schemaPath, log]);

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
  const handleChange = useCallback((value: string) => {
    setContent(value);
    setIsDirty(true);
    if (onChange) {
      onChange(value);
    }
  }, [onChange]);

  // エラー行クリック時にエディタの該当行にジャンプ
  const handleErrorClick = useCallback((line: number) => {
    // ここでエディタの該当行にフォーカスする処理を実装
    // CodeMirrorの実装による
  }, []);

  if (!active) return null;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center p-2 bg-gray-100">
        <span className="text-sm text-gray-700">{schemaPath}</span>
        <button
          className={`px-3 py-1 rounded text-sm ${
            isDirty
              ? "bg-blue-500 text-white"
              : "bg-gray-300 text-gray-700"
          }`}
          onClick={handleSave}
          disabled={!isDirty}
        >
          保存 {isDirty && "*"}
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
        />
      </div>

      {errors.length > 0 && (
        <ErrorBadge
          errors={errors}
          type="schema"
          onClick={handleErrorClick}
        />
      )}
    </div>
  );
};

export default SchemaEditor;