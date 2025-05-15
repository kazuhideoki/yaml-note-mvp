import React from 'react';

interface ValidationBannerProps {
  isVisible: boolean;
  onClose?: () => void;
  onEnable?: () => void;
  className?: string;
}

const ValidationBanner: React.FC<ValidationBannerProps> = ({
  isVisible,
  onClose,
  onEnable,
  className = '',
}) => {
  if (!isVisible) return null;

  return (
    <div
      className={`bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 ${className}`}
      role="alert"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">バリデーション無効モード</div>
          <p>
            スキーマ検証が無効になっています。このモードではスキーマ編集が可能ですが、YAMLのエラーチェックは行われません。
          </p>
        </div>
        <div className="flex space-x-2">
          {onEnable && (
            <button
              onClick={onEnable}
              className="px-2 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
            >
              有効化
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="px-2 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
            >
              閉じる
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ValidationBanner;
