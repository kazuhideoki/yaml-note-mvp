# V3 スキーマ駆動ノートアプリ – 実装計画

---

## 1. 目的

Markdown を**唯一の編集・保存フォーマット**とし、最小限のフロントマター（`schema_path`, `validated`）を添えるだけで **JSON Schema によるリアルタイム検証**と **即時プレビュー**を実現する。開発者の日常的な `.md` 編集体験を崩さず、後の AI／多様スキーマ拡張に耐える堅牢な基盤を構築する。

---

## 2. 要件

| #   | 要件                                                 | 補足                                                              |
| --- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| N1  | Markdown ファイル (`.md`) の直接編集・保存           | フロントマターも同一エディタ上に表示                              |
| N2  | フロントマター項目は `schema_path`, `validated` のみ | 拡張は V3 範囲外                                                  |
| N3  | 画面は **2 タブ**: Note.md / Schema.yaml             | `schema_path` で指定されたスキーマを自動ロード                    |
| N4  | 保存はアクティブタブの内容のみ                       | Note タブ→`.md`, Schema タブ→`.schema.yaml`                       |
| N5  | 30 ms デバウンス付きリアルタイム検証                 | WASM コア + React hook                                            |
| N6  | エラー 3 種を色分け表示                              | ①フロントマター構文, ②Markdown→YAML スキーマ違反, ③スキーマ構文   |
| N7  | `validated` トグルでスキーマ検証 ON/OFF              | OFF 時も構文エラーは検出                                          |
| N8  | 検証系モジュールを分離                               | front‑matter parse/validate, md→yaml, yaml×schema, schema compile |

---

## 3. 設計概要

```
┌──────────────────┐
│  MarkdownEditor  │── md text ─┐
└──────────────────┘            │
      ▲ save/open               │
      ▼                         ▼
┌──────────────────┐  wasm  ┌─────────────────┐
│  SchemaEditor    │─ yml → │   core_wasm     │
└──────────────────┘         │  (a–e modules)  │
      ▲ err/decor.            └─────────────────┘
```

- **a.** front‑matter 解析
- **b.** front‑matter 構文検証
- **c.** `md_to_yaml` (heading → key, 本文無視)
- **d.** YAML × Schema 検証
- **e.** Schema コンパイル

`useValidator` フックが a→b→c→d→e を串刺し実行し、種類別に色分けした `ValidationResult[]` を返す。

---

## 4. フェーズ別実装ロードマップ（縦割りインクリメンタル）

> **S0〜S7** の 8 段階。各フェーズ完了ごとに `git tag` を打ち、ブランチを切らず順次マージしていく。
> **※「対象ファイル」は例示** であり、実際のディレクトリ / ファイル名は実装状況に応じて適宜変更する。

---

### S0: クリーンアップ

- **目的**: レガシーコード・依存を削ぎ落とし、最小ビルドが警告ゼロで通る状態を作る。
- **設計概要**: 削除のみ。新機能は入れない。
- **対象ファイル (例)**: `src/legacy/**`, `storybook/**`, 旧 `YamlEditor.tsx`, `diff/**`, `package.json`, `Cargo.toml`.
- **完了条件**: `pnpm dev` と `cargo test` が警告・未使用依存ゼロで成功。
- **自動テストで保証する挙動**: `npm run lint` と `cargo clippy -- -D warnings` が exit 0。
- **Key Tasks (例)**: 1) 依存ツリーを `pnpm prune` で一覧 → 未使用を削除。2) `cargo udeps` で Rust 未使用依存を洗浄。3) CI で lint/clippy ジョブ追加。
- **手動チェック項目**: ブラウザ起動 → blank page でも console error=0。
- **やらないこと**: コードリファクタ・機能追加。

### S1: コア最小ループ

- **目的**: Markdown → YAML 変換 + フロントマター構文検証を WASM で動かす。
- **設計概要**: Rust にモジュール a,b,c 実装。CLI or Jest で呼び出し。
- **対象ファイル (例)**: `core-wasm/src/frontmatter.rs`, `md_transform.rs`, `lib.rs`, `tests/*.rs`.
- **完了条件**: `cargo test` で ①フロントマター OK/NG、②変換成功の 3 ケース Green。
- **自動テストで保証する挙動**: \* front‑matter が欠落→`Err(E-FM-001)`、正しい場合→`Ok`。\* `md_to_yaml` round‑trip テスト。
- **Key Tasks (例)**: 1) `parse_frontmatter` 実装。2) `md_to_yaml` の heading→key アルゴリズム仮実装。3) wasm-bindgen エクスポート & Node テストスクリプト作成。
- **手動チェック**: `wasm-pack build && node demo.js` → JSON 出力確認。
- **やらないこと**: スキーマ検証・UI。

### S2: 単一エディタ PoC

- **目的**: ブラウザで Markdown を開き、赤バッジ（front-matter error）を出せる。
- **設計概要**: React に `MarkdownEditor.tsx`, `ErrorBadge.tsx`。`useValidator` は a,b のみ呼ぶ。
- **対象ファイル (例)**: `src/components/MarkdownEditor.tsx`, `src/hooks/useValidator.ts`.
- **完了条件**: 不正フロントマターで赤、修正すると消える。
- **自動テストで保証する挙動**: Cypress: load sample_bad.md → `.error-badge.red` 存在、修正→消失。
- **Key Tasks (例)**: 1) CodeMirror＋markdown 拡張導入。2) ErrorBadge コンポーネント簡易実装。3) ブラウザ drag\&drop loader。
- **手動チェック**: `.md` ドラッグ→表示→エラー色確認。
- **やらないこと**: スキーマロード・プレビュー。

