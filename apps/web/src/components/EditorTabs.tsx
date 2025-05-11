/***********************************************
 * EditorTabs.tsx
 * 3ビューエディタタブ + 競合検知・ConflictDialog表示
 * - タブ切替時にuseYamlDiffで競合検知
 * - 競合時はConflictDialogを表示
 * - 日本語JSDoc付き
 ***********************************************/
import React, { useState, useCallback } from "react";
import { useYamlDiff, ConflictResult } from "../hooks/useYamlDiff";
import { ConflictDialog } from "./ConflictDialog";

/**
 * タブ種別
 */
export type TabType = "markdown" | "yaml" | "schema";

/**
 * EditorTabsのprops型
 * @property {string} markdown - Markdown内容
 * @property {string} yaml - YAML内容
 * @property {string} schema - スキーマ内容
 * @property {TabType} activeTab - 現在アクティブなタブ
 * @property {(tab: TabType) => void} onTabChange - タブ切替時のハンドラ
 * @property {(content: string) => void} onContentChange - エディタ内容変更時のハンドラ
 */
export interface EditorTabsProps {
  markdown: string;
  yaml: string;
  schema: string;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onContentChange: (content: string) => void;
}

/**
 * EditorTabs
 * 3つのエディタタブと競合検知ダイアログを提供
 */
export const EditorTabs: React.FC<EditorTabsProps> = ({
  markdown,
  yaml,
  schema,
  activeTab,
  onTabChange,
  onContentChange,
}) => {
  const { isInitialized, detectConflicts } = useYamlDiff();

  // 競合ダイアログ状態
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictResult, setConflictResult] = useState<ConflictResult>({
    has_conflict: false,
    conflicts: [],
  });

  // タブ切替時の競合検知
  const handleTabChange = useCallback(
    async (nextTab: TabType) => {
      // 例: markdown→yaml, yaml→markdown間のみ競合検知
      if (
        (activeTab === "markdown" && nextTab === "yaml") ||
        (activeTab === "yaml" && nextTab === "markdown")
      ) {
        if (!isInitialized) {
          onTabChange(nextTab);
          return;
        }
        // 競合検知
        const base = activeTab === "markdown" ? markdown : yaml;
        const edited = nextTab === "markdown" ? markdown : yaml;
        const result = await detectConflicts(base, edited);
        if (result.has_conflict) {
          setConflictResult(result);
          setConflictDialogOpen(true);
          return; // 競合時は切替を一時停止
        }
      }
      onTabChange(nextTab);
    },
    [activeTab, markdown, yaml, isInitialized, detectConflicts, onTabChange]
  );

  // エディタ内容
  const getEditorContent = () => {
    switch (activeTab) {
      case "markdown":
        return markdown;
      case "yaml":
        return yaml;
      case "schema":
        return schema;
      default:
        return "";
    }
  };

  // エディタ内容変更
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onContentChange(e.target.value);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* タブバー */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 ${activeTab === "markdown" ? "border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => handleTabChange("markdown")}
        >
          Markdown
        </button>
        <button
          className={`px-4 py-2 ${activeTab === "yaml" ? "border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => handleTabChange("yaml")}
        >
          YAML
        </button>
        <button
          className={`px-4 py-2 ${activeTab === "schema" ? "border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => handleTabChange("schema")}
        >
          Schema
        </button>
      </div>
      {/* エディタ本体（簡易textarea） */}
      <textarea
        className="flex-1 w-full p-2 font-mono text-sm border-none outline-none resize-none"
        value={getEditorContent()}
        onChange={handleContentChange}
        spellCheck={false}
        style={{ minHeight: "200px" }}
      />
      {/* 競合ダイアログ */}
      <ConflictDialog
        open={conflictDialogOpen}
        onClose={() => setConflictDialogOpen(false)}
        hasConflict={conflictResult.has_conflict}
        conflicts={conflictResult.conflicts}
      />
    </div>
  );
};
