import { useState, useEffect, useRef } from "react";
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
 *   isValidating: boolean,
 *   clearErrors: () => void
 * }}
 *
 * @description
 * Markdownテキストを受け取り、WASMコアを使用してフロントマター検証を実行。
 * 30msのデバウンス処理を行い、エラー結果を返却する。
 * エラーが解消された場合は確実に状態をクリアする。
 */
export const useValidator = (markdown: string) => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const { wasmLoaded, validateFrontmatter } = useYamlCore();
  const { log } = useLogger();
  const prevMarkdownRef = useRef<string>("");
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // エラーを手動でクリアする関数
  const clearErrors = () => {
    setErrors([]);
    log("info", "errors_manually_cleared", {
      previousErrorCount: errors.length,
    });
  };

  useEffect(() => {
    // 入力が空になった場合やWASMが読み込まれていない場合はエラーをクリア
    if (!wasmLoaded || !markdown) {
      setErrors([]);
      return;
    }

    // 検証中フラグを設定
    setIsValidating(true);

    // 前回のタイマーをクリア
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }

    // Markdownコンテンツの変更を検出
    const contentChanged = prevMarkdownRef.current !== markdown;
    prevMarkdownRef.current = markdown;

    // 30msのデバウンス処理
    validationTimerRef.current = setTimeout(async () => {
      try {
        // 検証開始時間を記録（パフォーマンス測定用）
        const startTime = performance.now();

        // フロントマター検証の実行
        const validationResult = await validateFrontmatter(markdown);

        // エラーリストを更新（必ず新しい配列を設定して確実に再レンダリングを発生させる）
        if (validationResult.length === 0 && errors.length > 0) {
          // エラーが解消された場合
          log("info", "validation_errors_resolved", {
            previousErrorCount: errors.length,
          });
        }
        
        setErrors(validationResult);

        // パフォーマンスログ
        const validationTime = performance.now() - startTime;
        log("info", "validation_time", {
          component: "useValidator",
          timeMs: validationTime.toFixed(2),
          hasErrors: validationResult.length > 0,
          contentChanged,
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
        validationTimerRef.current = null;
      }
    }, 30); // 30msのデバウンス

    // クリーンアップ
    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
        validationTimerRef.current = null;
      }
    };
  }, [markdown, wasmLoaded, validateFrontmatter, log, errors.length]);

  return { errors, isValidating, clearErrors };
};

export default useValidator;