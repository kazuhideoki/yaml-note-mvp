#!/usr/bin/env bash
set -euo pipefail

# Node.js / pnpm はコンテナ標準インストール想定。
corepack enable
corepack prepare pnpm@8.10.5 --activate

# Rust（stable）+ wasm32 ターゲット
curl https://sh.rustup.rs -sSf | bash -s -- -y
source "$HOME/.cargo/env"
rustup target add wasm32-unknown-unknown
cargo install wasm-pack --locked

# プロジェクト依存
pnpm install --frozen-lockfile
# Rust クレートの事前フェッチでオフライン対応
cargo fetch -p core-wasm