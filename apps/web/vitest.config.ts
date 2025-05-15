import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait()
  ],
  resolve: {
    alias: {
      // コアWASMモジュールを絶対パスで参照できるようにエイリアスを設定
      'core-wasm': resolve(__dirname, '../../packages/core-wasm/pkg/core_wasm')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
    deps: {
      inline: [/^(?!.*node_modules).*$/],
    },
    // core-wasm モジュールをモックに置き換える
    mockReset: true,
    mock: {
      'core-wasm': {
        module: 'src/hooks/__mocks__/core-wasm.ts',
      },
    },
  },
});