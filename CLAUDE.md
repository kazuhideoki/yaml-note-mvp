# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YAML Note MVP is a browser-based note-taking application that uses YAML as its primary format. The application features a React-based web interface with real-time validation of YAML notes against JSON Schema definitions, and provides both raw YAML editing and Markdown preview capabilities.

The project uses a monorepo structure with Rust (compiled to WebAssembly) for core YAML validation functions, and React/TypeScript for the web interface. The application is designed to provide immediate error feedback while editing YAML notes.

## Key Files and Components

### Web App Structure

- `apps/web/src/App.tsx` - Main application component
- `apps/web/src/components/` - UI components
  - `MarkdownEditor.tsx` - Markdown preview component
  - `SchemaEditor.tsx` - YAML editor component with schema validation
  - `ValidationBanner.tsx` - Component for displaying validation errors
  - `EditorTabs.tsx` - Tab interface for switching between editor views
  - `ValidationToggle.tsx` - Toggle control for enabling/disabling validation
  - `ErrorBadge.tsx` - Component for displaying error indicators
- `apps/web/src/hooks/` - React hooks
  - `useValidator.ts` - Hook for YAML validation logic
  - `useFileAccess.ts` - Hook for file system access
  - `useLogger.ts` - Hook for accessing the logging system
  - `useYamlCore.ts` - Hook for interfacing with the WASM module
- `apps/web/src/contexts/` - React contexts
  - `LoggerContext.tsx` - Context for centralized logging

## Key Architecture Components

1. **Web App (React/TypeScript)**:

   - UI with multiple views: Raw YAML editor, error display, and Markdown preview
   - Editor tabs for switching between different edit modes
   - Built with React, Vite, and Tailwind CSS
   - Uses CodeMirror for YAML editing
   - Comprehensive logging system with LoggerContext for tracking application events

2. **Core WASM (Rust)**:

   - Handles YAML parsing, validation, and processing
   - Compiled to WebAssembly for browser integration
   - Provides sub-millisecond validation performance

3. **Schema Definitions**:

   - JSON Schema files (in YAML format) are located under `apps/web/public/schemas/`
   - Schema evolution is tracked via version control

4. **Logging System**:

   - Centralized logging through the LoggerContext provider
   - Structured logging with LogAction union type for type-safe log entries
   - Component-level logging via useLogger hook
   - Consistent log format for debugging and tracking user actions

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

**After completing each task, make sure to run the appropriate command(s) listed below.**

```bash
# Run all tests
pnpm test

# Run type checking
pnpm typecheck

# Run linters
pnpm lint

# Run formatting checks
pnpm format

# Run Rust tests for core-wasm
cargo test -p core-wasm

# Run lintering and formatting checks
cargo clippy -- -D warnings
```

## Development Workflow

- **Required Rule**:
  After any work (such as code modifications, additions, or refactoring), you must run the tests (`pnpm test` and, for Rust, `cargo test -p core-wasm`) and confirm that all tests pass.
  If any tests fail, fix the issues before completing your work.

1. **WASM Module Changes**:

   - Edit files in `packages/core-wasm/src/`
   - Run `./build.sh` from within the core-wasm directory to rebuild
   - The built package will be available in `packages/core-wasm/pkg/`

2. **Web Application Changes**:

   - Edit files in `apps/web/src/`
   - The development server will automatically reload on changes

3. **Schema Changes**:

   - Edit schema files in `apps/web/public/schemas/`

4. **Logging System Usage**:
   - Use the `useLogger()` hook in components to log actions and events
   - Follow the LogAction union type pattern for creating log entries
   - Log important UI interactions, validation events, and file operations

## Commenting Policy & Style Guide (TypeScript / Rust)

This project requires all developers and code agents to write comments that make the intent, design, and usage of the code easy to understand. Please follow the guidelines below.

### General Principles

- **Emphasize "why" and design intent**: Comments should supplement not just what the code does, but why it is written that way, including design decisions and background.
- **Comprehensive API documentation**: All public functions, types, and components must have JSDoc (TS) or Rust doc comments.
- **Consistency & conciseness**: Maintain a consistent comment style and level of detail throughout the codebase. Be concise and accurate.
- **Explicit TODO/FIXME**: Mark unimplemented features or known issues with `TODO:` or `FIXME:`.

---

### TypeScript (including React)

- Use **JSDoc format** for functions, types, components, and custom hooks.
- JSDoc at the top of files and for type definitions is also recommended.
- Comments must be written in Japanese.
- **複雑なロジックや副作用にはインラインコメント**（`//`、日本語可）も活用。

---

### Rust

- **Add doc comments (`///` or `//!`) to all public functions, types, and modules.**
- Document arguments, return values, errors, and usage examples.
- Comments must be written in Japanese.

- **構造体・enumの各フィールドにもコメント**を推奨（日本語可）。
- **複雑なアルゴリズムやunsafeブロックにはインラインコメント**（`//`、日本語可）で補足。

---

### Reference

- Always update comments when code changes.
- For more detailed guidelines and templates, see `add-comment-spec.md`.

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, CodeMirror
- **Core Logic**: Rust (compiled to WASM), serde_yaml, jsonschema-valid
- **Build Tools**: pnpm, wasm-pack, Vite
- **Future Plans**: Migration to Tauri for native capabilities
