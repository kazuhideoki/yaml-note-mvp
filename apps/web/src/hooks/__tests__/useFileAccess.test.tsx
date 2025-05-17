/**
 * @file useFileAccess.test.tsx
 * @description useFileAccessフックのテスト
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useFileAccess } from '../useFileAccess';
import { LoggerProvider } from '../../contexts/LoggerContext';
import React from 'react';
import { vi, describe, test, expect, beforeAll, beforeEach } from 'vitest';

// File System Access API のモック
const mockFileHandle = {
  kind: 'file',
  name: 'test.md',
  getFile: vi.fn().mockResolvedValue({
    name: 'test.md',
    text: vi.fn().mockResolvedValue('test content')
  }),
  createWritable: vi.fn().mockResolvedValue({
    write: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined)
  }),
  queryPermission: vi.fn().mockResolvedValue('granted'),
  requestPermission: vi.fn().mockResolvedValue('granted')
};

const mockShowOpenFilePicker = vi.fn().mockResolvedValue([mockFileHandle]);
const mockShowSaveFilePicker = vi.fn().mockResolvedValue(mockFileHandle);

// ラッパーコンポーネント
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LoggerProvider>{children}</LoggerProvider>
);

describe('useFileAccess', () => {
  beforeAll(() => {
    // File System Access API モックをグローバルウィンドウオブジェクトに追加
    Object.defineProperty(window, 'showOpenFilePicker', {
      writable: true,
      value: mockShowOpenFilePicker
    });

    Object.defineProperty(window, 'showSaveFilePicker', {
      writable: true,
      value: mockShowSaveFilePicker
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

  test('openFile メソッドがファイルを正しく開く', async () => {
    const { result } = renderHook(() => useFileAccess(), { wrapper });

    let success: boolean = false;
    await act(async () => {
      success = await result.current.openFile('markdown');
    });

    expect(success).toBe(true);
    expect(mockShowOpenFilePicker).toHaveBeenCalled();
    expect(result.current.markdownFile.name).toBe('test.md');
    expect(result.current.markdownFile.dirty).toBe(false);
  });

  test('saveFile メソッドが新しいファイルの場合 saveFileAs を呼び出す', async () => {
    const { result } = renderHook(() => useFileAccess(), { wrapper });

    const saveFileAsSpy = vi.spyOn(result.current, 'saveFileAs');
    let success: boolean = false;

    await act(async () => {
      success = await result.current.saveFile('markdown', 'new content');
    });

    expect(success).toBe(true);
    expect(saveFileAsSpy).toHaveBeenCalledWith('markdown', 'new content');
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