/**
 * @file App.tsx
 * @description YAML Note MVPのメインアプリケーションコンポーネント。
 *              3ペイン（YAMLエディタ・エラー表示・Markdownプレビュー）を統括し、
 *              ファイルアクセスやバリデーション、UXログ記録などの主要なロジックを管理する。
 *              WASMコアとの連携や、各種カスタムフックの利用もここで行う。
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import ErrorBadge from "./components/ErrorBadge";
import DevLogViewer from "./components/DevLogViewer";
import { EditorTabs, TabType } from "./components/EditorTabs";
import ValidationToggle from "./components/ValidationToggle";
import ValidationBanner from "./components/ValidationBanner";
import useFileAccess from "./hooks/useFileAccess";
import useYaml from "./hooks/useYaml";
import useMarkdownContent from "./hooks/useMarkdownContent";
import useLogger from "./hooks/useLogger";
import useValidationToggle from "./hooks/useValidationToggle";
import { summarizeContent, formatError } from "./utils/logUtils";

const defaultYaml = `title: My YAML Note
content: |
  Enter your note content here.

  ## This supports markdown

  - List items
  - More items
tags:
  - yaml
  - note
created_at: "${new Date().toISOString()}"
updated_at: "${new Date().toISOString()}"
metadata:
  author: YAML Note User
  version: 1.0
  status: draft`;

// schemaのパスを正しく設定
const schemaPath = "/schemas/note.schema.yaml";

/**
 * YAML Note MVPのメインアプリケーションコンポーネント。
 * 3ペイン（YAMLエディタ・エラー表示・Markdownプレビュー）を統括し、
 * ファイルアクセスやバリデーション、UXログ記録などの主要なロジックを管理する。
 * WASMコアとの連携や、各種カスタムフックの利用もここで行う。
 *
 * @returns {JSX.Element} アプリケーション全体のUI
 */
