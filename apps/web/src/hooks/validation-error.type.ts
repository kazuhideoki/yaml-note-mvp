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
  code: ErrorCode;
}

/** バリデーションエラー種別 */
export enum ErrorCode {
  YamlParse = 'YamlParse',
  SchemaCompile = 'SchemaCompile',
  FrontmatterParse = 'FrontmatterParse',
  FrontmatterValidation = 'FrontmatterValidation',
  SchemaValidation = 'SchemaValidation',
  Unknown = 'Unknown',
}

/**
 * WASMから返されるエラー情報
 *
 * Rust側のErrorInfo構造体に対応する型定義
 */
export interface WasmErrorInfo {
  line?: number;
  message: string;
  path?: string;
  code: number;
}

/**
 * WASMから返されるバリデーション結果
 *
 * successがtrueの場合はerrorsは空配列となる
 */
export interface ValidationResult {
  success: boolean;
  errors: WasmErrorInfo[];
}

/**
 * Rust/WASMのエラーコードをTypeScriptの文字列エラーコードに変換
 *
 * @param code - Rust側から返されるエラーコード（型は不明）
 * @returns 対応するErrorCode列挙型の値
 */
export function mapNumericToStringErrorCode(code: unknown): ErrorCode {
  // 文字列の場合はそのままErrorCodeへマッピング
  if (typeof code === 'string') {
    switch (code) {
      case ErrorCode.YamlParse:
        return ErrorCode.YamlParse;
      case ErrorCode.SchemaCompile:
        return ErrorCode.SchemaCompile;
      case ErrorCode.FrontmatterParse:
        return ErrorCode.FrontmatterParse;
      case ErrorCode.FrontmatterValidation:
        return ErrorCode.FrontmatterValidation;
      case ErrorCode.SchemaValidation:
        return ErrorCode.SchemaValidation;
      case ErrorCode.Unknown:
        return ErrorCode.Unknown;
      default:
        return ErrorCode.Unknown;
    }
  }

  // 数値以外は未知のエラーとして扱う
  if (typeof code !== 'number') {
    return ErrorCode.Unknown;
  }

  switch (code) {
    case 0:
      return ErrorCode.YamlParse;
    case 1:
      return ErrorCode.SchemaCompile;
    case 2:
      return ErrorCode.FrontmatterParse;
    case 3:
      return ErrorCode.FrontmatterValidation;
    case 4:
      return ErrorCode.SchemaValidation;
    case 5:
    default:
      return ErrorCode.Unknown;
  }
}
