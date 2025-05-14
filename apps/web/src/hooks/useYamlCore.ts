import { useState, useEffect, useCallback } from "react";
import { debounce } from "lodash-es";
import { ValidationError } from "./useYaml";

/**
 * WASMコアモジュールの型定義
 */
interface CoreWasmType {
  validate_yaml: (yaml: string, schema: string) => string;
  parse_yaml: (yaml: string) => string;
  stringify_yaml: (json: string) => string;
  md_to_yaml: (md: string) => string;
  yaml_to_md: (yaml: string) => string;
  parse_and_validate_frontmatter: (md: string) => string;
  version: () => string;
}

// 実際の使用時にはランタイムでモジュールをロード
let CoreWasm: CoreWasmType;

/**
 * 変換結果の型定義
 * @property {boolean} success - 成功フラグ
 * @property {string} content - 変換後の内容
 * @property {string} [error] - エラーメッセージ（失敗時のみ）
 */
export interface ConversionResult {
  success: boolean;
  content: string;
  error?: string;
}

/**
 * YAML/Markdownの相互変換機能とバリデーションを提供するカスタムフック
 *
 * @description
 * WASMコアモジュールを利用して、Markdown<->YAML間の変換機能およびフロントマターの
 * バリデーション機能を提供します。初期化状態の管理や処理のデバウンスを内部で行います。
 *
 * @returns {{
 *   wasmLoaded: boolean;
 *   wasmLoading: boolean;
 *   error: Error | null;
 *   mdToYaml: (md: string) => Promise<ConversionResult>;
 *   yamlToMd: (yaml: string) => Promise<ConversionResult>;
 *   validateFrontmatter: (md: string) => Promise<ValidationError[]>;
 * }}
 */
