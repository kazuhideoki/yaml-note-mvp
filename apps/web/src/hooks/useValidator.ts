import { useState, useEffect, useCallback } from 'react';
import { ValidationError } from './validation-error.type';
import { useYamlCore } from './useYamlCore';
import { fetchSchema } from '../utils/schema';
import useLogger from './useLogger';

// フロントマター抽出ユーティリティ
const extractFrontmatter = (markdown: string) => {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatterLines = match[1].split('\n');
  const frontmatter: Record<string, any> = {};

  frontmatterLines.forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      const value =
        line.slice(colonIndex + 1).trim() === 'true'
          ? true
          : line.slice(colonIndex + 1).trim() === 'false'
            ? false
            : line.slice(colonIndex + 1).trim();

      frontmatter[key] = value;
    }
  });

  return frontmatter;
};

/**
 * Markdownのバリデーション機能を提供するHook
 *
 * @hook
 * @param {string} markdown - 検証対象のMarkdown文字列
 * @returns {{
 *   errors: ValidationError[],
 *   isValidating: boolean,
 *   schemaPath: string | null,
 *   validated: boolean,
 *   toggleValidation: (newState?: boolean) => string | null,
 *   clearErrors: () => void
 * }}
 *
 * @description
 * Markdownテキストを受け取り、フロントマター検証とスキーマ検証を実行する。
 * 30msのデバウンス処理を行い、エラー結果を返却する。
 * toggleValidation関数により検証の有効/無効を切り替えることができる。
 */
export const useValidator = (markdown: string) => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [schemaPath, setSchemaPath] = useState<string | null>(null);
  const [validated, setValidated] = useState<boolean>(true);

  const { wasmLoaded, validateFrontmatter, markdownToYaml, validateYamlWithSchema } = useYamlCore();

  const { log } = useLogger();

  // 検証トグル関数
  const toggleValidation = useCallback(
    (newState?: boolean) => {
      if (!markdown) return null;

      try {
        // フロントマターを解析
        const frontmatter = extractFrontmatter(markdown);
        if (!frontmatter) return null;

        // validated フィールドの現在値を取得
        const currentValidated = frontmatter.validated !== false;

        // 新しい状態を決定（引数があればその値、なければトグル）
        const nextValidated = newState !== undefined ? newState : !currentValidated;

        // フロントマター内の validated 値を更新
        const updatedFrontmatter = { ...frontmatter, validated: nextValidated };

        // マークダウン文字列のフロントマター部分を置換
        const frontmatterBlock = Object.entries(updatedFrontmatter)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');

        const updatedMarkdown = markdown.replace(
          /^---\n[\s\S]*?\n---/,
          `---\n${frontmatterBlock}\n---`
        );

        // 内部状態を更新
        setValidated(nextValidated);

        // ログ記録
        log('info', 'validation_state_changed', {
          previous: currentValidated,
          current: nextValidated,
        });

        return updatedMarkdown;
      } catch (error) {
        console.error('Failed to toggle validation state:', error);
        log('error', 'validation_toggle_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    },
    [markdown, log]
  );

  // エラーを手動でクリアする関数
  const clearErrors = useCallback(() => {
    setErrors([]);
    log('info', 'errors_manually_cleared', {
      previousErrorCount: errors.length,
    });
  }, [errors.length, log]);

  // フロントマターとMarkdownの検証処理
  useEffect(() => {
    if (!wasmLoaded || !markdown) {
      setErrors([]);
      return;
    }

    // 検証中フラグを設定
    setIsValidating(true);

    // 30msのデバウンス処理
    const timerId = setTimeout(async () => {
      try {
        // 検証開始時間を記録（パフォーマンス測定用）
        const startTime = performance.now();
        let allErrors: ValidationError[] = [];

        // ステップ1: フロントマター検証
        const frontmatterErrors = await validateFrontmatter(markdown);
        allErrors = [...frontmatterErrors];

        // フロントマターが正常な場合のみスキーマ検証を行う
        if (frontmatterErrors.length === 0) {
          // フロントマターから schema_path と validated を抽出
          const frontmatter = extractFrontmatter(markdown);
          const currentSchemaPath = frontmatter?.schema_path || null;
          const isValidated = frontmatter?.validated !== false; // デフォルトはtrue

          setSchemaPath(currentSchemaPath);
          setValidated(isValidated);

          // schema_path が設定されており、validated が true の場合のみスキーマ検証を実行
          if (currentSchemaPath && isValidated) {
            try {
              // ステップ2: スキーマを取得
              const schema = await fetchSchema(currentSchemaPath, undefined);

              // ステップ3: Markdown → YAML変換
              const yaml = await markdownToYaml(markdown);
              console.log('🔵 yaml', yaml);

              // ステップ4: YAML × Schema 検証
              const schemaErrors = await validateYamlWithSchema(yaml, schema);

              // スキーマ検証エラーを追加
              allErrors = [...allErrors, ...schemaErrors];
            } catch (schemaError) {
              const errorMessage =
                schemaError instanceof Error ? schemaError.message : String(schemaError);

              // 絶対パスエラーの場合は特別なエラーメッセージを表示
              const isAbsolutePathError = errorMessage.includes(
                '絶対パスでのスキーマ参照はサポートされていません'
              );

              allErrors.push({
                line: 2, // フロントマターの行（schema_pathの行を指すよう推定）
                message: isAbsolutePathError
                  ? `スキーマパスエラー: ${errorMessage}`
                  : `スキーマ検証エラー: ${errorMessage}`,
                path: isAbsolutePathError ? 'schema_path' : '',
              });

              log('error', isAbsolutePathError ? 'schema_path_error' : 'schema_validation_error', {
                error: errorMessage,
                schemaPath: currentSchemaPath,
              });
            }
          }
        }

        // エラーリストを更新
        setErrors(allErrors);

        // パフォーマンスログ
        const validationTime = performance.now() - startTime;
        log('info', 'validation_time', {
          component: 'useValidator',
          timeMs: validationTime.toFixed(2),
          hasErrors: allErrors.length > 0,
          phase: 'S3',
        });
      } catch (error) {
        console.error('Validation error:', error);

        // エラーをUIに表示できる形式に変換
        setErrors([
          {
            line: 0,
            message: `検証エラー: ${error instanceof Error ? error.message : String(error)}`,
            path: '',
          },
        ]);

        // エラーログ
        log('error', 'validation_error', {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsValidating(false);
      }
    }, 30); // 30msのデバウンス

    // クリーンアップ
    return () => clearTimeout(timerId);
  }, [markdown, wasmLoaded, validateFrontmatter, markdownToYaml, validateYamlWithSchema, log]);

  return { errors, isValidating, schemaPath, validated, toggleValidation, clearErrors };
};

export default useValidator;
