/**
 * @file useFileAccess.test.tsx
 * @description useFileAccessフックのテスト
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useFileAccess } from '../useFileAccess';
import { LoggerProvider } from '../../contexts/LoggerProvider';
import React from 'react';
import { vi, describe, test, expect, beforeAll, beforeEach } from 'vitest';

// グローバルモックを定義するが、テスト内で上書きするためにここではPromiseを返さない
const mockShowOpenFilePicker = vi.fn();
const mockShowSaveFilePicker = vi.fn();

// ラッパーコンポーネント
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LoggerProvider>{children}</LoggerProvider>
);

describe('useFileAccess', () => {
  beforeAll(() => {
    // File System Access API モックをグローバルウィンドウオブジェクトに追加
    Object.defineProperty(window, 'showOpenFilePicker', {
      writable: true,
      value: mockShowOpenFilePicker,
    });

    Object.defineProperty(window, 'showSaveFilePicker', {
      writable: true,
      value: mockShowSaveFilePicker,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('初期状態が正しく設定されている', () => {
    const { result } = renderHook(() => useFileAccess(), { wrapper });

    expect(result.current.markdownFile.handle).toBeNull();
    expect(result.current.markdownFile.path).toBe('');
    expect(result.current.markdownFile.name).toBe('');
    expect(result.current.markdownFile.content).toBe('');
    expect(result.current.markdownFile.dirty).toBe(false);

    expect(result.current.schemaFile.handle).toBeNull();
    expect(result.current.schemaFile.path).toBe('');
    expect(result.current.schemaFile.name).toBe('');
    expect(result.current.schemaFile.content).toBe('');
    expect(result.current.schemaFile.dirty).toBe(false);
  });

  test('updateContent メソッドで dirty 状態が正しく設定される', () => {
    const { result } = renderHook(() => useFileAccess(), { wrapper });

    act(() => {
      result.current.updateContent('markdown', 'new content');
    });

    expect(result.current.isDirty('markdown')).toBe(true);
    expect(result.current.isDirty('schema')).toBe(false);
  });

  test('resetDirty メソッドが dirty 状態をリセットする', () => {
    const { result } = renderHook(() => useFileAccess(), { wrapper });

    // dirty状態にする
    act(() => {
      result.current.updateContent('markdown', 'new content');
    });

    expect(result.current.isDirty('markdown')).toBe(true);

    // リセットする
    act(() => {
      result.current.resetDirty('markdown');
    });

    expect(result.current.isDirty('markdown')).toBe(false);
  });
});
