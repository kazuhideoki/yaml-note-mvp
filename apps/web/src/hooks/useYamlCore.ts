import { useState, useEffect, useCallback } from "react";
import { debounce } from "lodash-es";

/**
 * WASMコアモジュールの型定義
 */
interface CoreWasmType {
  validate_yaml: (yaml: string, schema: string) => string;
  parse_yaml: (yaml: string) => string;
  stringify_yaml: (json: string) => string;
  apply_patch: (yaml: string, patch: string) => string;
  md_to_yaml: (md: string) => string;
  yaml_to_md: (yaml: string) => string;
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
 * YAML/Markdownの相互変換機能を提供するカスタムフック
 *
 * @description
 * WASMコアモジュールを利用して、Markdown<->YAML間の変換機能を提供します。
 * 初期化状態の管理や変換処理のデバウンスを内部で行います。
 *
 * @returns {{
 *   isInitialized: boolean;
 *   mdToYaml: (md: string) => Promise<ConversionResult>;
 *   yamlToMd: (yaml: string) => Promise<ConversionResult>;
 * }}
 */
export function useYamlCore() {
  // WASM初期化状態
  const [isInitialized, setIsInitialized] = useState(false);

  // WASM初期化
  useEffect(() => {
    const loadWasm = async () => {
      try {
        // 動的インポート
        const wasmModule = await import("core-wasm");
        CoreWasm = wasmModule as unknown as CoreWasmType;

        // WASMのバージョン確認
        const version = CoreWasm.version();
        console.log(`Core WASM loaded, version: ${version}`);
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize WASM module:", error);
        setIsInitialized(false);
      }
    };

    loadWasm();
  }, []);

  // Markdown -> YAML 変換関数
  const mdToYaml = useCallback(
    debounce(async (md: string): Promise<ConversionResult> => {
      if (!isInitialized || !CoreWasm) {
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
        const result = CoreWasm.md_to_yaml(md);

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
    [isInitialized],
  );

  // YAML -> Markdown 変換関数
  const yamlToMd = useCallback(
    debounce(async (yaml: string): Promise<ConversionResult> => {
      if (!isInitialized || !CoreWasm) {
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
        const result = CoreWasm.yaml_to_md(yaml);

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
    [isInitialized],
  );

  return {
    isInitialized,
    mdToYaml,
    yamlToMd,
  };
}

export default useYamlCore;
