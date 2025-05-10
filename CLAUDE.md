# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Lint/Test Commands

```bash
# Development
pnpm dev                  # Start development server
cargo check -p core-wasm  # Check Rust core WASM module

# Testing
pnpm test                 # Run all tests
pnpm test -- -t "testName" # Run specific test
cargo test -p core-wasm   # Run Rust tests
npx ajv-cli validate -s packages/schemas/note.schema.yaml -d sample/note.yaml # Validate schemas

# Build
wasm-pack build --target bundler # Build WASM package
```

## Code Style Guidelines

- **TypeScript**: Strict typing with explicit return types on functions
- **React**: Functional components with hooks, no class components
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Imports**: Group imports (React, libraries, internal modules)
- **Error Handling**: 
  - Core validation errors should be structured for UI display with line numbers
  - Use typed error results from WASM module
- **File Structure**: Follow monorepo structure with apps/packages separation
- **Performance**: Use 30ms debounce for YAML validation to ensure responsiveness 
- **Logging**: All user actions should emit structured events for analytics