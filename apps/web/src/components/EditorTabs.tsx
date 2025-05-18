/**
 * エディタタブコンポーネント
 * @component
 * @description
 * Note（Markdown）とSchema（YAML）を切り替えるタブUIを提供する。
 * アクティブタブの状態を管理し、適切なエディタコンポーネントを表示する。
 */
import React, { useCallback } from 'react';

/**
 * タブ種別
 */
export type TabType = 'note' | 'schema';

/**
 * EditorTabs コンポーネントのプロパティ型
 */
export interface EditorTabsProps {
  /** 現在のスキーマパス（null の場合は未設定） */
  currentSchemaPath: string | null;
  /** 現在アクティブなタブ */
  activeTab: TabType;
  /** タブ切替時のハンドラ */
  onTabChange: (tab: TabType) => void;
  /** マークダウンファイルの変更状態 */
  markdownDirty?: boolean;
  /** スキーマファイルの変更状態 */
  schemaDirty?: boolean;
  /** マークダウンファイルの名前 */
  markdownFileName?: string;
  /** スキーマファイルの名前 */
  schemaFileName?: string;
}

/**
 * エディタタブコンポーネント
 * 
 * @component
 * @param {EditorTabsProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} タブUIコンポーネント
 */
export const EditorTabs: React.FC<EditorTabsProps> = ({
  currentSchemaPath,
  activeTab,
  onTabChange,
  markdownDirty = false,
  schemaDirty = false,
  markdownFileName = "Note.md",
  schemaFileName = "Schema.yaml"
}) => {
  const handleTabClick = useCallback((tab: TabType) => {
    onTabChange(tab);
  }, [onTabChange]);

  // ファイル名が長すぎる場合、表示名を短縮
  const getDisplayFileName = (fileName: string, maxLength = 20) => {
    if (fileName.length <= maxLength) return fileName;
    const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
    const name = fileName.substring(0, fileName.length - (extension ? extension.length + 1 : 0));
    
    if (name.length <= maxLength - 3 - (extension ? extension.length + 1 : 0)) {
      return fileName;
    }
    
    return `${name.substring(0, maxLength - 3 - (extension ? extension.length + 1 : 0))}...${extension ? `.${extension}` : ''}`;
  };

  return (
    <div className="border-b border-gray-200">
      <ul className="flex">
        <li className="mr-1">
          <button
            className={`py-2 px-4 ${
              activeTab === "note"
                ? "bg-white border-b-2 border-blue-500 font-medium"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
            onClick={() => handleTabClick("note")}
            title={markdownFileName}
          >
            {getDisplayFileName(markdownFileName)} {markdownDirty && "*"}
          </button>
        </li>
        <li>
          <button
            className={`py-2 px-4 ${
              activeTab === "schema"
                ? "bg-white border-b-2 border-blue-500 font-medium"
                : "bg-gray-100 hover:bg-gray-200"
            } ${!currentSchemaPath ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => currentSchemaPath && handleTabClick("schema")}
            disabled={!currentSchemaPath}
            title={!currentSchemaPath ? "スキーマパスが設定されていません" : schemaFileName}
          >
            {currentSchemaPath ? getDisplayFileName(schemaFileName) : "Schema.yaml (未設定)"} 
            {schemaDirty && "*"}
          </button>
        </li>
      </ul>
    </div>
  );
};

export default EditorTabs;
