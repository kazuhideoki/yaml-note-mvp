import { render, screen, fireEvent, act } from '@testing-library/react';
import { SchemaEditor } from '../SchemaEditor';
import { vi } from 'vitest';

// モックの作成
vi.mock('../../hooks/useYamlCore', () => ({
  useYamlCore: () => ({
    compileSchema: vi.fn().mockResolvedValue([])
  })
}));

vi.mock('../../contexts/LoggerContext', async () => {
  return {
    useLogger: () => ({
      log: vi.fn()
    }),
    LoggerContext: {
      Provider: ({ children }: { children: React.ReactNode }) => children
    }
  };
});

// CodeMirrorのモック
vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange }: any) => (
    <div data-testid="codemirror-mock">
      <textarea
        data-testid="codemirror-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}));

describe('SchemaEditor', () => {
  const onSaveMock = vi.fn();
  const initialSchema = 'type: object\nproperties:\n  name:\n    type: string';
  const schemaPath = '/path/to/schema.yaml';
  
  beforeEach(() => {
    onSaveMock.mockReset();
    vi.clearAllMocks();
    
    // キーボードイベントのモック
    Object.defineProperty(global, 'addEventListener', {
      value: vi.fn(),
      writable: true
    });
    Object.defineProperty(global, 'removeEventListener', {
      value: vi.fn(),
      writable: true
    });
  });

  /**
   * エディタが正しく初期化されるかテストする
   */
  test('initializes with provided schema content', () => {
    render(
      <SchemaEditor 
        schemaPath={schemaPath}
        initialSchema={initialSchema}
        onSave={onSaveMock}
        active={true}
      />
    );
    
    const textarea = screen.getByTestId('codemirror-textarea');
    expect(textarea).toHaveValue(initialSchema);
  });

  /**
   * 保存ボタンが機能するかテストする
   */
  test('save button calls onSave with current content', async () => {
    render(
      <SchemaEditor 
        schemaPath={schemaPath}
        initialSchema={initialSchema}
        onSave={onSaveMock}
        active={true}
      />
    );
    
    const saveButton = screen.getByText('保存');
    await act(async () => {
      fireEvent.click(saveButton);
    });
    
    expect(onSaveMock).toHaveBeenCalledWith(initialSchema);
  });
  
  /**
   * スキーマパスが表示されるかテストする
   */
  test('displays the schema path', () => {
    render(
      <SchemaEditor 
        schemaPath={schemaPath}
        initialSchema={initialSchema}
        onSave={onSaveMock}
        active={true}
      />
    );
    
    expect(screen.getByText(`編集中: ${schemaPath}`)).toBeInTheDocument();
  });
  
  /**
   * アクティブでない場合、エディタが表示されないかテストする
   */
  test('does not render editor when not active', () => {
    render(
      <SchemaEditor 
        schemaPath={schemaPath}
        initialSchema={initialSchema}
        onSave={onSaveMock}
        active={false}
      />
    );
    
    expect(screen.queryByTestId('codemirror-mock')).not.toBeInTheDocument();
  });
});