import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorBadge from '../ErrorBadge';
import { ValidationError } from '../../hooks/useYaml';
import { LoggerProvider } from '../../contexts/LoggerContext';

describe('ErrorBadge', () => {
  const mockErrors: ValidationError[] = [
    { line: 1, message: 'Test error message 1', path: '/path1' },
    { line: 5, message: 'Test error message 2', path: '/path2' }
  ];

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
});