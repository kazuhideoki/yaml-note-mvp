import { useState, useEffect } from "react";
import { ValidationError } from "./useYaml";
import { useYamlCore } from "./useYamlCore";
import useLogger from "./useLogger";

/**
 * Markdownのバリデーション機能を提供するHook
 *
 * @hook
 * @param {string} markdown - 検証対象のMarkdown文字列
 * @returns {{
 *   errors: ValidationError[],
 *   isValidating: boolean
 * }}
 *
 * @description
 * Markdownテキストを受け取り、WASMコアを使用してフロントマター検証を実行。
 * 30msのデバウンス処理を行い、エラー結果を返却する。
 */
export const useValidator = (markdown: string) => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const { wasmLoaded, validateFrontmatter } = useYamlCore();
  const { log } = useLogger();

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

        // フロントマター検証の実行
        const validationResult = await validateFrontmatter(markdown);

        // エラーリストを更新
        setErrors(validationResult);

        // パフォーマンスログ
        const validationTime = performance.now() - startTime;
        log("info", "validation_time", {
          component: "useValidator",
          timeMs: validationTime.toFixed(2),
          hasErrors: validationResult.length > 0,
        });
      } catch (error) {
        console.error("Validation error:", error);

        // エラーをUIに表示できる形式に変換
        setErrors([
          {
            line: 0,
            message: `検証エラー: ${error instanceof Error ? error.message : String(error)}`,
            path: "",
          },
        ]);

        // エラーログ
        log("error", "validation_error", {
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsValidating(false);
      }
    }, 30); // 30msのデバウンス

    // クリーンアップ
    return () => clearTimeout(timerId);
  }, [markdown, wasmLoaded, validateFrontmatter, log]);

  return { errors, isValidating };
};

export default useValidator;