### S3: リアルタイム検証

- **目的**: `schema_path` で指定されたスキーマを自動ロードし、黄色バッジ（スキーマ違反）まで対応。
- **設計概要**: WASM d モジュール呼び出し、`fetchSchema(path)` ユーティリティ。
- **対象ファイル (例)**: `core-wasm/src/schema_validate.rs`, `src/utils/schema.ts`.
- **完了条件**: heading を消す→黄色、戻す→消える (<=100 ms)。
- **自動テストで保証する挙動**: Jest: `note_invalid.md` returns `E-SCHEMA-…` error list含む。
- **Key Tasks (例)**: 1) JSON Schema キャッシュ層実装。2) `useValidator` に d 呼び出し。3) 黄色バッジ配色 & legend 追加。
- **手動チェック**: heading を消す→黄色表示。
- **やらないこと**: Schema タブ・紫バッジ。

### S4: Schema タブ & 紫バッジ

- **目的**: スキーマ YAML の**編集・即時保存**と構文エラー表示。
- **設計概要**: Tab UI 追加、`SchemaEditor.tsx` で live-saving（Ctrl+S）対応。保存時に WASM e モジュールで構文 + 論理チェック。
- **対象ファイル (例)**: `src/components/SchemaEditor.tsx`, `core-wasm/src/schema_compile.rs`.
- **完了条件**: 1) スキーマ編集→保存でファイル更新。2) 紫バッジが出る/消える。3) Note タブは常に編集可。
- **自動テストで保証する挙動**: Cypress: open bad schema → `.error-badge.purple`、修正→消失・Markdown操作可。
- **Key Tasks (例)**: 1) YAML CodeMirror インスタンス。2) `compile_schema` 呼び出し。3) Tab コンテキスト状態管理。
- **手動チェック**: `{` 欠落→紫エラー。

### S5: ファイル I/O

- **目的**: `.md` / `.schema.yaml` の open/save。dirty state 管理。
- **設計概要**: `useFileAccess` フックを刷新、タブごとに save 判定。
- **対象ファイル (例)**: `src/hooks/useFileAccess.ts`, `public/manifest.json`.
- **完了条件**: 編集→Save→再読込で内容一致。
- **自動テストで保証する挙動**: Playwright: make edit → click save → reload → content persists.
- **Key Tasks (例)**: 1) File System Access API wrapper。2) dirty フラグ実装。3) Save ショートカット共通化。
- **手動チェック**: VSCode diff=0。

### S6: validated トグル & UX 仕上げ

- **目的**: `validated: false` でスキーマ検証抑止。装飾・ログ整備。
- **設計概要**: `ValidationToggle.tsx`、ErrorBadge デザイン仕上げ、Logger 新イベント。
- **対象ファイル (例)**: `src/components/ValidationToggle.tsx`, `src/hooks/useLogger.ts`.
- **完了条件**: トグル OFF→黄色非表示、ON→復活。
- **自動テストで保証する挙動**: Jest: toggle→`validated` 更新、validator skip/restore。
- **Key Tasks (例)**: 1) Toggle UI 実装。2) `useValidator` に validated 分岐。3) PostHog event 発火。
- **手動チェック**: PostHog toggle イベント確認。
- **やらないこと**: PostHog 本番設定。

### S7: メトリクス & リファクタ

- **目的**: ダッシュボードで主要 KPI を確認しつつ、仮コード・命名を整理。
- **設計概要**: Logger → PostHog ダッシュボード作成、`core-wasm` API 名確定、TODO コメント解消。
- **対象ファイル (例)**: `src/hooks/useLogger.ts`, `core-wasm/src/**/*.rs`, `README.md`.
- **完了条件**: PostHog で validation_latency グラフ可視化。`cargo clippy -- -D warnings` パス。
- **自動テストで保証する挙動**: Lighthouse CI: performance >=90, accessibility >=90。
- **Key Tasks (例)**: 1) PostHog board テンプレ追加。2) `ErrorCode` enum 固定。3) 不要 TODO 削除。
- **手動チェック**: ダッシュボード URL 共有、CI green。

---

## 5. データ仕様メモ

- **heading → YAML 変換ルール**: 実装フェーズで決定（例: `##` を `sections[]`、`###` を `sections[].sub[]` にマップ）。_目的は「見出し階層 ≒ 階層データ」だが、ルールはプラガブル実装にし、V3 では固定版をまず入れる。_
- **`schema_path` 解決順**:

  1. ノートファイルと同じディレクトリからの _相対パス_
  2. `/schemas/` などプロジェクトルートからの _絶対パス_
  3. 記載なし → **スキーマ無しモード**（Markdown は自由編集、Schema タブには「スキーマ未設定」のインジケータ表示）。

- スキーマ無しでも Note タブ・プレビュー・保存は常時可能。黄色バッジは無効化。
