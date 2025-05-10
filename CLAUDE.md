# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YAML Note MVP is a browser-based note-taking application that uses YAML as its primary format. The application features a React-based web interface with real-time validation of YAML notes against JSON Schema definitions, and provides both raw YAML editing and Markdown preview capabilities.

The project uses a monorepo structure with Rust (compiled to WebAssembly) for core YAML validation functions, and React/TypeScript for the web interface. The application is designed to provide immediate error feedback while editing YAML notes.

## Key Architecture Components

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

## Common Commands

### Setup and Installation

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

### Testing and Validation

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

## Development Workflow

1. **WASM Module Changes**:
   - Edit files in `packages/core-wasm/src/`
   - Run `./build.sh` from within the core-wasm directory to rebuild
   - The built package will be available in `packages/core-wasm/pkg/`

2. **Web Application Changes**:
   - Edit files in `apps/web/src/`
   - The development server will automatically reload on changes

3. **Schema Changes**:
   - Edit schema files in `packages/schemas/`
   - Validate sample files with `pnpm validate-schema`

## Implementation Status

The project follows a phased implementation approach:

- Phase 0: ✅ Project structure setup (completed)
- Phase 1: ✅ Core WASM implementation (completed)
- Phase 2: ✅ Raw YAML editor implementation (completed)
- Phase 3: ✅ Real-time validation (completed)
- Phase 4: ✅ Markdown preview (completed)
- Phase 5: ✅ UX logging foundation (completed)

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, CodeMirror
- **Core Logic**: Rust (compiled to WASM), serde_yaml, jsonschema-valid
- **Build Tools**: pnpm, wasm-pack, Vite
- **Future Plans**: Migration to Tauri for native capabilities