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
 * ログアクション名の一覧
 *
 * アプリ内で発生し得るすべてのアクションを列挙する。
 */
export type LogAction =
  | 'session_start'
  | 'session_end'
  | 'error_badge_displayed'
  | 'errors_resolved'
  | 'error_badge_click'
  | 'validation_toggled'
  | 'validation_reset_on_major_change'
  | 'markdown_saved'
  | 'file_loaded_with_handle'
  | 'file_loaded'
  | 'unsupported_file'
  | 'schema_validation_error'
  | 'schema_compile_error'
  | 'schema_saved'
  | 'schema_file_loaded_with_handle'
  | 'schema_file_loaded'
  | 'unsupported_schema_file'
  | 'fsapi_not_supported'
  | 'file_saved_as'
  | 'file_save_as_error'
  | 'file_opened_fallback'
  | 'file_opened'
  | 'file_open_error'
  | 'file_saved'
  | 'file_save_error'
  | 'validation_state_changed'
  | 'validation_toggle_failed'
  | 'errors_manually_cleared'
  | 'schema_path_error'
  | 'validation_time'
  | 'validation_error'
  | 'test_action'
  | 'test1'
  | 'test2'
  | 'debug_action'
  | 'current';

/**
 * ログイベント構造の定義
 * @property {number} timestamp - イベント発生時刻（UNIXエポックms）
 * @property {LogLevel} level - ログレベル
 * @property {LogAction} action - アクション名
 * @property {Record<string, unknown>} [details] - 追加情報
 * @property {string} sessionId - セッションID
 */
export interface LogEvent {
  timestamp: number;
  level: LogLevel;
  action: LogAction;
  details?: Record<string, unknown>;
  sessionId: string;
}

/**
 * LoggerContext で提供される関数・状態の型
 */
export interface LoggerContextType {
  /** ログ記録関数 */
  log: (level: LogLevel, action: LogAction, details?: Record<string, unknown>) => void;
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


