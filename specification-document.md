# YAML-Only Note App – MVP **設計書**

## 1. MVP の目的（確定）

```yaml
- id: 1
  description: "YAML 全文ノート + JSON Schema バリデーションを実装し、編集時に即エラーが視認できる UX を検証する。"
- id: 2
  description: "Markdown 風プレビュー／Raw YAML エディタ間をシームレスに切替えられる操作性を示す。"
- id: 3
  description: "操作イベントを JSONL & PostHog へ送出し、後続フェーズで UX を数値化できる基盤を整える。"
```

## 2. 採用技術 & 役割

```yaml
ui:
  technologies: ["React (Vite)", "Tailwind CSS", "CodeMirror (YAML)"]
  role: "3 ペイン UI：Raw 編集 / エラー / Markdown プレビュー"
yaml_core:
  technologies: ["Rust (serde_yaml, jsonschema-rs) -> WASM"]
  role: "解析・検証を sub‑ms で提供"
schema:
  technologies: ["JSON Schema (*.schema.yaml)"]
  role: "ノート型を定義し Git でバージョン管理"
build_distribution:
  technologies: ["pnpm workspaces", "wasm‑bindgen", "vite‑plugin‑wasm"]
  role: "モノレポ構成。PWA として配布"
logging_metrics:
  technologies: ["PostHog JS", "JSONL logger"]
  role: "操作イベント収集（性能指標は後続フェーズ）"
future_plan:
  alpha:
    platform: "Tauri"
    notes: "ネイティブへ移行し、FS 操作・マルチスレッド最適化を図る"
```

## 3. リポジトリ構成 (monorepo)

```text
yaml-note-mvp/
├─ apps/
│  └─ web/
│      ├─ src/
│      │   ├─ components/      # YamlEditor / MarkdownPreview / ErrorBadge
│      │   ├─ hooks/           # useYaml, useFileAccess
│      │   ├─ utils/           # yamlToMd, logger
│      │   └─ index.tsx
│      └─ vite.config.ts
├─ packages/
│  ├─ core-wasm/
│  │   ├─ src/                 # lib.rs, validate.rs
│  │   ├─ Cargo.toml
│  │   └─ build.sh
│  └─ schemas/
│      ├─ note.schema.yaml
│      └─ project.schema.yaml
├─ sample/
│   └─ note.yaml
├─ scripts/
│   └─ dev-start.sh
├─ docs/
└─ package.json
```

## 4. モジュール責務

```yaml
modules:
  core-wasm:
    responsibilities:
      - "validate_yaml(yaml_str, schema_str) -> ValidationResult"
      - "apply_patch(yaml, patch)"
  hooks/useYaml.ts:
    responsibilities:
      - "WASM ロード"
      - "30 ms デバウンス"
      - "結果キャッシュ"
  YamlEditor.tsx:
    responsibilities:
      - "CodeMirror ラッパー"
      - "onChange(rawYaml)"
  ErrorBadge.tsx:
    responsibilities:
      - "行番号 + エラーメッセージ表示"
  MarkdownPreview.tsx:
    responsibilities:
      - "yamlToMd で生成した mdast → HTML"
  logger.ts:
    responsibilities:
      - "log(eventType, payload) -> JSONL & PostHog"

dataflow:
  - step: 1
    description: "YamlEditor 入力 → useYaml に raw 文字列 (30 ms debounce)"
  - step: 2
    description: "useYaml → validate_yaml 実行、エラー配列取得"
  - step: 3
    description: "ErrorBadge にエラー、MarkdownPreview に AST"
  - step: 4
    description: "logger が操作イベントを JSONL/PostHog へ送出"
```

## 5. MVP 実装ロードマップ（0〜5）

```yaml
roadmap:
  - phase: 0
    name: "準備フェーズ"
    tasks:
      - todo: "レポジトリ雛形"
        deliverables: ["/package.json", "/Cargo.toml", "/pnpm-workspace.yaml"]
        cli_exit: "$ pnpm dev → 空画面; $ cargo check -p core-wasm OK"
      - todo: "JSON Schema 雛形"
        deliverables: ["note.schema.yaml"]
        cli_exit: "$ npx ajv-cli validate -s packages/schemas/note.schema.yaml -d sample/note.yaml → 0 errors"
  - phase: 1
    name: "core‑wasm"
    tasks:
      - todo: "YAML パーサ"
        deliverables: ["lib.rs"]
        cli_exit: "$ cargo test -p core-wasm parse_roundtrip pass"
      - todo: "JSON Schema バリデータ"
        deliverables: ["validate.rs"]
        cli_exit: "$ cargo test -p core-wasm validate_ok pass"
      - todo: "WASM & npm pkg"
        deliverables: ["core-wasm/pkg/"]
        cli_exit: '$ wasm-pack build --target bundler OK; node -e "require(''@core-wasm'')" OK'
  - phase: 2
    name: "Raw YAML エディタ"
    tasks:
      - todo: "CodeMirror 組込"
        deliverables: ["YamlEditor.tsx"]
        exit_condition: "ハイライト付きエディタ表示"
      - todo: "File Open/Save"
        deliverables: ["useFileAccess.ts"]
        exit_condition: "Open→編集→Save が動く"
  - phase: 3
    name: "リアルタイム バリデーション"
    tasks:
      - todo: "useYaml hook"
        deliverables: ["useYaml.ts"]
        exit_condition: "$ pnpm test → mock テスト pass"
      - todo: "ErrorBadge"
        deliverables: ["ErrorBadge.tsx"]
        exit_condition: "不正 YAML で赤アイコン＋メッセージ表示"
  - phase: 4
    name: "Markdown プレビュー"
    tasks:
      - todo: "yaml→mdast 変換"
        deliverables: ["yamlToMd.ts"]
        exit_condition: "$ pnpm test pass"
      - todo: "MarkdownPreview"
        deliverables: ["MarkdownPreview.tsx"]
        exit_condition: "title/body が Markdown 表示"
  - phase: 5
    name: "UX 操作ログ基盤"
    tasks:
      - todo: "logger.ts"
        deliverables: ["logger.ts", "sample_logs/*.jsonl"]
        exit_condition: "Console 出力 & JSONL 生成"
      - todo: "PostHog 連携"
        deliverables: ["analytics.ts"]
        exit_condition: "PostHog で pageview/edit を確認"

completion_criteria:
  - "全 CLI 例が成功し、型チェック・ビルドともにエラーなし。"
  - "sample_logs/ にログが生成され、PostHog でイベントを確認できる。"
```