export function useYamlCore() {
  // WASM初期化状態
  const [wasmLoaded, setWasmLoaded] = useState(false);
  const [wasmLoading, setWasmLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [instance, setInstance] = useState<CoreWasmType | null>(null);

  // WASM初期化
  useEffect(() => {
    const loadWasm = async () => {
      if (wasmLoaded || wasmLoading) return;
      
      setWasmLoading(true);
      try {
        // 動的インポート
        const wasmModule = await import("core-wasm");
        const coreWasm = wasmModule as unknown as CoreWasmType;
        setInstance(coreWasm);

        // WASMのバージョン確認
        const version = coreWasm.version();
        console.log(`Core WASM loaded, version: ${version}`);
        setWasmLoaded(true);
        setError(null);
      } catch (err) {
        console.error("Failed to initialize WASM module:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setWasmLoaded(false);
      } finally {
        setWasmLoading(false);
      }
    };

    loadWasm();
  }, [wasmLoaded, wasmLoading]);

  // Markdown -> YAML 変換関数
  const mdToYaml = useCallback(
    debounce(async (md: string): Promise<ConversionResult> => {
      if (!wasmLoaded || !instance) {
        return {
          success: false,
          content: "",
          error: "WASM not initialized",
        };
      }

      if (!md.trim()) {
        return { success: true, content: "" };
      }

      try {
        const result = instance.md_to_yaml(md);

        // エラーチェック（JSONで返ってくる場合はエラー）
        if (result.includes('"success":false')) {
          const errorObj = JSON.parse(result);
          return {
            success: false,
            content: "",
            error: errorObj.errors?.[0]?.message || "Unknown error",
          };
        }

        return { success: true, content: result };
      } catch (error) {
        console.error("MD to YAML conversion error:", error);
        return {
          success: false,
          content: "",
          error: `変換エラー: ${error}`,
        };
      }
    }, 30), // 30msのデバウンス
    [wasmLoaded, instance],
  );

  // YAML -> Markdown 変換関数
  const yamlToMd = useCallback(
    debounce(async (yaml: string): Promise<ConversionResult> => {
      if (!wasmLoaded || !instance) {
        return {
          success: false,
          content: "",
          error: "WASM not initialized",
        };
      }

      if (!yaml.trim()) {
        return { success: true, content: "" };
      }

      try {
        const result = instance.yaml_to_md(yaml);

        // エラーチェック
        if (result.includes('"success":false')) {
          const errorObj = JSON.parse(result);
          return {
            success: false,
            content: "",
            error: errorObj.errors?.[0]?.message || "Unknown error",
          };
        }

        return { success: true, content: result };
      } catch (error) {
        console.error("YAML to MD conversion error:", error);
        return {
          success: false,
          content: "",
          error: `変換エラー: ${error}`,
        };
      }
    }, 30), // 30msのデバウンス
    [wasmLoaded, instance],
  );

  /**
   * Markdownのフロントマターを検証し、エラーがあれば返す
   *
   * @param {string} markdown - 検証対象のMarkdown文字列
   * @returns {Promise<ValidationError[]>} - 検証エラーの配列（エラーなしなら空配列）
   */
  const validateFrontmatter = useCallback(
    async (markdown: string): Promise<ValidationError[]> => {
      if (!instance || !wasmLoaded) {
        throw new Error("WASM module not loaded");
      }

      try {
        // WASMコア関数呼び出し
        const resultJson = instance.parse_and_validate_frontmatter(markdown);
        const result = JSON.parse(resultJson);

        // 結果をValidationError[]形式に変換
        if (!result.success) {
          return result.errors.map((err: any) => ({
            line: err.line || 0,
            message: err.message,
            path: err.path || "",
          }));
        }

        return [];
      } catch (error) {
        console.error("Error validating frontmatter:", error);
        throw error;
      }
    },
    [instance, wasmLoaded]
  );

  /**
   * マークダウンからYAMLに変換
   *
   * @param {string} markdown - 変換するMarkdown文字列
   * @returns {Promise<string>} 変換後のYAML文字列
   *
   * @description
   * Markdownの見出し構造をYAML階層構造に変換する。
   * WASMコアの`md_to_yaml`関数を使用。
   */
  const markdownToYaml = useCallback(
    async (markdown: string): Promise<string> => {
      if (!instance || !wasmLoaded) {
        throw new Error("WASM module not loaded");
      }

      try {
        return instance.md_to_yaml(markdown);
      } catch (error) {
        console.error("Markdown to YAML conversion error:", error);
        throw error;
      }
    },
    [instance, wasmLoaded],
  );

  /**
   * YAMLをスキーマで検証
   *
   * @param {string} yaml - 検証するYAML文字列
   * @param {string} schema - JSONスキーマ文字列
   * @returns {Promise<ValidationError[]>} 検証エラーの配列
   *
   * @description
   * YAMLをJSONスキーマで検証し、エラーがあればValidationError[]として返す。
   * WASMコアの`validate_yaml`関数を使用。
   */
  const validateYamlWithSchema = useCallback(
    async (yaml: string, schema: string): Promise<ValidationError[]> => {
      if (!instance || !wasmLoaded) {
        throw new Error("WASM module not loaded");
      }

      try {
        const resultJson = instance.validate_yaml(yaml, schema);
        const result = JSON.parse(resultJson);

        if (!result.success) {
          return result.errors.map((err: any) => ({
            line: err.line || 0,
            message: `スキーマ検証エラー: ${err.message}`,
            path: err.path || "",
          }));
        }

        return [];
      } catch (error) {
        console.error("YAML schema validation error:", error);
        throw error;
      }
    },
    [instance, wasmLoaded],
  );

  /**
   * YAMLパッチを適用
   *
   * @param {string} yaml - 元のYAML文字列
   * @param {string} patch - 適用するパッチ（JSON Patch形式）
   * @returns {Promise<string>} パッチ適用後のYAML文字列
   */
  const applyPatch = useCallback(
    async (yaml: string, patch: string): Promise<string> => {
      if (!instance || !wasmLoaded) {
        throw new Error("WASM module not loaded");
      }

      try {
        return instance.apply_patch(yaml, patch);
      } catch (error) {
        console.error("YAML patch application error:", error);
        throw error;
      }
    },
    [instance, wasmLoaded],
  );

  return {
    wasmLoaded,
    wasmLoading,
    error,
    mdToYaml,
    yamlToMd,
    validateFrontmatter,
    markdownToYaml,
    validateYamlWithSchema,
    applyPatch,
  };
}

export default useYamlCore;
