import React from 'react';
import { ValidationError } from '../hooks/useYaml';

interface ErrorBadgeProps {
  errors: ValidationError[];
  onClick?: (line: number) => void;
  className?: string;
}

export const ErrorBadge: React.FC<ErrorBadgeProps> = ({ 
  errors, 
  onClick,
  className = '' 
}) => {
  if (errors.length === 0) {
    return null;
  }

  // クリックハンドラー
  const handleClick = (line: number) => {
    if (onClick) {
      onClick(line);
    }
  };

  return (
    <div className={`fixed right-4 bottom-4 z-10 ${className}`}>
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-md max-w-md">
        <div className="flex items-center mb-2">
          <svg className="w-6 h-6 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span className="font-bold">バリデーションエラー ({errors.length})</span>
        </div>
        
        <ul className="text-sm">
          {errors.map((error, index) => (
            <li 
              key={index}
              className="mb-1 cursor-pointer hover:bg-red-200 p-1 rounded"
              onClick={() => handleClick(error.line)}
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