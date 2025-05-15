import { renderHook, act } from '@testing-library/react';
import { useValidator } from '../useValidator';
import { useYamlCore } from '../useYamlCore';
import * as schemaUtils from '../../utils/schema';
import { vi, describe, expect, beforeEach, afterEach, test } from 'vitest';

// モックの設定
vi.mock('../useYamlCore', () => ({
  useYamlCore: vi.fn(),
}));

vi.mock('../../utils/schema', () => ({
  fetchSchema: vi.fn(),
}));

vi.mock('../useLogger', () => ({
  default: () => ({
    log: vi.fn(),
  }),
}));

describe('useValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('WASMがロードされていない場合は空の配列を返す', async () => {
    // WASMがロードされていない状態をモック
    (useYamlCore as any).mockReturnValue({
      wasmLoaded: false,
      validateFrontmatter: vi.fn(),
      markdownToYaml: vi.fn(),
      validateYamlWithSchema: vi.fn(),
    });

    const { result } = renderHook(() => useValidator('# test'));

    expect(result.current.errors).toEqual([]);
    expect(result.current.isValidating).toBe(false);
  });

  test('空の入力の場合は空の配列を返す', async () => {
    (useYamlCore as any).mockReturnValue({
      wasmLoaded: true,
      validateFrontmatter: vi.fn(),
      markdownToYaml: vi.fn(),
      validateYamlWithSchema: vi.fn(),
    });

    const { result } = renderHook(() => useValidator(''));

    expect(result.current.errors).toEqual([]);
    expect(result.current.isValidating).toBe(false);
  });

  test('有効なフロントマターの場合、空のエラー配列を返す', async () => {
    const validateFrontmatterMock = vi.fn().mockResolvedValue([]);
    (useYamlCore as any).mockReturnValue({
      wasmLoaded: true,
      validateFrontmatter: validateFrontmatterMock,
      markdownToYaml: vi.fn(),
      validateYamlWithSchema: vi.fn(),
    });

    const validMarkdown = `---
schema_path: ./test.yaml
validated: true
---
# タイトル`;

    const { result } = renderHook(() => useValidator(validMarkdown));

    // デバウンス処理を待つ
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // 非同期処理の結果を待つ
    await Promise.resolve();

    expect(validateFrontmatterMock).toHaveBeenCalledWith(validMarkdown);
    expect(result.current.errors).toEqual([]);
  });

  test('不正なフロントマターの場合、エラー配列を返す', async () => {
    const mockErrors = [
      {
        line: 2,
        message: 'Frontmatter validation error: Invalid schema_path',
        path: 'schema_path',
      },
    ];

    const validateFrontmatterMock = vi.fn().mockResolvedValue(mockErrors);
    (useYamlCore as any).mockReturnValue({
      wasmLoaded: true,
      validateFrontmatter: validateFrontmatterMock,
      markdownToYaml: vi.fn(),
      validateYamlWithSchema: vi.fn(),
    });

    const invalidMarkdown = `---
schema_path:
validated: invalid
---
# タイトル`;

    const { result } = renderHook(() => useValidator(invalidMarkdown));

    // デバウンス処理を待つ
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // 非同期処理の結果を待つ
    await Promise.resolve();

    expect(validateFrontmatterMock).toHaveBeenCalledWith(invalidMarkdown);
    expect(result.current.errors).toEqual(mockErrors);
  });

  test('バリデーション中はisValidatingがtrueになる', async () => {
    // 実行を遅延させる検証関数
    const validateFrontmatterMock = vi.fn().mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve([]), 100);
      });
    });

    (useYamlCore as any).mockReturnValue({
      wasmLoaded: true,
      validateFrontmatter: validateFrontmatterMock,
      markdownToYaml: vi.fn(),
      validateYamlWithSchema: vi.fn(),
    });

    const { result } = renderHook(() => useValidator('# test'));

    // デバウンス処理を進める
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // 検証中フラグを確認
    expect(result.current.isValidating).toBe(true);

    // 検証完了まで時間を進める
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // 非同期処理の結果を待つ
    await Promise.resolve();

    expect(result.current.isValidating).toBe(false);
  });

  test('エラーが発生した場合も適切に処理される', async () => {
    const error = new Error('検証エラー');
    const validateFrontmatterMock = vi.fn().mockRejectedValue(error);

    (useYamlCore as any).mockReturnValue({
      wasmLoaded: true,
      validateFrontmatter: validateFrontmatterMock,
      markdownToYaml: vi.fn(),
      validateYamlWithSchema: vi.fn(),
    });

    const { result } = renderHook(() => useValidator('# test'));

    // デバウンス処理を待つ
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // 非同期処理の結果を待つ
    await Promise.resolve();

    expect(result.current.errors.length).toBe(1);
    expect(result.current.errors[0].message).toContain('検証エラー');
    expect(result.current.isValidating).toBe(false);
  });

  // S3フェーズ：スキーマ検証のテストケース追加
  test('スキーマ検証エラーが正しく検出される', async () => {
    // モックの準備
    const validateFrontmatterMock = vi.fn().mockResolvedValue([]); // フロントマターは正常
    const markdownToYamlMock = vi.fn().mockResolvedValue('title: "Test"\ncontent: "Test content"');
    const validateYamlWithSchemaMock = vi.fn().mockResolvedValue([
      {
        line: 2,
        message: 'スキーマ検証エラー: 必須フィールド "description" がありません',
        path: '',
      },
    ]);
    const fetchSchemaMock = vi.fn().mockResolvedValue('schema content');

    (useYamlCore as any).mockReturnValue({
      wasmLoaded: true,
      validateFrontmatter: validateFrontmatterMock,
      markdownToYaml: markdownToYamlMock,
      validateYamlWithSchema: validateYamlWithSchemaMock,
    });

    (schemaUtils.fetchSchema as any).mockImplementation(fetchSchemaMock);

    const markdown = `---
schema_path: /schemas/test.yaml
validated: true
---

# Test Title

## Section 1
This is a test content`;

    const { result } = renderHook(() => useValidator(markdown));

    // デバウンス処理を待つ
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // 非同期処理の結果を待つ
    await Promise.resolve();

    expect(validateFrontmatterMock).toHaveBeenCalledWith(markdown);
    expect(fetchSchemaMock).toHaveBeenCalledWith('/schemas/test.yaml');
    expect(markdownToYamlMock).toHaveBeenCalledWith(markdown);
    expect(validateYamlWithSchemaMock).toHaveBeenCalledWith(
      'title: "Test"\ncontent: "Test content"',
      'schema content'
    );

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toContain('スキーマ検証エラー');
    expect(result.current.schemaPath).toBe('/schemas/test.yaml');
    expect(result.current.validated).toBe(true);
  });

  test('validated: false の場合はスキーマ検証をスキップする', async () => {
    // モックの準備
    const validateFrontmatterMock = vi.fn().mockResolvedValue([]);
    const markdownToYamlMock = vi.fn();
    const validateYamlWithSchemaMock = vi.fn();
    const fetchSchemaMock = vi.fn();

    (useYamlCore as any).mockReturnValue({
      wasmLoaded: true,
      validateFrontmatter: validateFrontmatterMock,
      markdownToYaml: markdownToYamlMock,
      validateYamlWithSchema: validateYamlWithSchemaMock,
    });

    (schemaUtils.fetchSchema as any).mockImplementation(fetchSchemaMock);

    const markdown = `---
schema_path: /schemas/test.yaml
validated: false
---

# Test Title`;

    const { result } = renderHook(() => useValidator(markdown));

    // デバウンス処理を待つ
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // 非同期処理の結果を待つ
    await Promise.resolve();

    expect(validateFrontmatterMock).toHaveBeenCalledWith(markdown);
    expect(fetchSchemaMock).not.toHaveBeenCalled();
    expect(markdownToYamlMock).not.toHaveBeenCalled();
    expect(validateYamlWithSchemaMock).not.toHaveBeenCalled();

    expect(result.current.schemaPath).toBe('/schemas/test.yaml');
    expect(result.current.validated).toBe(false);
  });

  test('スキーマ取得エラー時は適切にエラーを表示する', async () => {
    // モックの準備
    const validateFrontmatterMock = vi.fn().mockResolvedValue([]);
    const fetchSchemaMock = vi
      .fn()
      .mockRejectedValue(new Error('スキーマファイルが見つかりません'));

    (useYamlCore as any).mockReturnValue({
      wasmLoaded: true,
      validateFrontmatter: validateFrontmatterMock,
      markdownToYaml: vi.fn(),
      validateYamlWithSchema: vi.fn(),
    });

    (schemaUtils.fetchSchema as any).mockImplementation(fetchSchemaMock);

    const markdown = `---
schema_path: /invalid/schema.yaml
validated: true
---

# Test Title`;

    const { result } = renderHook(() => useValidator(markdown));

    // デバウンス処理を待つ
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // 非同期処理の結果を待つ
    await Promise.resolve();

    expect(validateFrontmatterMock).toHaveBeenCalledWith(markdown);
    expect(fetchSchemaMock).toHaveBeenCalledWith('/invalid/schema.yaml');

    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].message).toContain('スキーマ検証エラー');
    expect(result.current.errors[0].message).toContain('スキーマファイルが見つかりません');
  });

  test('clearErrorsは正しくエラーをクリアする', async () => {
    // 最初にエラーがある状態を設定
    const validateFrontmatterMock = vi
      .fn()
      .mockResolvedValue([{ line: 1, message: 'テストエラー', path: '' }]);

    (useYamlCore as any).mockReturnValue({
      wasmLoaded: true,
      validateFrontmatter: validateFrontmatterMock,
      markdownToYaml: vi.fn(),
      validateYamlWithSchema: vi.fn(),
    });

    const { result } = renderHook(() => useValidator('# test'));

    // デバウンス処理を待つ
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // 非同期処理の結果を待つ
    await Promise.resolve();

    // エラーが設定されていることを確認
    expect(result.current.errors.length).toBe(1);

    // clearErrorsを呼び出す
    act(() => {
      result.current.clearErrors();
    });

    // エラーがクリアされていることを確認
    expect(result.current.errors).toEqual([]);
  });
});
