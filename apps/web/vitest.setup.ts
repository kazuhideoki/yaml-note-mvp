import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// テスト後に自動的にクリーンアップを実行
afterEach(() => {
  cleanup();
});

// React 18用の設定
// createRootのモックを作成し、警告を抑制
vi.mock('react-dom/client', async () => {
  const actual = await vi.importActual('react-dom/client');
  return {
    ...actual,
    createRoot: vi.fn().mockImplementation((container) => {
      return {
        render: (element) => {
          const root = document.createElement('div');
          container.appendChild(root);
          root.innerHTML = '';
          root.appendChild(element);
        },
        unmount: vi.fn(),
      };
    }),
  };
});

// ReactDOM.renderの警告を抑制
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    render: vi.fn(),
  };
});