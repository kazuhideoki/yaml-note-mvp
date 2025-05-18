import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MarkdownEditor from '../MarkdownEditor';
import { LoggerProvider } from '../../contexts/LoggerProvider';
import * as yamlCore from '../../hooks/useYamlCore';
import { ErrorCode } from '../../hooks/validation-error.type';
import { vi, beforeEach, describe, test, expect } from 'vitest';

// YamlCoreモックの設定
vi.mock('../../hooks/useYamlCore', () => ({
  useYamlCore: vi.fn(),
}));

// CodeMirrorのモック
vi.mock('@uiw/react-codemirror', () => {
  return {
    default: ({ onChange, value }: { onChange: (value: string) => void; value: string }) => {
      return (
        <textarea
          data-testid="codemirror-mock"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      );
    },
  };
});

describe('MarkdownEditor', () => {
  beforeEach(() => {
    // モックの初期設定
    (yamlCore.useYamlCore as jest.Mock).mockReturnValue({
      wasmLoaded: true,
      wasmLoading: false,
      error: null,
      validateFrontmatter: vi.fn().mockResolvedValue([]),
    });
  });

  test('正常なマークダウンの場合、エラーバッジが表示されない', async () => {
    render(
      <LoggerProvider>
        <MarkdownEditor initialContent="" onChange={vi.fn()} onSave={vi.fn()} />
      </LoggerProvider>
    );

    // ファイルドロップをシミュレート
    const validMarkdown = `---
schema_path: ./test.yaml
validated: true
---
# タイトル`;

    const file = new File([validMarkdown], 'test.md', {
      type: 'text/markdown',
    });
    const dataTransfer = {
      files: [file],
      dropEffect: '',
      types: ['Files'],
      items: [{}],
      setData: vi.fn(),
      getData: vi.fn(),
      clearData: vi.fn(),
    };

    // ドロップエリアを取得
    const dropArea = screen.getByText(/ドラッグ＆ドロップ/);

    // ドロップイベントを発火
    fireEvent.drop(dropArea, { dataTransfer });

    // エラーバッジが表示されないことを確認
    await waitFor(() => {
      expect(screen.queryByText(/バリデーションエラー/)).not.toBeInTheDocument();
    });
  });

  test('不正なフロントマターの場合、エラーバッジが表示される', async () => {
    // フロントマターエラーを返すモック
    (yamlCore.useYamlCore as jest.Mock).mockReturnValue({
      wasmLoaded: true,
      wasmLoading: false,
      error: null,
      validateFrontmatter: vi.fn().mockResolvedValue([
        {
          line: 2,
          message: 'Frontmatter validation error: Invalid schema_path',
          path: 'schema_path',
        },
      ]),
    });

    render(
      <LoggerProvider>
        <MarkdownEditor
          initialContent=""
          onChange={vi.fn()}
          onSave={vi.fn()}
          validationErrors={[
            {
              line: 2,
              message: 'Frontmatter validation error: Invalid schema_path',
              path: 'schema_path',
              code: ErrorCode.FrontmatterValidation,
            },
          ]}
        />
      </LoggerProvider>
    );

    // ファイルドロップをシミュレート
    const invalidMarkdown = `---
schema_path:
validated: invalid
---
# タイトル`;

    const file = new File([invalidMarkdown], 'invalid.md', {
      type: 'text/markdown',
    });
    const dataTransfer = {
      files: [file],
      dropEffect: '',
      types: ['Files'],
      items: [{}],
      setData: vi.fn(),
      getData: vi.fn(),
      clearData: vi.fn(),
    };

    // ドロップエリアを取得
    const dropArea = screen.getByText(/ドラッグ＆ドロップ/);

    // ドロップイベントを発火
    fireEvent.drop(dropArea, { dataTransfer });

    // We need to wait for the content to be set and validationErrors to be displayed
    await waitFor(() => {
      expect(screen.getByText('バリデーションエラー (1)')).toBeInTheDocument();
    });
  });

  test('ファイル以外をドロップした場合は何も起こらない', async () => {
    render(
      <LoggerProvider>
        <MarkdownEditor initialContent="" onChange={vi.fn()} onSave={vi.fn()} />
      </LoggerProvider>
    );

    // 空のdataTransferでドロップ
    const dataTransfer = {
      files: [],
      dropEffect: '',
      types: ['text/plain'],
      items: [{}],
      setData: vi.fn(),
      getData: vi.fn(() => 'テキスト'),
      clearData: vi.fn(),
    };

    // ドロップエリアを取得
    const dropArea = screen.getByText(/ドラッグ＆ドロップ/);

    // ドロップイベントを発火
    fireEvent.drop(dropArea, { dataTransfer });

    // エディタが表示されないことを確認
    await waitFor(() => {
      expect(screen.queryByTestId('codemirror-mock')).not.toBeInTheDocument();
    });
  });

  test('WASMが未ロード状態でもエディタは使用可能', async () => {
    // WASMが未ロード状態を模擬
    (yamlCore.useYamlCore as jest.Mock).mockReturnValue({
      wasmLoaded: false,
      wasmLoading: true,
      error: null,
      validateFrontmatter: vi.fn().mockResolvedValue([]),
    });

    render(
      <LoggerProvider>
        <MarkdownEditor initialContent="" onChange={vi.fn()} onSave={vi.fn()} />
      </LoggerProvider>
    );

    // ファイルドロップをシミュレート
    const markdown = `# テスト`;

    const file = new File([markdown], 'test.md', { type: 'text/markdown' });
    const dataTransfer = {
      files: [file],
      dropEffect: '',
      types: ['Files'],
      items: [{}],
      setData: vi.fn(),
      getData: vi.fn(),
      clearData: vi.fn(),
    };

    // ドロップエリアを取得
    const dropArea = screen.getByText(/ドラッグ＆ドロップ/);

    // ドロップイベントを発火
    fireEvent.drop(dropArea, { dataTransfer });

    // エディタが表示されることを確認
    await waitFor(() => {
      expect(screen.getByTestId('codemirror-mock')).toBeInTheDocument();
    });
  });
});
