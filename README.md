# YAML Note MVP

A browser-based note-taking application that uses YAML as its primary format, featuring real-time validation against JSON Schema definitions and Markdown preview capabilities.

## Features

- **Raw YAML Editing**: Edit notes in YAML format with syntax highlighting
- **Real-time Validation**: Immediate feedback on YAML syntax and schema errors
- **Validation Toggle**: Enable/disable schema validation with frontmatter settings
- **Markdown Preview**: View rendered content in real-time
- **Multi-tab Interface**: Switch between editor views with tabs
- **UX Logging**: Comprehensive user interaction tracking for UX improvements
- **Error Classification**: Visual distinction between different error types
- **WebAssembly Core**: High-performance validation with Rust-powered WASM

## Project Architecture

1. **Web App (React/TypeScript)**:

   - UI with multiple views: Raw YAML editor, error display, and Markdown preview
   - Editor tabs for switching between different edit modes
   - Built with React, Vite, and Tailwind CSS
   - Uses CodeMirror for YAML editing
   - Comprehensive logging system with LoggerContext

2. **Core WASM (Rust)**:

   - Handles YAML parsing, validation, and processing
   - Compiled to WebAssembly for browser integration
   - Provides sub-millisecond validation performance

3. **Schema Definitions**:
   - JSON Schema files (in YAML format) that define note structure
   - Version-controlled to track schema evolution

4. **Logging System**:
   - Centralized logging through the LoggerContext provider
   - Structured logging with LogAction union type
   - Component-level logging via useLogger hook
   - Analytics for user interactions and performance metrics

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
- ✅ Phase 6: Validation toggle and UX refinements

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, CodeMirror
- **Core Logic**: Rust (compiled to WASM), serde_yaml, jsonschema-valid
- **Build Tools**: pnpm, wasm-pack, Vite
- **Future Plans**: Migration to Tauri for native capabilities

### Error Codes

`ErrorCode` enum は WASM とフロントエンドで共有されるバリデーションエラー種別です。
現在定義されているコードは以下の通りです。

| Code | Meaning |
| ---- | ------- |
| `YamlParse` | YAML 解析エラー |
| `SchemaCompile` | スキーマコンパイル時のエラー |
| `FrontmatterParse` | フロントマター解析エラー |
| `FrontmatterValidation` | フロントマター検証エラー |
| `SchemaValidation` | スキーマ検証エラー |
| `Unknown` | その他のエラー |

#### エラーコード変換メカニズム

Rust/WASM 側では `ErrorCode` は数値として定義されていますが、TypeScript 側では文字列 Enum として定義されています。
このギャップを埋めるため、`mapNumericToStringErrorCode` 関数を使用して数値から文字列への変換を行います。

```typescript
// 数値エラーコードを文字列に変換する関数
export function mapNumericToStringErrorCode(code: unknown): ErrorCode {
  if (typeof code !== 'number') {
    return ErrorCode.Unknown;
  }
  
  switch (code) {
    case 0: return ErrorCode.YamlParse;
    case 1: return ErrorCode.SchemaCompile;
    case 2: return ErrorCode.FrontmatterParse;
    case 3: return ErrorCode.FrontmatterValidation;
    case 4: return ErrorCode.SchemaValidation;
    case 5: default: return ErrorCode.Unknown;
  }
}
```

`ErrorBadge` コンポーネントでは、`normalizeErrorCode` ヘルパー関数を使って数値または文字列のエラーコードを正規化し、
統一された方法でエラーコードを扱えるようにしています。
