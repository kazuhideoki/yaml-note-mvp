import { useState, useEffect, useCallback, useRef } from 'react';
// モックインタフェースでWASMモジュールを定義
interface CoreWasmType {
  validate_yaml: (yaml: string, schema: string) => string;
  compile_schema: (schema: string) => string; // Add compile_schema
  parse_yaml: (yaml: string) => string;
  stringify_yaml: (json: string) => string;
  apply_patch: (yaml: string, patch: string) => string;
  version: () => string;
  error_to_js_value: (error: any) => string;
}

// 実際の使用時にはランタイムでモジュールをロード
let CoreWasm: CoreWasmType;

import { debounce } from 'lodash-es';

// バリデーション結果の型定義
/**
 * バリデーションエラー情報
 *
 * @property {number} line - エラー発生行番号（0の場合は特定不可）
 * @property {string} message - エラーメッセージ
 * @property {string} path - エラー発生箇所のパス（YAML/JSON Pointer等）
 */
export interface ValidationError {
  line: number;
  message: string;
  path: string;
}

export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
}

// スキーマパスとその内容のマッピング
const schemaCache = new Map<string, string>();

/**
 * YAMLバリデーション用カスタムフック
 *
 * @description
 * WASMコアモジュールと連携し、YAML文字列とスキーマをリアルタイムでバリデーションする。
 * バリデーション結果（成功/失敗・エラーリスト）や初期化状態を管理し、エディタやUIに提供する。
 * スキーマ・YAML内容のキャッシュや、WASM初期化状態も内部で管理。
 *
 * @param {boolean} validationEnabled - バリデーションを実行するかどうか
 * @returns {{
 *   isInitialized: boolean;
 *   validationResult: ValidationResult;
 *   validateYaml: (yaml: string, schemaPath: string) => void;
 *   validateSchema: (schema: string) => Promise<ValidationResult>;
 * }}
 */
export function useYaml(validationEnabled: boolean = true) {
  // WASM初期化状態
  const [isInitialized, setIsInitialized] = useState(false);
  // 現在の検証結果
  const [validationResult, setValidationResult] = useState<ValidationResult>({ success: true, errors: [] });
  // キャッシュのためのRef
  const lastYaml = useRef<string>('');
  const lastSchema = useRef<string>('');
  const lastResult = useRef<ValidationResult>({ success: true, errors: [] });

  // WASM初期化
  useEffect(() => {
    const loadWasm = async () => {
      try {
        // 動的インポート - ビルド時ではなく実行時にモジュールをロード
        // Viteのエイリアス'core-wasm'を使用（vite.config.tsで定義）
        const wasmModule = await import('core-wasm');
        CoreWasm = wasmModule;
        
        // WASMのバージョン確認でロードを検証
        const version = CoreWasm.version();
        console.log(`Core WASM loaded, version: ${version}`);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize WASM module:', error);
        setIsInitialized(false);
      }
    };
    
    loadWasm();
  }, []);

  // スキーマを読み込む関数
  const loadSchema = useCallback(async (schemaPath: string): Promise<string> => {
    // キャッシュにあればそれを返す
    if (schemaCache.has(schemaPath)) {
      return schemaCache.get(schemaPath)!;
    }

    try {
      console.log(`Loading schema from: ${schemaPath}`);
      // 絶対パスを使用してスキーマをロード
      const response = await fetch(schemaPath);
      if (!response.ok) {
        console.error(`Schema fetch error: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to load schema: ${response.statusText || 'Not Found'}`);
      }
      const schemaContent = await response.text();
      console.log(`Schema loaded successfully: ${schemaContent.substring(0, 50)}...`);
      schemaCache.set(schemaPath, schemaContent);
      return schemaContent;
    } catch (error) {
      console.error(`Error loading schema from ${schemaPath}:`, error);
      throw error;
    }
  }, []);

  // 新機能: スキーマ自体を検証する関数
  const validateSchema = useCallback(async (schema: string): Promise<ValidationResult> => {
    if (!isInitialized || !CoreWasm) {
      console.warn('WASM not initialized yet');
      return { success: false, errors: [{ line: 0, message: 'WASM not initialized', path: '' }] };
    }

    try {
      // スキーマのコンパイル・検証
      const resultJson = CoreWasm.compile_schema(schema);
      const result: ValidationResult = JSON.parse(resultJson);
      return result;
    } catch (error) {
      console.error('Schema validation error:', error);
      return {
        success: false,
        errors: [{ line: 0, message: `スキーマ検証エラー: ${error}`, path: '' }]
      };
    }
  }, [isInitialized]);

  // デバウンスされたバリデーション関数
  const validateYaml = useCallback(
    debounce(async (yaml: string, schemaPath: string) => {
      // 初期化されていなければ何もしない
      if (!isInitialized || !CoreWasm) {
        console.warn('WASM not initialized yet');
        return;
      }

      // 入力が空なら早期リターン
      if (!yaml.trim()) {
        setValidationResult({ success: true, errors: [] });
        return;
      }

      // バリデーションが無効な場合は常に成功を返す
      if (!validationEnabled) {
        setValidationResult({ success: true, errors: [] });
        return;
      }

      // 同じ入力なら前回の結果を返す（キャッシュ）
      if (yaml === lastYaml.current && schemaPath === lastSchema.current) {
        setValidationResult(lastResult.current);
        return;
      }

      try {
        // スキーマの読み込み
        const schema = await loadSchema(schemaPath);
        
        // バリデーション実行
        const resultJson = CoreWasm.validate_yaml(yaml, schema);
        const result: ValidationResult = JSON.parse(resultJson);
        
        // 結果の保存
        setValidationResult(result);
        lastYaml.current = yaml;
        lastSchema.current = schemaPath;
        lastResult.current = result;
      } catch (error) {
        console.error('Validation error:', error);
        setValidationResult({
          success: false,
          errors: [{ line: 0, message: `バリデーションエラー: ${error}`, path: '' }]
        });
      }
    }, 30), // 30msのデバウンス
    [isInitialized, loadSchema, validationEnabled] // validationEnabled を依存配列に追加
  );

  return {
    isInitialized,
    validateYaml,
    validateSchema, // 新しい関数を公開
    validationResult
  };
}

export default useYaml;