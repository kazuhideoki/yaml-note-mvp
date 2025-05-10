import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

// ログレベルの定義
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// ログイベント構造の定義
export interface LogEvent {
  timestamp: number;
  level: LogLevel;
  action: string;
  details?: Record<string, any>;
  sessionId: string;
}

// ロガーコンテキストの型定義
export interface LoggerContextType {
  log: (level: LogLevel, action: string, details?: Record<string, any>) => void;
  events: LogEvent[];
  clearEvents: () => void;
  sessionId: string;
  exportLogs: () => string;
}

// コンテキストの作成
export const LoggerContext = createContext<LoggerContextType | null>(null);

// プロバイダーコンポーネント
export const LoggerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<LogEvent[]>([]);
  // セッションIDはコンポーネントマウント時に1回だけ生成
  const [sessionId] = useState<string>(() => uuidv4());
  
  // プラットフォーム情報の収集
  const [platformInfo] = useState(() => ({
    userAgent: navigator.userAgent,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    language: navigator.language,
    devicePixelRatio: window.devicePixelRatio,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  }));
  
  // ログイベントを記録する関数
  const logEvent = (level: LogLevel, action: string, details?: Record<string, any>) => {
    const event: LogEvent = {
      timestamp: Date.now(),
      level,
      action,
      details,
      sessionId
    };
    
    setEvents(prev => [...prev, event]);
    
    // 開発環境ではコンソールにも出力
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${level.toUpperCase()}] ${action}`, details || '');
    }
  };
  
  // イベントをクリアする関数
  const clearEvents = () => {
    setEvents([]);
  };
  
  // ログをエクスポートする関数
  const exportLogs = (): string => {
    // ストレージから全てのログを取得
    const storedLogs = JSON.parse(localStorage.getItem('yaml_note_logs') || '[]');
    // 現在のイベントと結合
    const allLogs = [...storedLogs, ...events];
    // JSONとして出力
    return JSON.stringify(allLogs, null, 2);
  };
  
  // セッション開始ログ
  useEffect(() => {
    logEvent('info', 'session_start', { platformInfo });
    
    // セッション終了時のクリーンアップ
    return () => {
      logEvent('info', 'session_end', {
        duration: Date.now() - events[0]?.timestamp || 0,
        eventCount: events.length,
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // ログ保存の実装
  useEffect(() => {
    // 一定間隔でログをローカルストレージに保存
    const saveInterval = setInterval(() => {
      if (events.length > 0) {
        // 過去のログと結合
        const storedLogs = JSON.parse(localStorage.getItem('yaml_note_logs') || '[]');
        const updatedLogs = [...storedLogs, ...events.filter(e => e.level !== 'debug')]; // debugレベルは保存しない
        
        // サイズ制限（例: 最新500件のみ保持）
        const trimmedLogs = updatedLogs.slice(-500);
        
        localStorage.setItem('yaml_note_logs', JSON.stringify(trimmedLogs));
        clearEvents(); // メモリ内のログをクリア
      }
    }, 60000); // 1分ごと
    
    return () => clearInterval(saveInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);
  
  // コンテキスト値の作成
  const contextValue: LoggerContextType = {
    log: logEvent,
    events,
    clearEvents,
    sessionId,
    exportLogs
  };
  
  return (
    <LoggerContext.Provider value={contextValue}>
      {children}
    </LoggerContext.Provider>
  );
};