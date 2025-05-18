/**
 * バリデーショントグルコンポーネント
 * @description
 * スキーマバリデーションの有効/無効を切り替えるトグルスイッチを表示する。
 * フロントマターの validated フィールドを変更することで検証状態を制御する。
 */
import React, { useCallback } from 'react';
import useLogger from '../hooks/useLogger';

export interface ValidationToggleProps {
  isValidated: boolean;
  onToggle: (isValidated: boolean) => void;
  isDisabled?: boolean;
}

export const ValidationToggle: React.FC<ValidationToggleProps> = ({
  isValidated,
  onToggle,
  isDisabled = false
}) => {
  const { log } = useLogger();

  const handleToggle = useCallback(() => {
    // 現在と逆の状態にトグル
    const newState = !isValidated;

    // 親コンポーネントに変更を通知
    onToggle(newState);

    // ログにイベントを記録
    log('info', 'validation_toggled', {
      newState,
      action: newState ? 'enabled' : 'disabled'
    });
  }, [isValidated, onToggle, log]);

  return (
    <div className="flex items-center space-x-2 ml-2">
      <span className="text-sm text-gray-400">検証</span>
      <button
        type="button"
        role="switch"
        aria-checked={isValidated}
        onClick={handleToggle}
        disabled={isDisabled}
        className={`
          relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent
          rounded-full cursor-pointer transition-colors ease-in-out duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isValidated ? 'bg-blue-600' : 'bg-gray-200'}
        `}
      >
        <span className="sr-only">検証を{isValidated ? '無効' : '有効'}にする</span>
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full bg-white
            shadow transform ring-0 transition ease-in-out duration-200
            ${isValidated ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
};

export default ValidationToggle;