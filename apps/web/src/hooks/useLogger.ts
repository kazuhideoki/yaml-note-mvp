import { useContext } from 'react';
import { LoggerContext, LoggerContextType } from '../contexts/LoggerContext';

/**
 * ロガーフック
 * コンポーネント内でログ機能を使用するために使用する
 */
export const useLogger = (): LoggerContextType => {
  const context = useContext(LoggerContext);
  
  if (!context) {
    throw new Error('useLogger must be used within a LoggerProvider');
  }
  
  return context;
};

export default useLogger;