/**
 * EditorTabs.tsx
 * 2つのエディタタブ（Markdown、Schema）を管理するコンポーネント
 */
import React, { useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { basicSetup } from "@uiw/react-codemirror";

/**
 * タブ種別
 */
export type TabType = "markdown" | "schema";

/**
 * EditorTabsのprops型
 * @property {string} markdown - Markdown内容
 * @property {string} schema - スキーマ内容
 * @property {TabType} activeTab - 現在アクティブなタブ
 * @property {(tab: TabType) => void} onTabChange - タブ切替時のハンドラ
 * @property {(content: string) => void} onContentChange - エディタ内容変更時のハンドラ
 */
export interface EditorTabsProps {
  markdown: string;
  schema: string;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onContentChange: (content: string) => void;
}

/**
 * EditorTabs
 * 2つのエディタタブを提供するコンポーネント
 */
export const EditorTabs: React.FC<EditorTabsProps> = ({
  markdown,
  schema,
  activeTab,
  onTabChange,
  onContentChange,
}) => {
  // エディタ内容変更ハンドラ
  const handleChange = useCallback(
    (value: string) => {
      onContentChange(value);
    },
    [onContentChange]
  );

  // エディタの言語とコンテンツを取得
  const getEditorContent = () => {
    switch (activeTab) {
      case "markdown":
        return markdown;
      case "schema":
        return schema;
      default:
        return "";
    }
  };

  // CodeMirrorの言語設定
  const getEditorExtensions = () => {
    if (activeTab === "schema") {
      return [basicSetup(), yaml()];
    }
    return [basicSetup()];
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* タブバー */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 ${activeTab === "markdown" ? "border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => onTabChange("markdown")}
        >
          Note.md
        </button>
        <button
          className={`px-4 py-2 ${activeTab === "schema" ? "border-b-2 border-blue-600 font-bold" : ""}`}
          onClick={() => onTabChange("schema")}
        >
          Schema.yaml
        </button>
      </div>
      {/* エディタ本体 - CodeMirror */}
      <div className="flex-1 w-full">
        <CodeMirror
          value={getEditorContent()}
          height="100%"
          extensions={getEditorExtensions()}
          onChange={handleChange}
          theme="light"
        />
      </div>
    </div>
  );
};