import React from 'react';

interface ValidationToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
  className?: string;
}

const ValidationToggle: React.FC<ValidationToggleProps> = ({
  isEnabled,
  onToggle,
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <span className="mr-2 text-sm">バリデーション:</span>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          isEnabled ? 'bg-blue-600' : 'bg-gray-400'
        }`}
        role="switch"
        aria-checked={isEnabled}
        title={isEnabled ? 'バリデーションを無効にする' : 'バリデーションを有効にする'}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isEnabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span className="ml-2 text-sm">{isEnabled ? 'ON' : 'OFF'}</span>
    </div>
  );
};

export default ValidationToggle;
