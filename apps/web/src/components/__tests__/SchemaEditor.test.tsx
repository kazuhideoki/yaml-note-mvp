import { render, screen, fireEvent, act } from '@testing-library/react';
import { SchemaEditor } from '../SchemaEditor';
import { vi } from 'vitest';

// モックの作成
vi.mock('../../hooks/useYamlCore', () => ({
  useYamlCore: () => ({
    compileSchema: vi.fn().mockResolvedValue([])
  })
}));

vi.mock('../../hooks/useLogger', () => ({
  default: () => ({
    log: vi.fn()
  })
}));

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
    
    expect(screen.getByText(schemaPath)).toBeInTheDocument();
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