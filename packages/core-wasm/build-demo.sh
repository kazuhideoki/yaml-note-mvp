#!/bin/bash
set -e

# packages/core-wasm ディレクトリで実行するスクリプト
echo "=== Building core-wasm package for Node.js ==="

# パッケージを指定してビルド
cd "$(dirname "$0")"
cargo build -p core-wasm --release

# wasm-pack を使用してNodeJS向けにビルド
echo "Running wasm-pack build..."
wasm-pack build --target nodejs --out-dir pkg

# デモスクリプトを実行
echo -e "\n=== Running demo script ==="
node demo.mjs