import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { resolve } from 'path';

// https://vitejs.dev/config/
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
  build: {
    target: 'esnext'
  },
  optimizeDeps: {
    // WASMの依存関係をビルドに含める
    include: ['core-wasm']
  }
});