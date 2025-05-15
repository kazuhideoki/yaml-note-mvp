import { renderHook, act } from '@testing-library/react-hooks';
import { LoggerProvider } from '../../contexts/LoggerContext';
import { useLogger } from '../useLogger';
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ローカルストレージのモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => {
      return store[key] || null;
    }),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// グローバルオブジェクトにローカルストレージモックを設定
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should record log events', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LoggerProvider>{children}</LoggerProvider>
    );

    const { result } = renderHook(() => useLogger(), { wrapper });

    act(() => {
      result.current.log('info', 'test_action', { test: true });
    });

    const userEvents = result.current.events.filter(e => e.action !== 'session_start');
    expect(userEvents).toHaveLength(1);
    expect(userEvents[0]).toMatchObject({
      level: 'info',
      action: 'test_action',
      details: { test: true },
    });
  });

  it('should generate consistent session ID', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LoggerProvider>{children}</LoggerProvider>
    );

    const { result, rerender } = renderHook(() => useLogger(), { wrapper });

    const initialSessionId = result.current.sessionId;
    expect(initialSessionId).toBeTruthy();

    rerender();

    expect(result.current.sessionId).toBe(initialSessionId);
  });

  it('should clear events on demand', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LoggerProvider>{children}</LoggerProvider>
    );

    const { result } = renderHook(() => useLogger(), { wrapper });

    act(() => {
      result.current.log('info', 'test1');
      result.current.log('info', 'test2');
    });

    const userEvents = result.current.events.filter(e => e.action !== 'session_start');
    expect(userEvents).toHaveLength(2);

    act(() => {
      result.current.clearEvents();
    });

    // session_startは残る可能性があるため、userEventsで判定
    const afterClearEvents = result.current.events.filter(e => e.action !== 'session_start');
    expect(afterClearEvents).toHaveLength(0);
  });

  it('should save logs to localStorage periodically', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LoggerProvider>{children}</LoggerProvider>
    );

    const { result } = renderHook(() => useLogger(), { wrapper });

    act(() => {
      result.current.log('info', 'test_action');
      result.current.log('debug', 'debug_action'); // debugは保存されないはず
    });

    // 1分経過をシミュレート
    vi.advanceTimersByTime(60000);

    expect(localStorageMock.setItem).toHaveBeenCalled();
    // session_startは残る可能性があるため、userEventsで判定
    const afterSaveEvents = result.current.events.filter(e => e.action !== 'session_start');
    expect(afterSaveEvents).toHaveLength(0); // ユーザーログはクリアされる

    // localStorage呼び出し引数の確認
    const setItemCalls = localStorageMock.setItem.mock.calls;
    expect(setItemCalls[0][0]).toBe('yaml_note_logs');

    // 保存されたデータにdebugログやsession_startログが含まれていないこと
    const savedData = JSON.parse(setItemCalls[0][1]);
    const userSavedData = savedData.filter((log: any) => log.action !== 'session_start');
    expect(userSavedData.length).toBe(1);
    expect(userSavedData[0].action).toBe('test_action');
    expect(userSavedData.filter((log: any) => log.level === 'debug').length).toBe(0);
  });

  it('should export logs correctly', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LoggerProvider>{children}</LoggerProvider>
    );

    // ローカルストレージにログを追加
    localStorageMock.setItem(
      'yaml_note_logs',
      JSON.stringify([{ level: 'info', action: 'previous', timestamp: 1000, sessionId: 'test' }])
    );

    const { result } = renderHook(() => useLogger(), { wrapper });

    act(() => {
      result.current.log('info', 'current', { data: 'test' });
    });

    // エクスポート
    let exportedLogs: any;
    act(() => {
      exportedLogs = JSON.parse(result.current.exportLogs());
    });

    // session_startログを除外して検証
    const userExportedLogs = exportedLogs.filter((log: any) => log.action !== 'session_start');
    // 過去のログと現在のログが含まれているか
    expect(userExportedLogs.length).toBe(2);
    expect(userExportedLogs[0].action).toBe('previous');
    expect(userExportedLogs[1].action).toBe('current');
  });
});
