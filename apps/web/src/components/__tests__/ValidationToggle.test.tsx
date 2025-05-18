import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationToggle } from '../ValidationToggle';
import { LoggerProvider } from '../../contexts/LoggerProvider';
import { describe, test, expect, vi, beforeEach } from 'vitest';

describe('ValidationToggle', () => {
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    mockOnToggle.mockClear();
  });

  test('正しく初期状態が表示される（有効）', () => {
    render(
      <LoggerProvider>
        <ValidationToggle isValidated={true} onToggle={mockOnToggle} />
      </LoggerProvider>
    );

    // スイッチがオン状態であることを確認
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  test('正しく初期状態が表示される（無効）', () => {
    render(
      <LoggerProvider>
        <ValidationToggle isValidated={false} onToggle={mockOnToggle} />
      </LoggerProvider>
    );

    // スイッチがオフ状態であることを確認
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  test('クリックでトグルが呼ばれる', () => {
    render(
      <LoggerProvider>
        <ValidationToggle isValidated={true} onToggle={mockOnToggle} />
      </LoggerProvider>
    );

    // トグルをクリック
    fireEvent.click(screen.getByRole('switch'));

    // コールバックが呼ばれることを確認
    expect(mockOnToggle).toHaveBeenCalledWith(false);
  });

  test('無効状態のとき操作できない', () => {
    render(
      <LoggerProvider>
        <ValidationToggle isValidated={true} onToggle={mockOnToggle} isDisabled={true} />
      </LoggerProvider>
    );

    // トグルが無効化されていることを確認
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeDisabled();

    // クリックしてもコールバックが呼ばれないことを確認
    fireEvent.click(toggle);
    expect(mockOnToggle).not.toHaveBeenCalled();
  });
});