import React, { useEffect, useState, useRef } from 'react';
import { ValidationError, ErrorCode } from '../hooks/validation-error.type';

// エラータイプのユニオン型を定義
type ErrorType =
  | 'frontmatter_error'
  | 'schema_error'
  | 'required_field'
  | 'type_mismatch'
  | 'pattern_mismatch'
  | 'other';
import useLogger from '../hooks/useLogger';

/**
 * ErrorBadge コンポーネントのプロパティ型
 */
interface ErrorBadgeProps {
  /** 表示するバリデーションエラー配列 */
  errors: ValidationError[];
  /** エラー行クリック時のコールバック */
  onClick?: (line: number) => void;
  /** 追加の CSS クラス */
  className?: string;
  /** バッジタイプ */
  type?: 'frontmatter' | 'schema' | 'schemaValidation';
  /** スキーマ検証エラーを表示するか */
  validated?: boolean;
}

/**
 * バリデーションエラーをバッジ形式で表示するコンポーネント
 *
 * @component
 * @param {ErrorBadgeProps} props - エラー情報とクリックハンドラ等
 * @returns {JSX.Element | null}
 *
 * @description
 * エラーが存在する場合のみバッジを表示し、クリックで該当行にジャンプ等のアクションが可能。
 * エラー表示時にはUXログも記録する。
 * エラータイプに応じて色分け表示（赤：フロントマターエラー、黄：スキーマ違反、紫：スキーマ構文エラー）
 * エラーが解消された場合、適切にコンポーネントを非表示にする
 * validateフラグがfalseの場合、スキーマ検証エラー（黄色バッジ）は表示されない
 */
