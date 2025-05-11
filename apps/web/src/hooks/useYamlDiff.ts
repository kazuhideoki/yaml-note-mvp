/***********************************************
 * useYamlDiff.ts
 * WASM差分・パッチ・競合APIをPromiseラップするカスタムフック
 * - yaml_diff, apply_patch, detect_conflicts を提供
 * - コアWASMの型定義・初期化・エラーハンドリング
 * - 日本語JSDoc付き
 ***********************************************/

import { useState, useEffect } from "react";

/**
 * コアWASMモジュール型定義
 */
interface CoreWasmType {
  yaml_diff: (base_yaml: string, edited_yaml: string) => string;
  apply_patch: (yaml: string, patch_json: string) => string;
  detect_conflicts: (base_yaml: string, edited_yaml: string) => string;
  version: () => string;
}

// WASMインスタンス
let CoreWasm: CoreWasmType;

/**
 * 差分結果型
 * @property {string} patch - JSON Patch配列文字列
 */
export interface DiffResult {
  patch: string;
}

/**
 * 競合検知結果型
 * @property {boolean} has_conflict - 競合があるか
 * @property {any[]} conflicts - 競合詳細（パス・値など）
 */
export interface ConflictResult {
  has_conflict: boolean;
  conflicts: any[];
}

/**
 * useYamlDiff
 * 
 * @description
 * YAML差分・パッチ・競合検知APIをPromiseでラップして提供するカスタムフック。
 * WASM初期化状態も管理し、UIから非同期で呼び出せる。
 * 
 * @returns {{
 *   isInitialized: boolean;
 *   yamlDiff: (base: string, edited: string) => Promise<DiffResult>;
 *   applyPatch: (yaml: string, patch: string) => Promise<string>;
 *   detectConflicts: (base: string, edited: string) => Promise<ConflictResult>;
 * }}
 */
export function useYamlDiff() {
  const [isInitialized, setIsInitialized] = useState(false);

  // WASM初期化
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const wasmModule = await import("core-wasm");
        CoreWasm = wasmModule as unknown as CoreWasmType;
        if (mounted) setIsInitialized(true);
      } catch (e) {
        // 初期化失敗時
        setIsInitialized(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  /**
   * YAML差分（JSON Patch）を取得
   * @param {string} base - 元YAML
   * @param {string} edited - 編集後YAML
   * @returns {Promise<DiffResult>}
   */
  const yamlDiff = async (base: string, edited: string): Promise<DiffResult> => {
    if (!CoreWasm) throw new Error("WASM未初期化");
    try {
      const patch = CoreWasm.yaml_diff(base, edited);
      return { patch };
    } catch (e) {
      return { patch: "[]" };
    }
  };

  /**
   * YAMLにパッチを適用
   * @param {string} yaml - 元YAML
   * @param {string} patch - JSON Patch配列文字列
   * @returns {Promise<string>} - 適用後のYAML
   */
  const applyPatch = async (yaml: string, patch: string): Promise<string> => {
    if (!CoreWasm) throw new Error("WASM未初期化");
    try {
      return CoreWasm.apply_patch(yaml, patch);
    } catch (e) {
      return yaml;
    }
  };

  /**
   * 競合検知
   * @param {string} base - 元YAML
   * @param {string} edited - 編集後YAML
   * @returns {Promise<ConflictResult>}
   */
  const detectConflicts = async (base: string, edited: string): Promise<ConflictResult> => {
    if (!CoreWasm) throw new Error("WASM未初期化");
    try {
      const resultStr = CoreWasm.detect_conflicts(base, edited);
      const result = JSON.parse(resultStr);
      return {
        has_conflict: !!result.has_conflict,
        conflicts: Array.isArray(result.conflicts) ? result.conflicts : []
      };
    } catch (e) {
      return { has_conflict: false, conflicts: [] };
    }
  };

  return {
    isInitialized,
    yamlDiff,
    applyPatch,
    detectConflicts,
  };
}
