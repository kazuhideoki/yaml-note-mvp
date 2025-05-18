import { createContext } from 'react';

/**
 * ログレベルの型定義
 * - debug: デバッグ情報
 * - info: 通常の操作・情報
 * - warn: 警告
 * - error: エラー
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * ログイベント構造の定義
 * @property {number} timestamp - イベント発生時刻（UNIXエポックms）
 * @property {LogLevel} level - ログレベル
 * @property {string} action - アクション名
 * @property {Record<string, unknown>} [details] - 追加情報
 * @property {string} sessionId - セッションID
 */
export interface LogEvent {
  timestamp: number;
  level: LogLevel;
  action: string;
  details?: Record<string, unknown>;
  sessionId: string;
}

/**
 * LoggerContext で提供される関数・状態の型
 */
export interface LoggerContextType {
  /** ログ記録関数 */
  log: (level: LogLevel, action: string, details?: Record<string, unknown>) => void;
  /** 現在のログイベント配列 */
  events: LogEvent[];
  /** ログのクリア */
  clearEvents: () => void;
  /** セッションID */
  sessionId: string;
  /** ログを JSON 文字列でエクスポート */
  exportLogs: () => string;
}

/**
 * ログ機能を提供するReact Context
 */
export const LoggerContext = createContext<LoggerContextType | null>(null);


