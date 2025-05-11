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

- JSON Schema files (in YAML format) are located under `apps/web/public/schemas/`
- Schema evolution is tracked via version control

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

```typescript
/**
 * Markdownプレビューコンポーネント
 * @component
 * @param {MarkdownPreviewProps} props - プレビューのプロパティ
 * @param {string} props.content - Markdownとして表示する内容
 * @returns {JSX.Element}
 * @description
 * YAMLノートのcontentフィールドをMarkdownとして安全にプレビュー表示する。
 */
export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => { ... }

/**
 * バリデーションエラー情報
 * @property {number} line - エラー発生行番号
 * @property {string} message - エラーメッセージ
 * @property {string} path - エラー発生箇所のパス
 */
export interface ValidationError { ... }
```

- **型定義やpropsにもJSDoc**を付与し、各プロパティの意味・制約を明記（日本語可）。
- **複雑なロジックや副作用にはインラインコメント**（`//`、日本語可）も活用。

---

### Rust

- **Add doc comments (`///` or `//!`) to all public functions, types, and modules.**
- Document arguments, return values, errors, and usage examples.
- Comments must be written in Japanese.

```rust
//! validate.rs
//!
//! YAMLデータのバリデーション機能を提供。
//! - serde_yaml, serde_jsonによるパース
//! - jsonschema-validによるスキーマ検証

/// YAMLデータを指定スキーマでバリデーションし、結果をJSON文字列で返す
///
/// # 引数
/// * `yaml_str` - バリデーション対象のYAML文字列
/// * `schema_str` - JSON Schema（YAMLまたはJSON形式）
///
/// # 戻り値
/// * バリデーション成功時: `{"success": true, "errors": []}`
/// * バリデーション失敗時: `{"success": false, "errors": [ErrorInfo, ...]}`
///
/// # エラーケース
/// - YAMLパースエラー、スキーマパースエラー時も `success: false` でエラー内容を返す
pub fn validate_yaml(yaml_str: &str, schema_str: &str) -> String { ... }
```

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
