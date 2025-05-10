import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// テスト後に自動的にクリーンアップを実行
afterEach(() => {
  cleanup();
});