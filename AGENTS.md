# AGENTS.md – Codex ガイド

## 🏗 セットアップ
Codex がタスクを開始する前に **`./scripts/codex-setup.sh`** を 1 回だけ実行してください。  
セットアップ後はインターネット遮断モードに切り替わるため、依存取得はこのスクリプト内で完結させます。

## ✅ テスト・品質チェック
タスク完了前に必ず下記コマンドを実行し **全てパスさせる** こと。

```bash
# TypeScript
pnpm test         # Vitest
pnpm typecheck    # tsc --noEmit
pnpm lint         # ESLint / Prettier

# Rust (core-wasm)
cargo test -p core-wasm
```

## 🔨 ビルド依存

TypeScript テストの前に WASM をビルドする必要がある場合は：

```bash
pnpm --filter core-wasm... run build-wasm   # packages/core-wasm/build.sh のラッパー
```

## 🎨 コードスタイル
- TypeScript / Rust のコメントは日本語（詳細は CLAUDE.md を参照）。
- ES Module, 2-space indent, trailing comma = all, Prettier 規定。

## 📝 Pull Request ルール
- Git ブランチは切らず 直接コミット（Codex の既定）。
- PR メッセージにはテスト結果の要約を含める。

> **ポイント**  
> *ファイル名と場所* は固定：**`AGENTS.md` をリポジトリのルート** に置くと全コードに適用されます。