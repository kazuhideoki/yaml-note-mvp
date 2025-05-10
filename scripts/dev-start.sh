#!/bin/bash
set -e

echo "Starting development environment..."

# WASMモジュールをビルド
echo "Building WASM module..."
cd "$(dirname "$0")/.."
(cd packages/core-wasm && ./build.sh)

# Webアプリを起動
echo "Starting web app..."
pnpm dev