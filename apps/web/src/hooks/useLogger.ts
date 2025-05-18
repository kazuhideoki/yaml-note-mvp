import { useContext } from 'react';
import { LoggerContext, type LoggerContextType } from '../contexts/LoggerContext';

/**
 * ロガーフック
 *
 * @description
 * LoggerContext からログ機能（log, events, clearEvents, sessionId, exportLogs）を取得するカスタムフック。
 * 必ず LoggerProvider 配下で利用すること。
 *
 * @returns {LoggerContextType} ログ操作用の関数群・状態
 * @throws {Error} LoggerProvider 配下でない場合はエラー
 *
 * @example
 * const { log } = useLogger();
 * log('info', 'user_action', { detail: 'clicked button' });
 */
export const useLogger = (): LoggerContextType => {
  const context = useContext(LoggerContext);

  if (!context) {
    throw new Error('useLogger must be used within a LoggerProvider');
  }

  return context;
};

export default useLogger;
