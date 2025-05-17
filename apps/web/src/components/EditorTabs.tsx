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
 * EditorTabsのprops型
 * @property {string | null} currentSchemaPath - 現在のスキーマパス（nullの場合はスキーマ未設定）
 * @property {TabType} activeTab - 現在アクティブなタブ
 * @property {(tab: TabType) => void} onTabChange - タブ切替時のハンドラ
 * @property {boolean} markdownDirty - マークダウンファイルの変更状態
 * @property {boolean} schemaDirty - スキーマファイルの変更状態
 * @property {string} markdownFileName - マークダウンファイルの名前
 * @property {string} schemaFileName - スキーマファイルの名前
 */
export interface EditorTabsProps {
  currentSchemaPath: string | null;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  markdownDirty?: boolean;
  schemaDirty?: boolean;
  markdownFileName?: string;
  schemaFileName?: string;
}

/**
 * エディタタブコンポーネント
 * 
 * @component
 * @param {EditorTabsProps} props - コンポーネントのプロパティ
 * @param {string | null} props.currentSchemaPath - 現在のスキーマパス（nullの場合はスキーマ未設定）
 * @param {TabType} props.activeTab - 現在アクティブなタブ
 * @param {function} props.onTabChange - タブ変更時のコールバック関数
 * @param {boolean} [props.markdownDirty] - マークダウンファイルの変更状態
 * @param {boolean} [props.schemaDirty] - スキーマファイルの変更状態
 * @param {string} [props.markdownFileName] - マークダウンファイルの名前
 * @param {string} [props.schemaFileName] - スキーマファイルの名前
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
