import { renderHook, act } from '@testing-library/react-hooks';
import { useValidator } from '../useValidator';
import { useYamlCore } from '../useYamlCore';

// モックの設定
jest.mock('../useYamlCore', () => ({
  useYamlCore: jest.fn()
}));

jest.mock('../useLogger', () => ({
  __esModule: true,
  default: () => ({
    log: jest.fn()
  })
}));

describe('useValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('WASMがロードされていない場合は空の配列を返す', async () => {
    // WASMがロードされていない状態をモック
    (useYamlCore as jest.Mock).mockReturnValue({
      wasmLoaded: false,
      validateFrontmatter: jest.fn()
    });

    const { result } = renderHook(() => useValidator('# test'));

    expect(result.current.errors).toEqual([]);
    expect(result.current.isValidating).toBe(false);
  });

  test('空の入力の場合は空の配列を返す', async () => {
    (useYamlCore as jest.Mock).mockReturnValue({
      wasmLoaded: true,
      validateFrontmatter: jest.fn()
    });

    const { result } = renderHook(() => useValidator(''));

    expect(result.current.errors).toEqual([]);
    expect(result.current.isValidating).toBe(false);
  });

  test('有効なフロントマターの場合、空のエラー配列を返す', async () => {
    const validateFrontmatterMock = jest.fn().mockResolvedValue([]);
    (useYamlCore as jest.Mock).mockReturnValue({
      wasmLoaded: true,
      validateFrontmatter: validateFrontmatterMock
    });

    const validMarkdown = `---
schema_path: ./test.yaml
validated: true
---
# タイトル`;

    const { result } = renderHook(() => useValidator(validMarkdown));

    // デバウンス処理を待つ
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // 非同期処理の結果を待つ
    await Promise.resolve();

    expect(validateFrontmatterMock).toHaveBeenCalledWith(validMarkdown);
    expect(result.current.errors).toEqual([]);
  });

  test('不正なフロントマターの場合、エラー配列を返す', async () => {
    const mockErrors = [
      { line: 2, message: 'Frontmatter validation error: Invalid schema_path', path: 'schema_path' }
    ];
    
    const validateFrontmatterMock = jest.fn().mockResolvedValue(mockErrors);
    (useYamlCore as jest.Mock).mockReturnValue({
      wasmLoaded: true,
      validateFrontmatter: validateFrontmatterMock
    });

    const invalidMarkdown = `---
schema_path:
validated: invalid
---
# タイトル`;

    const { result } = renderHook(() => useValidator(invalidMarkdown));

    // デバウンス処理を待つ
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // 非同期処理の結果を待つ
    await Promise.resolve();

    expect(validateFrontmatterMock).toHaveBeenCalledWith(invalidMarkdown);
    expect(result.current.errors).toEqual(mockErrors);
  });

  test('バリデーション中はisValidatingがtrueになる', async () => {
    // 実行を遅延させる検証関数
    const validateFrontmatterMock = jest.fn().mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve([]), 100);
      });
    });
    
    (useYamlCore as jest.Mock).mockReturnValue({
      wasmLoaded: true,
      validateFrontmatter: validateFrontmatterMock
    });

    const { result } = renderHook(() => useValidator('# test'));

    // デバウンス処理を進める
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // 検証中フラグを確認
    expect(result.current.isValidating).toBe(true);

    // 検証完了まで時間を進める
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // 非同期処理の結果を待つ
    await Promise.resolve();

    expect(result.current.isValidating).toBe(false);
  });

  test('エラーが発生した場合も適切に処理される', async () => {
    const error = new Error('検証エラー');
    const validateFrontmatterMock = jest.fn().mockRejectedValue(error);
    
    (useYamlCore as jest.Mock).mockReturnValue({
      wasmLoaded: true,
      validateFrontmatter: validateFrontmatterMock
    });

    const { result } = renderHook(() => useValidator('# test'));

    // デバウンス処理を待つ
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // 非同期処理の結果を待つ
    await Promise.resolve();

    expect(result.current.errors.length).toBe(1);
    expect(result.current.errors[0].message).toContain('検証エラー');
    expect(result.current.isValidating).toBe(false);
  });
});