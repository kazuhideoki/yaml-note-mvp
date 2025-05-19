# V4 デスクトップ移行計画 – 仕様書

---

## 1. Why (目的)

現行のブラウザ版 Web アプリをデスクトップ環境でも利用可能にするため、Tauri を用いて
ネイティブアプリへ移行する。ネイティブ化により以下を実現する。

- OS ネイティブのファイル操作・ダイアログ
- マルチスレッド等のパフォーマンス最適化
- オフラインでの安定利用と配布の簡易化

## 2. What (要件)

1. **Tauri プロジェクトの追加**
   - `src-tauri/` 以下に設定ファイルと Rust クレートを生成
   - Cargo ワークスペースへ組み込み
2. **既存 Web アプリの統合**
   - `apps/web` のビルド成果物を Tauri が読み込む構成にする
   - 開発・ビルドとも `pnpm tauri dev` / `tauri build` で完結させる
3. **ファイル操作ロジックの置き換え**
   - File System Access API を Tauri の `@tauri-apps/api` 相当へ置換
   - 必要に応じて Rust 側コマンドを定義
4. **コアロジックのライブラリ化**
   - `packages/core-wasm` から共通処理を抽出し、Tauri から直接呼び出す
5. **ビルド・テストの拡張**
   - CI スクリプトに `cargo test -p tauri_app` などを追加
   - `pnpm lint` `pnpm typecheck` との併用を維持
6. **デスクトップ UI 最小実装**
   - ファイルメニュー（新規/開く/保存）のみ提供
   - 画面デザインは Web 版を流用
7. **配布スクリプトの整備**
   - `tauri build` で各 OS 用バイナリを生成し、GitHub Releases へアップロード
8. **ドキュメント更新**
   - README と開発向けドキュメントにデスクトップ版手順を追記

## 3. How (詳細設計)

### 3.1 プロジェクト構成イメージ

```
yaml-note-mvp/
├─ apps/
│  └─ web/            # 既存 React アプリ
├─ packages/
│  └─ core-wasm/      # WASM + ライブラリ化するコア
├─ src-tauri/         # 新規 Tauri プロジェクト
└─ Cargo.toml         # ワークスペースに tauri_app クレート追加
```

### 3.2 フェーズ別ロードマップ

- **S0: Tauri 初期化** – `tauri init` 実行、ワークスペース設定
- **S1: Web アプリ連携** – `distDir` を `../apps/web/dist` に設定
- **S2: ファイル API 移行** – `useFileAccess.ts` を Tauri API へ書き換え
- **S3: コアライブラリ分割** – Rust ライブラリとして再構成、WASM と共有
- **S4: ビルド・テスト更新** – CI で `tauri build` / `cargo test` を実行
- **S5: UI 最小実装** – メニュー周りの追加、ウィンドウ設定
- **S6: 配布フロー整備** – GitHub Releases へのバイナリアップロード
- **S7: ドキュメント整備** – README ほかを更新

## 4. 成果物

- マルチプラットフォーム対応のデスクトップアプリ
- 統合されたビルド & CI フロー
- 更新されたドキュメント

## 5. この移行でやらないこと

- 自動アップデート機構の導入
- ネットワーク同期やクラウド機能
- 大規模な UI リニューアル
- モバイル (iOS/Android) 向けビルド

