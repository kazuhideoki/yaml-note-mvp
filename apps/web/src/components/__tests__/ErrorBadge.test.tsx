import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorBadge from '../ErrorBadge';
import { ValidationError } from '../../hooks/validation-error.type';
import { LoggerProvider } from '../../contexts/LoggerContext';

describe('ErrorBadge', () => {
  const mockErrors: ValidationError[] = [
    { line: 1, message: 'Test error message 1', path: '/path1' },
    { line: 5, message: 'Test error message 2', path: '/path2' },
  ];

  const frontmatterError: ValidationError = {
    line: 1,
    message: 'フロントマターエラー: 必須フィールドがありません',
    path: 'schema_path',
  };

  const schemaValidationError: ValidationError = {
    line: 5,
    message: 'スキーマ検証エラー: フィールドが必要です',
    path: 'title',
  };

  const schemaStructureError: ValidationError = {
    line: 2,
    message: 'スキーマ構文エラー: 無効なスキーマです',
    path: '',
  };

  it('renders errors correctly', () => {
    render(
      <LoggerProvider>
        <ErrorBadge errors={mockErrors} />
      </LoggerProvider>
    );

    expect(screen.getByText(/バリデーションエラー \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/行 1:/)).toBeInTheDocument();
    expect(screen.getByText(/Test error message 1/)).toBeInTheDocument();
    expect(screen.getByText(/行 5:/)).toBeInTheDocument();
    expect(screen.getByText(/Test error message 2/)).toBeInTheDocument();
  });

  it('renders nothing when no errors', () => {
    const { container } = render(
      <LoggerProvider>
        <ErrorBadge errors={[]} />
      </LoggerProvider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('calls onClick when an error is clicked', () => {
    const mockOnClick = vi.fn();
    render(
      <LoggerProvider>
        <ErrorBadge errors={mockErrors} onClick={mockOnClick} />
      </LoggerProvider>
    );

    const errorItems = screen.getAllByText(/Test error message/);
    fireEvent.click(errorItems[0]);

    expect(mockOnClick).toHaveBeenCalledWith(1);
  });
  
  it('validated=true のとき全種類のエラーを表示する', () => {
    const errors = [frontmatterError, schemaValidationError, schemaStructureError];
    
    render(
      <LoggerProvider>
        <ErrorBadge errors={errors} validated={true} />
      </LoggerProvider>
    );

    // フロントマターエラー、スキーマ検証エラー、スキーマ構文エラーすべてが表示されていることを確認
    expect(screen.getByText(/フロントマターエラー: 必須フィールドがありません/)).toBeInTheDocument();
    expect(screen.getByText(/スキーマ検証エラー: フィールドが必要です/)).toBeInTheDocument();
    expect(screen.getByText(/スキーマ構文エラー: 無効なスキーマです/)).toBeInTheDocument();
  });

  it('validated=false のときスキーマ検証エラーを表示しない', () => {
    const errors = [frontmatterError, schemaValidationError, schemaStructureError];
    
    render(
      <LoggerProvider>
        <ErrorBadge errors={errors} validated={false} />
      </LoggerProvider>
    );

    // フロントマターエラーとスキーマ構文エラーは表示されているが、スキーマ検証エラーは表示されていないことを確認
    expect(screen.getByText(/フロントマターエラー: 必須フィールドがありません/)).toBeInTheDocument();
    expect(screen.queryByText(/スキーマ検証エラー: フィールドが必要です/)).not.toBeInTheDocument();
    expect(screen.getByText(/スキーマ構文エラー: 無効なスキーマです/)).toBeInTheDocument();
  });
});
