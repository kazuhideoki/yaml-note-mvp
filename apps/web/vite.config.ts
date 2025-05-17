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
  server: {
    watch: {
      // node_modules内のWASMパッケージの変更も監視
      ignored: ['!**/node_modules/core-wasm/**'],
    },
    hmr: {
      // HMRを強制的に有効化
      overlay: true,
    },
  },
  optimizeDeps: {
    // WASMの依存関係をキャッシュから除外
    exclude: ['core-wasm'],
  }
});