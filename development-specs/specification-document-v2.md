YAML-Only Note App – V2 設計書

## 1. V2 の目的（確定）

```yaml
- id: 1
  description: "Markdown 感覚で編集しつつ、保存実体は YAML を維持する 3 ビュー UI (MD / note.yaml / schema.yaml) を実装する。"
- id: 2
  description: "YAML↔Markdown ラウンドトリップ変換・差分検知・JSON Schema バリデーションを Rust/WASM 側に集約し、UI からは wasm-bindgen API で呼び出す。"
- id: 3
  description: "Validation ON/OFF トグルと Schema 編集をサポートし、ON では即時エラー表示、OFF では自由編集＋自動スキーマ再生成を検証する。"
```

## 2. 採用技術 & 役割

```yaml
ui:
technologies:
["React (Vite)", "Tailwind CSS", "CodeMirror 7 (markdown|yaml)", "Shadcn/ui"]
role: "タブ式 3 ビュー UI + オプション Live Preview + Validation トグル"
core_wasm:
technologies:
["Rust (serde_yaml, pulldown-cmark, jsonschema-valid, json_patch)", "wasm-bindgen", "wasm-pack"]
role: "md⇄yaml 変換・JSON Patch 差分・Schema コンパイル・Validation を sub-ms で提供"
schema:
technologies: ["JSON Schema (*.schema.yaml)"]
role: "ノート構造定義・バージョン管理"
build_distribution:
technologies:
["pnpm workspaces", "vite-plugin-wasm", "Tauri (future)"]
role: "モノレポ + PWA, デスクトップ移行準備"
logging_metrics:
technologies: ["PostHog JS", "JSONL logger"]
role: "操作イベント収集と UX 計測"
```

## 3. リポジトリ構成 (monorepo)

```text
yaml-note-v2/
├─ apps/
│ └─ web/
│ ├─ src/
│ │ ├─ components/ # EditorTabs / LivePreview / ErrorBadge
│ │ ├─ hooks/ # useYamlCore / useFileAccess / useValidation
│ │ ├─ utils/ # yamlToMd (fallback), logger
│ │ └─ main.tsx
│ └─ vite.config.ts
├─ packages/
│ ├─ core-wasm/
│ │ ├─ src/ # lib.rs, md_transform.rs, diff.rs
│ │ ├─ Cargo.toml
│ │ └─ build.sh
│ └─ schemas/
│ ├─ note.schema.yaml
│ └─ project.schema.yaml
├─ sample/
│ └─ note.yaml
├─ scripts/
│ └─ dev-start.sh
├─ docs/
└─ package.json
```

## 4. モジュール責務

```yaml
modules:
  core-wasm:
    responsibilities:
      - "md_to_yaml(md_str) -> yaml_str"
      - "yaml_to_md(yaml_str) -> md_str"
      - "yaml_diff(base, edited) -> json_patch"
      - "apply_patch(yaml, patch) -> yaml_str"
      - "validate_yaml(yaml, schema) -> ValidationResult"
      - "compile_schema(schema_yaml) -> Result"
  hooks/useYamlCore.ts:
    responsibilities:
      - "WASM ロードと API ラッパ (Promise)"
      - "debounce 30 ms → md_to_yaml / validate_yaml 呼び出し"
      - "Validation ON/OFF に応じたフロー分岐"
  EditorTabs.tsx:
    responsibilities:
      - "3 つの CodeMirror インスタンス (MD / note.yaml / schema.yaml) 切替え"
      - "タブ間切替時に yaml_diff で競合検知"
  LivePreview.tsx:
    responsibilities:
      - "yaml_to_md → remark → HTML レンダリング"
  ErrorBadge.tsx:
    responsibilities:
      - "行番号 + エラーメッセージ表示 (ValidationResult 依存)"
  logger.ts:
    responsibilities:
      - "log(eventType, payload) -> JSONL & PostHog"

dataflow:
  - step: 1
    description: "EditorTabs の onChange → useYamlCore へ raw text (debounce)"
  - step: 2
    description: "useYamlCore → md_to_yaml / validate_yaml 実行、結果を React 状態に反映"
  - step: 3
    description: "ErrorBadge へ errors[], LivePreview へ md_str"
  - step: 4
    description: "logger が操作イベントを送出"
```

## 5. V2 実装ロードマップ（6 〜 9）

```yaml
roadmap:
  - phase: 6a
    name: "md<->yaml 変換 API"
    tasks:
      - todo: "md_to_yaml / yaml_to_md 実装 (Rust)"
      - todo: "round-trip unit test"
      - exit: "$ cargo test md_roundtrip pass"
  - phase: 6b
    name: "差分 & パッチ"
    tasks:
      - todo: "yaml_diff / apply_patch 強化"
      - todo: "タブ切替時の競合 UI"
      - exit: "編集競合時に警告ダイアログ表示"
  - phase: 7
    name: "Schema 編集 & Validation トグル"
    tasks:
      - todo: "compile_schema API"
      - todo: "Validation ON/OFF 実装"
      - exit: "ON: errors, OFF: 無検証＆schema 編集保存可"

completion_criteria:
  - "pnpm dev → ブラウザで 3 ビュー + Validation 動作"
  - "cargo test 全緑 & wasm-pack build --release OK"
  - "PostHog で pageview / edit イベント確認"
```