export const ErrorBadge: React.FC<ErrorBadgeProps> = ({
  errors,
  onClick,
  className = '',
  type,
  validated = true,
}) => {
  const { log } = useLogger();
  const [visible, setVisible] = useState(false);
  const prevErrorsRef = useRef<ValidationError[]>([]);

  // エラーの変更を検出して表示状態を更新
  useEffect(() => {
    // フィルタ済みのエラーを計算
    // validated=falseの場合、スキーマ検証エラーを除外する
    const filteredErrors = validated
      ? errors
      : errors.filter(err => err.code !== ErrorCode.SchemaValidation);

    // 新しいエラーがある場合は表示
    if (filteredErrors.length > 0) {
      setVisible(true);

      // エラータイプを集計
      const errorTypes = filteredErrors.reduce(
        (acc: Record<ErrorType, number>, err) => {
          let type: ErrorType;
          switch (err.code) {
            case ErrorCode.FrontmatterParse:
            case ErrorCode.FrontmatterValidation:
              type = 'frontmatter_error';
              break;
            case ErrorCode.SchemaValidation:
              if (err.message.includes('required')) type = 'required_field';
              else if (err.message.includes('type')) type = 'type_mismatch';
              else if (err.message.includes('pattern')) type = 'pattern_mismatch';
              else type = 'schema_error';
              break;
            case ErrorCode.SchemaCompile:
              type = 'schema_error';
              break;
            default:
              type = 'other';
          }
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        },
        {
          frontmatter_error: 0,
          schema_error: 0,
          required_field: 0,
          type_mismatch: 0,
          pattern_mismatch: 0,
          other: 0,
        }
      );

      // 前回と異なるエラーセットの場合のみログを記録
      if (JSON.stringify(filteredErrors) !== JSON.stringify(prevErrorsRef.current)) {
        log('warn', 'error_badge_displayed', {
          errorCount: filteredErrors.length,
          errorTypes,
          firstErrorLine: filteredErrors[0]?.line,
          validated,
        });

        // 現在のエラーを保存
        prevErrorsRef.current = [...filteredErrors];
      }
    } else {
      // エラーがなくなった場合は非表示
      setVisible(false);

      // エラーが解消された場合にログを記録（前回エラーがあった場合のみ）
      if (prevErrorsRef.current.length > 0) {
        log('info', 'errors_resolved', {
          previousErrorCount: prevErrorsRef.current.length,
          validated,
        });

        // エラー参照をクリア
        prevErrorsRef.current = [];
      }
    }
  }, [errors, log, validated]);

  // フィルタ済みのエラーを計算（表示判定時にも必要）
  const filteredErrors = validated
    ? errors
    : errors.filter(err => err.code !== ErrorCode.SchemaValidation);

  // 表示されない場合は早期リターン
  if (!visible || filteredErrors.length === 0) {
    return null;
  }

  // クリックハンドラー
  const handleClick = (line: number, errorMessage: string) => {
    // エラークリックのログ
    log('info', 'error_badge_click', {
      line,
      errorMessage: errorMessage.substring(0, 50), // 長すぎるメッセージを切り詰め
    });

    if (onClick) {
      onClick(line);
    }
  };

  // エラータイプに基づいてクラスを返す関数
  const getErrorTypeClass = (error: ValidationError) => {
    // スキーマ構文エラー（紫）
    if (type === 'schema' || error.code === ErrorCode.SchemaCompile) {
      return 'bg-purple-100 border-purple-400 text-purple-700';
    }
    // フロントマターエラー（赤）
    else if (
      type === 'frontmatter' ||
      error.code === ErrorCode.FrontmatterParse ||
      error.code === ErrorCode.FrontmatterValidation
    ) {
      return 'bg-red-100 border-red-400 text-red-700';
    }
    // スキーマ検証エラー（黄）
    else if (type === 'schemaValidation' || error.code === ErrorCode.SchemaValidation) {
      return 'bg-yellow-100 border-yellow-400 text-yellow-700';
    }
    return 'bg-red-100 border-red-400 text-red-700'; // デフォルト（赤）
  };

  // エラー数と種類に基づいてコンテナクラスを決定
  const getContainerClass = () => {
    // type属性が指定されている場合はそれを優先
    if (type === 'schema') {
      return 'bg-purple-100 border border-purple-400 text-purple-700';
    } else if (type === 'frontmatter') {
      return 'bg-red-100 border border-red-400 text-red-700';
    } else if (type === 'schemaValidation') {
      return 'bg-yellow-100 border border-yellow-400 text-yellow-700';
    }

    // スキーマ構文エラー判定
    const hasSchemaStructureError = errors.some(error => error.code === ErrorCode.SchemaCompile);

    const hasFrontmatterError = errors.some(
      error =>
        error.code === ErrorCode.FrontmatterParse || error.code === ErrorCode.FrontmatterValidation
    );

    const hasSchemaValidationError = errors.some(
      error => error.code === ErrorCode.SchemaValidation
    );

    if (hasSchemaStructureError) {
      return 'bg-purple-100 border border-purple-400 text-purple-700'; // スキーマ構文エラー（紫）
    } else if (hasFrontmatterError && !hasSchemaValidationError) {
      return 'bg-red-100 border border-red-400 text-red-700'; // フロントマターエラーのみ（赤）
    } else if (!hasFrontmatterError && hasSchemaValidationError) {
      return 'bg-yellow-100 border border-yellow-400 text-yellow-700'; // スキーマ検証エラーのみ（黄）
    } else if (hasFrontmatterError && hasSchemaValidationError) {
      return 'bg-orange-100 border border-orange-400 text-orange-700'; // 両方のエラー（オレンジ）
    }

    return 'bg-red-100 border border-red-400 text-red-700'; // デフォルト（赤）
  };

  // エラー数と種類に基づいてアイコンを選択
  const getErrorIcon = () => {
    // type属性が指定されている場合はそれを優先
    if (type === 'schema') {
      return (
        <svg
          className="w-6 h-6 mr-2 text-purple-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
      );
    }

    // スキーマ構文エラー判定
    const hasSchemaStructureError = errors.some(error => error.code === ErrorCode.SchemaCompile);

    const hasFrontmatterError = errors.some(
      error =>
        error.code === ErrorCode.FrontmatterParse || error.code === ErrorCode.FrontmatterValidation
    );

    const hasSchemaValidationError = errors.some(
      error => error.code === ErrorCode.SchemaValidation
    );

    if (hasSchemaStructureError) {
      // スキーマ構文エラー（紫）
      return (
        <svg
          className="w-6 h-6 mr-2 text-purple-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
      );
    } else if (hasFrontmatterError && hasSchemaValidationError) {
      // 両方のエラーがある場合
      return (
        <svg
          className="w-6 h-6 mr-2 text-orange-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
      );
    } else if (hasFrontmatterError) {
      // フロントマターエラーのみ
      return (
        <svg
          className="w-6 h-6 mr-2 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
      );
    } else if (hasSchemaValidationError) {
      // スキーマエラーのみ
      return (
        <svg
          className="w-6 h-6 mr-2 text-yellow-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          ></path>
        </svg>
      );
    }

    // デフォルト
    return (
      <svg
        className="w-6 h-6 mr-2 text-red-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        ></path>
      </svg>
    );
  };

  /**
   * エラー項目をレンダリング
   */
  const renderError = (error: ValidationError, index: number) => {
    // validated=falseの場合はスキーマ検証エラーを表示しない
    if (!validated && error.code === ErrorCode.SchemaValidation) {
      return null;
    }

    return (
      <li
        key={`error-${index}-${error.line}`}
        className={`mb-1 cursor-pointer hover:bg-opacity-70 p-1 rounded ${getErrorTypeClass(error)}`}
        onClick={() => handleClick(error.line, error.message)}
      >
        {error.line > 0 && <span className="font-mono font-bold">行 {error.line}: </span>}
        {error.message}
        {error.path && <span className="text-xs block ml-4">パス: {error.path}</span>}
      </li>
    );
  };

  /**
   * エラータイプごとのメッセージグループを作成
   */
  const renderErrorGroups = () => {
    // type属性が指定されている場合は単一グループとして扱う
    if (type === 'schema') {
      return (
        <div>
          <div className="font-bold text-purple-700 mb-1">スキーマ構文エラー:</div>
          {errors.map((error, index) => renderError(error, index))}
        </div>
      );
    } else if (type === 'frontmatter') {
      return (
        <div>
          <div className="font-bold text-red-700 mb-1">フロントマターエラー:</div>
          {errors.map((error, index) => renderError(error, index))}
        </div>
      );
    } else if (type === 'schemaValidation') {
      // 検証が無効な場合はスキーマ検証エラーを表示しない
      if (!validated) {
        return null;
      }
      return (
        <div>
          <div className="font-bold text-yellow-700 mb-1">スキーマ検証エラー:</div>
          {errors.map((error, index) => renderError(error, index))}
        </div>
      );
    }

    // 標準の分類ロジック
    // スキーマ構文エラー
    const schemaStructureErrors = errors.filter(error => error.code === ErrorCode.SchemaCompile);

    const frontmatterErrors = errors.filter(
      error =>
        error.code === ErrorCode.FrontmatterParse || error.code === ErrorCode.FrontmatterValidation
    );

    const schemaValidationErrors = errors.filter(
      error => error.code === ErrorCode.SchemaValidation
    );

    const otherErrors = errors.filter(
      error =>
        error.code !== ErrorCode.SchemaCompile &&
        error.code !== ErrorCode.FrontmatterParse &&
        error.code !== ErrorCode.FrontmatterValidation &&
        error.code !== ErrorCode.SchemaValidation
    );

    return (
      <>
        {schemaStructureErrors.length > 0 && (
          <div className="mb-2">
            <div className="font-bold text-purple-700 mb-1">スキーマ構文エラー:</div>
            {schemaStructureErrors.map((error, index) => renderError(error, index))}
          </div>
        )}

        {frontmatterErrors.length > 0 && (
          <div className="mb-2">
            <div className="font-bold text-red-700 mb-1">フロントマターエラー:</div>
            {frontmatterErrors.map((error, index) => renderError(error, index))}
          </div>
        )}

        {/* スキーマ検証エラーは validated が true の場合のみ表示 */}
        {validated && schemaValidationErrors.length > 0 && (
          <div className="mb-2">
            <div className="font-bold text-yellow-700 mb-1">スキーマ検証エラー:</div>
            {schemaValidationErrors.map((error, index) => renderError(error, index))}
          </div>
        )}

        {otherErrors.length > 0 && (
          <div>
            <div className="font-bold mb-1">その他のエラー:</div>
            {otherErrors.map((error, index) => renderError(error, index))}
          </div>
        )}
      </>
    );
  };

  return (
    <div className={`fixed right-4 bottom-4 z-10 ${className}`}>
      <div className={`${getContainerClass()} px-4 py-3 rounded shadow-md max-w-md`}>
        <div className="flex items-center mb-2">
          {getErrorIcon()}
          <span className="font-bold">バリデーションエラー ({errors.length})</span>
        </div>

        {renderErrorGroups()}
      </div>
    </div>
  );
};

export default ErrorBadge;
