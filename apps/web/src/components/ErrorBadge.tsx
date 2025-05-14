import React, { useEffect, useState, useRef } from 'react';
import { ValidationError } from '../hooks/useYaml';
import useLogger from '../hooks/useLogger';

interface ErrorBadgeProps {
  errors: ValidationError[];
  onClick?: (line: number) => void;
  className?: string;
}

/**
 * バリデーションエラーをバッジ形式で表示するコンポーネント
 *
 * @component
 * @param {ErrorBadgeProps} props - エラー情報とクリックハンドラ等
 * @param {ValidationError[]} props.errors - 表示するバリデーションエラー配列
 * @param {(line: number) => void} [props.onClick] - エラー行クリック時のコールバック
 * @param {string} [props.className] - 追加のCSSクラス
 * @returns {JSX.Element | null}
 *
 * @description
 * エラーが存在する場合のみバッジを表示し、クリックで該当行にジャンプ等のアクションが可能。
 * エラー表示時にはUXログも記録する。
 * エラータイプに応じて色分け表示（赤：フロントマターエラー、今後は黄：スキーマ違反、紫：スキーマ構文エラーを追加予定）
 * エラーが解消された場合、適切にコンポーネントを非表示にする
 */
export const ErrorBadge: React.FC<ErrorBadgeProps> = ({
  errors,
  onClick,
  className = ''
}) => {
  const { log } = useLogger();
  const [visible, setVisible] = useState(false);
  const prevErrorsRef = useRef<ValidationError[]>([]);

  // エラーの変更を検出して表示状態を更新
  useEffect(() => {
    // 新しいエラーがある場合は表示
    if (errors.length > 0) {
      setVisible(true);
      
      // エラータイプを集計
      const errorTypes = errors.reduce((acc: Record<string, number>, err) => {
        const type = err.message.includes('Frontmatter') ? 'frontmatter_error' :
                    err.message.includes('required') ? 'required_field' :
                    err.message.includes('type') ? 'type_mismatch' :
                    err.message.includes('pattern') ? 'pattern_mismatch' :
                    'other';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      // 前回と異なるエラーセットの場合のみログを記録
      if (JSON.stringify(errors) !== JSON.stringify(prevErrorsRef.current)) {
        log('warn', 'error_badge_displayed', {
          errorCount: errors.length,
          errorTypes,
          firstErrorLine: errors[0]?.line
        });
        
        // 現在のエラーを保存
        prevErrorsRef.current = [...errors];
      }
    } else {
      // エラーがなくなった場合は非表示
      setVisible(false);
      
      // エラーが解消された場合にログを記録（前回エラーがあった場合のみ）
      if (prevErrorsRef.current.length > 0) {
        log('info', 'errors_resolved', {
          previousErrorCount: prevErrorsRef.current.length
        });
        
        // エラー参照をクリア
        prevErrorsRef.current = [];
      }
    }
  }, [errors, log]);

  // 表示されない場合は早期リターン
  if (!visible || errors.length === 0) {
    return null;
  }

  // クリックハンドラー
  const handleClick = (line: number, errorMessage: string) => {
    // エラークリックのログ
    log('info', 'error_badge_click', {
      line,
      errorMessage: errorMessage.substring(0, 50) // 長すぎるメッセージを切り詰め
    });

    if (onClick) {
      onClick(line);
    }
  };

  // エラータイプに基づいてクラスを返す関数
  const getErrorTypeClass = (error: ValidationError) => {
    if (error.message.includes("Frontmatter")) {
      return "bg-red-100 border-red-400 text-red-700"; // フロントマターエラー
    }
    // 将来的に他のエラータイプ用に拡張予定
    // - 黄色: スキーマ違反
    // - 紫色: スキーマ構文エラー
    return "bg-red-100 border-red-400 text-red-700"; // デフォルト
  };

  // すべてのエラーが同じタイプか確認し、バッジの全体の色を決定
  const getContainerClass = () => {
    // 現在はすべてのエラーを赤で表示
    // S2フェーズではフロントマターエラーのみを扱うため
    return "bg-red-100 border border-red-400 text-red-700";
  };

  return (
    <div className={`fixed right-4 bottom-4 z-10 ${className}`}>
      <div className={`${getContainerClass()} px-4 py-3 rounded shadow-md max-w-md`}>
        <div className="flex items-center mb-2">
          <svg className="w-6 h-6 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span className="font-bold">バリデーションエラー ({errors.length})</span>
        </div>
        
        <ul className="text-sm">
          {errors.map((error, index) => (
            <li
              key={`error-${index}-${error.line}`}
              className={`mb-1 cursor-pointer hover:bg-red-200 p-1 rounded`}
              onClick={() => handleClick(error.line, error.message)}
            >
              {error.line > 0 && <span className="font-mono font-bold">行 {error.line}: </span>}
              {error.message}
              {error.path && <span className="text-xs text-red-600 block ml-4">パス: {error.path}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ErrorBadge;