# YAML Note MVP

A browser-based note-taking application that uses YAML as its primary format, featuring real-time validation against JSON Schema definitions and Markdown preview capabilities.

## Features

- **Raw YAML Editing**: Edit notes in YAML format with syntax highlighting
- **Real-time Validation**: Immediate feedback on YAML syntax and schema errors
- **Markdown Preview**: View rendered content in real-time
- **UX Logging**: Comprehensive user interaction tracking for UX improvements
- **WebAssembly Core**: High-performance validation with Rust-powered WASM

## Project Architecture

1. **Web App (React/TypeScript)**: 
   - UI with three panes: Raw YAML editor, error display, and Markdown preview
   - Built with React, Vite, and Tailwind CSS
   - Uses CodeMirror for YAML editing

2. **Core WASM (Rust)**: 
   - Handles YAML parsing, validation, and processing
   - Compiled to WebAssembly for browser integration
   - Provides sub-millisecond validation performance

3. **Schema Definitions**: 
   - JSON Schema files (in YAML format) that define note structure
   - Version-controlled to track schema evolution

## Getting Started

### Installation

```bash
# Install all dependencies (Node.js and Rust components)
pnpm install
```

### Development

```bash
# Start development server with WASM compilation
./scripts/dev-start.sh

# Start only the web app (without rebuilding WASM)
pnpm dev

# Build the WASM module
cd packages/core-wasm && ./build.sh

# Build the web application
pnpm build
```

### Testing

```bash
# Run all tests
pnpm test

# Run Rust tests for core-wasm
cargo test -p core-wasm

# Validate a YAML note against schema
pnpm validate-schema

# Run type checking
pnpm typecheck

# Run linters
pnpm lint
```

## Implementation Status

The project has completed all planned phases:

- ✅ Phase 0: Project structure setup
- ✅ Phase 1: Core WASM implementation
- ✅ Phase 2: Raw YAML editor implementation
- ✅ Phase 3: Real-time validation
- ✅ Phase 4: Markdown preview
- ✅ Phase 5: UX logging foundation

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, CodeMirror
- **Core Logic**: Rust (compiled to WASM), serde_yaml, jsonschema-valid
- **Build Tools**: pnpm, wasm-pack, Vite
- **Future Plans**: Migration to Tauri for native capabilities