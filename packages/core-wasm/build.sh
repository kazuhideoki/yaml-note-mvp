#!/bin/bash
set -e

echo "Building core-wasm package..."
wasm-pack build --target bundler

echo "Done. Output in pkg/ directory"