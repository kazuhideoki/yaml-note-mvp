import { renderHook, act } from '@testing-library/react-hooks';
import { useYaml } from '../useYaml';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// CoreWasm モジュールのモック
vi.mock('core-wasm', () => ({
  version: vi.fn().mockReturnValue('0.1.0'),
  validate_yaml: vi.fn().mockImplementation((yaml: string, _schema: string) => {
    // 簡単な検証ロジックのモック
    if (yaml.includes('title:')) {
      return JSON.stringify({ success: true, errors: [] });
    } else {
      return JSON.stringify({
        success: false,
        errors: [
          { line: 1, message: 'required property "title" not found', path: '' }
        ]
      });
    }
  })
}));

// global.fetch のモック
global.fetch = vi.fn().mockImplementation((_url: string) => {
  return Promise.resolve({
    ok: true,
    text: () => Promise.resolve('type: object\nproperties:\n  title:\n    type: string\nrequired:\n  - title')
  });
});

describe('useYaml', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with WASM', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useYaml());
    await waitForNextUpdate();
    expect(result.current.isInitialized).toBe(true);
  });

  it('should validate correct YAML', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useYaml());
    await waitForNextUpdate();

    act(() => {
      result.current.validateYaml('title: Test Note', '/schemas/note.schema.yaml');
    });

    // デバウンスのため少し待つ
    await new Promise(r => setTimeout(r, 50));
    expect(result.current.validationResult.success).toBe(true);
    expect(result.current.validationResult.errors).toHaveLength(0);
  });

  it('should report errors for invalid YAML', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useYaml());
    await waitForNextUpdate();

    act(() => {
      result.current.validateYaml('content: Missing title', '/schemas/note.schema.yaml');
    });

    // デバウンスのため少し待つ
    await new Promise(r => setTimeout(r, 50));
    expect(result.current.validationResult.success).toBe(false);
    expect(result.current.validationResult.errors).toHaveLength(1);
    expect(result.current.validationResult.errors[0].message).toContain('title');
  });
});