const App: React.FC = () => {
  // 3ビュー内容
  const [markdown, setMarkdown] = useState<string>(
    "# My YAML Note\n\nEnter your note content here.",
  );
  const [yaml, setYaml] = useState<string>(defaultYaml);
  const [schema, setSchema] = useState<string>(""); // 必要に応じて初期値
  const [activeTab, setActiveTab] = useState<TabType>("markdown");
  const [isSaved, setIsSaved] = useState<boolean>(true);
  // 開発用ログビューア表示状態
  const [showLogViewer, setShowLogViewer] = useState<boolean>(false);
  
  // Add validation toggle state
  const { isValidationEnabled, toggleValidation, enableValidation } = useValidationToggle();
  const [showValidationBanner, setShowValidationBanner] = useState<boolean>(false);

  const { fileName, openFile, saveFile } = useFileAccess();
  const { validateYaml, validationResult } = useYaml(isValidationEnabled);
  const { markdownContent } = useMarkdownContent(yaml);
  const { log } = useLogger();
  const editorRef = useRef<any>(null);
  
  // Add effect to handle banner visibility when validation state changes
  useEffect(() => {
    // Show the banner only when validation is disabled
    setShowValidationBanner(!isValidationEnabled);
    // Log validation toggle state change
    log("info", "validation_toggle", {
      enabled: isValidationEnabled
    });
  }, [isValidationEnabled, log]);

  // スキーマを読み込む
  useEffect(() => {
    const loadSchema = async () => {
      try {
        const response = await fetch(schemaPath);
        if (response.ok) {
          const content = await response.text();
          setSchema(content);
          console.log(
            "Schema loaded successfully:",
            content.substring(0, 50) + "...",
          );
        } else {
          console.error("Failed to load schema:", response.statusText);
        }
      } catch (error) {
        console.error("Error loading schema:", error);
      }
    };

    loadSchema();
  }, []);

  // EditorTabsの内容変更ハンドラ
  const handleTabContentChange = useCallback(
    (content: string) => {
      if (activeTab === "markdown") {
        setMarkdown(content);

        // Markdown変更時にYAMLも更新
        try {
          // ここでは簡易実装として、タイトルをh1から抽出し、残りをcontentに入れる
          const lines = content.split("\n");
          let title = "Untitled";
          let contentText = content;

          // h1があれば抽出
          if (lines.length > 0 && lines[0].startsWith("# ")) {
            title = lines[0].substring(2).trim();
            contentText = lines.slice(1).join("\n").trim();
          }

          // YAML形式に変換
          const newYaml = yaml
            .replace(/title:.*/, `title: ${title}`)
            .replace(
              /content:.*(\n  .*)*/,
              `content: |\n  ${contentText.replace(/\n/g, "\n  ")}`,
            );

          setYaml(newYaml);
          setIsSaved(false);
          validateYaml(newYaml, schemaPath);
        } catch (error) {
          console.error("Error converting Markdown to YAML:", error);
        }
      } else if (activeTab === "schema") {
        setSchema(content);
      }
      // ログ
      log("info", "editor_change", {
        content_summary: summarizeContent(content),
        tab: activeTab,
      });
    },
    [activeTab, validateYaml, log, yaml],
  );

  // タブ切替ハンドラ
  const handleTabChange = useCallback(
    (tab: TabType) => {
      // Schema tab activation - validate the schema
      if (tab === "schema" && !isValidationEnabled) {
        // Warn about validation being disabled when entering schema tab
        console.log("Schema edit mode: validation is disabled");
      }

      setActiveTab(tab);
      log("info", "tab_change", { tab });
    },
    [log, activeTab, markdownContent, isValidationEnabled],
  );

  // ファイルを開く処理
  const handleOpenFile = useCallback(async () => {
    // ファイルオープン開始ログ
    log("info", "file_open_start");

    try {
      const fileInfo = await openFile();
      if (fileInfo) {
        setYaml(fileInfo.content);
        validateYaml(fileInfo.content, schemaPath);
        setIsSaved(true);

        // ファイルオープン成功ログ
        log("info", "file_open_success", {
          content_summary: summarizeContent(fileInfo.content),
          filename: fileInfo.name,
          fileSize: new Blob([fileInfo.content]).size,
        });
      } else {
        // ユーザーがキャンセルした場合
        log("info", "file_open_cancelled");
      }
    } catch (error) {
      console.error("Error opening file:", error);

      // エラーログ
      log("error", "file_open_error", {
        error: formatError(error),
      });

      alert("ファイルを開く際にエラーが発生しました");
    }
  }, [openFile, validateYaml, log]);

  // ファイルを保存する処理
  const handleSaveFile = useCallback(async () => {
    // 保存開始ログ
    log("info", "file_save_start", {
      content_summary: summarizeContent(yaml),
    });

    try {
      const success = await saveFile(yaml);
      if (success) {
        setIsSaved(true);

        // 保存成功ログ
        log("info", "file_save_success", {
          fileName,
          fileSize: new Blob([yaml]).size,
          is_valid: validationResult.success,
        });
      } else {
        // キャンセルまたは失敗した場合
        log("info", "file_save_cancelled");
      }
    } catch (error) {
      console.error("Error saving file:", error);

      // 保存エラーログ
      log("error", "file_save_error", {
        error: formatError(error),
      });

      alert("ファイルの保存中にエラーが発生しました");
    }
  }, [saveFile, yaml, fileName, validationResult.success, log]);

  // エラーバッジクリック時のエディタ行移動
  const handleErrorClick = useCallback(
    (line: number) => {
      if (editorRef.current && line > 0) {
        editorRef.current.setCursor(line - 1);

        // エラーナビゲーションログ
        log("info", "error_navigation", {
          targetLine: line,
          totalErrors: validationResult.errors.length,
        });
      }
    },
    [validationResult.errors.length, log],
  );

  // 開発者ログビューアの表示/非表示を切り替える
  const toggleLogViewer = useCallback(() => {
    setShowLogViewer((prev) => !prev);
    log("debug", "log_viewer_toggle", {
      show: !showLogViewer,
    });
  }, [showLogViewer, log]);

  // マウント時に初回バリデーション
  useEffect(() => {
    validateYaml(yaml, schemaPath);
  }, [validateYaml, yaml]);

  // バリデーション結果変更時のログ記録
  useEffect(() => {
    // バリデーション結果が変わったときだけログを記録
    if (validationResult.success) {
      log("info", "validation_success");
    } else {
      log("warn", "validation_error", {
        errorCount: validationResult.errors.length,
        errorTypes: validationResult.errors.map((e) =>
          e.message.substring(0, 50),
        ),
      });
    }
  }, [validationResult, log]);

  return (
    <div className="flex flex-col h-screen bg-slate-100 p-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">YAML Note MVP</h1>

        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={handleOpenFile}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              Open
            </button>
            <button
              onClick={handleSaveFile}
              disabled={isSaved}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
            >
              Save {!isSaved && "*"}
            </button>
          </div>
          <ValidationToggle
            isEnabled={isValidationEnabled}
            onToggle={toggleValidation}
            className="ml-4"
          />
        </div>
      </header>

      <ValidationBanner
        isVisible={showValidationBanner}
        onEnable={enableValidation}
        onClose={() => setShowValidationBanner(false)}
        className="mb-4"
      />

      <div className="flex-1 mb-4 flex flex-col">
        <EditorTabs
          markdown={markdown}
          schema={schema}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onContentChange={handleTabContentChange}
        />
      </div>

      <footer className="flex justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2">
          {fileName || "Unsaved document"}

          {/* 開発モードでのみログビューアボタンを表示 */}
          {process.env.NODE_ENV === "development" && (
            <button
              onClick={toggleLogViewer}
              className="ml-4 px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
              title="開発者ログビューア (⌘+L)"
            >
              ログ表示 (⌘L)
            </button>
          )}
        </div>
        <div>
          {isSaved ? "Saved" : "Unsaved changes"}
          {validationResult.success
            ? " • Valid YAML"
            : ` • ${validationResult.errors.length} error(s)`}
        </div>
      </footer>

      {/* エラーバッジ */}
      {!validationResult.success && isValidationEnabled && (
        <ErrorBadge
          errors={validationResult.errors}
          onClick={handleErrorClick}
        />
      )}

      {/* 開発者ログビューア */}
      {showLogViewer && <DevLogViewer onClose={toggleLogViewer} />}
    </div>
  );
};

export default App;
