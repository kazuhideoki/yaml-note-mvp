/**
 * @file App.tsx
 * @description YAML Note MVPのメインアプリケーションコンポーネント。
 *              マークダウンエディタとスキーマエディタを統合し、タブインターフェースで切り替えを提供する。
 *              V3仕様に基づき、Markdownを唯一の編集・保存フォーマットとして扱う。
 */

import React, { useState, useEffect, useCallback } from 'react';
import MarkdownEditor from './components/MarkdownEditor';
import SchemaEditor from './components/SchemaEditor';
import EditorTabs, { TabType } from './components/EditorTabs';
import ValidationToggle from './components/ValidationToggle';
import { LoggerProvider } from './contexts/LoggerProvider';
import useValidator from './hooks/useValidator';
import { fetchSchema } from './utils/schema';
import { useFileAccess } from './hooks/useFileAccess';

/**
 * YAML Note MVPのメインアプリケーションコンポーネント
 *
 * @component
 * @description
 * タブベースのUIでMarkdownとSchemaの編集を提供し、リアルタイム検証を行う。
 *
 * @returns {JSX.Element} アプリケーション全体のUI
 */
const App: React.FC = () => {
  // エディタの状態管理
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [editedSchemaContent, setEditedSchemaContent] = useState<string>('');
  const [schemaPath, setSchemaPath] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('note');
  
  // ファイル操作機能
  const {
    markdownFile,
    schemaFile,
    openFile,
    saveFile,
    saveFileAs,
    updateContent,
    isDirty
  } = useFileAccess();

  // バリデーション状態
  const { errors, schemaPath: validatorSchemaPath, validated, toggleValidation } = useValidator(markdownContent);

  // スキーマロード関数
  const loadSchema = useCallback(
    async (path: string) => {
      try {
        const schema = await fetchSchema(path);
        // 初回ロード時だけ編集内容も設定
        if (!isDirty('schema') || path !== schemaPath) {
          setEditedSchemaContent(schema);
        }
        setSchemaPath(path);
      } catch (error) {
        console.error('Failed to load schema:', error);
        // エラー処理はここに追加
      }
    },
    [isDirty, schemaPath]
  );

  // useValidator からスキーマパスを取得して自動ロード
  useEffect(() => {
    if (validatorSchemaPath && validatorSchemaPath !== schemaPath) {
      loadSchema(validatorSchemaPath);
    }
  }, [validatorSchemaPath, loadSchema, schemaPath]);

  // マークダウン変更ハンドラ
  const handleMarkdownChange = useCallback((content: string) => {
    setMarkdownContent(content);
    updateContent('markdown', content);
  }, [updateContent]);
  
  // バリデーション状態トグル処理
  const handleValidationToggle = useCallback((newState: boolean) => {
    const updatedMarkdown = toggleValidation(newState);
    if (updatedMarkdown) {
      setMarkdownContent(updatedMarkdown);
      updateContent('markdown', updatedMarkdown);
    }
  }, [toggleValidation, updateContent]);

  // スキーマ変更ハンドラ
  const handleSchemaChange = useCallback((content: string) => {
    setEditedSchemaContent(content);
    updateContent('schema', content);
  }, [updateContent]);

  // マークダウン保存ハンドラ
  const saveMarkdown = useCallback(async (content: string) => {
    const success = await saveFile('markdown', content);
    if (success) {
      setMarkdownContent(content);
    }
  }, [saveFile]);

  // スキーマ保存ハンドラ
  const saveSchema = useCallback(async (_path: string, content: string) => {
    const success = await saveFile('schema', content);
    if (success) {
      setEditedSchemaContent(content);
    }
  }, [saveFile]);

  return (
    <LoggerProvider>
      <div className="min-h-screen bg-white">
        <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">YAML Note MVP</h1>
          <div className="flex space-x-2 items-center">
            <button
              className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-500"
              onClick={async () => {
                if (await openFile(activeTab === 'note' ? 'markdown' : 'schema')) {
                  // ファイルが開かれた場合の処理
                  if (activeTab === 'note') {
                    setMarkdownContent(markdownFile.content);
                  } else {
                    setEditedSchemaContent(schemaFile.content);
                  }
                }
              }}
            >
              開く
            </button>
            <button
              className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-500"
              onClick={() => {
                if (activeTab === 'note') {
                  saveMarkdown(markdownContent);
                } else if (schemaPath) {
                  saveSchema(schemaPath, editedSchemaContent);
                }
              }}
            >
              保存
            </button>
            <button
              className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-500"
              onClick={() => {
                if (activeTab === 'note') {
                  saveFileAs('markdown', markdownContent);
                } else if (schemaPath) {
                  saveFileAs('schema', editedSchemaContent);
                }
              }}
            >
              名前を付けて保存
            </button>
            
            {/* バリデーショントグル */}
            <ValidationToggle
              isValidated={validated}
              onToggle={handleValidationToggle}
              isDisabled={!validatorSchemaPath || activeTab !== 'note'}
            />
          </div>
        </header>
        <main className="container mx-auto p-4 h-[calc(100vh-8rem)]">
          <div className="flex flex-col h-full">
            <EditorTabs
              currentSchemaPath={schemaPath}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              markdownDirty={isDirty('markdown')}
              schemaDirty={isDirty('schema')}
              markdownFileName={markdownFile.name || "Note.md"}
              schemaFileName={schemaFile.name || "Schema.yaml"}
            />

            <div className="flex-grow">
              {activeTab === 'note' ? (
                <MarkdownEditor
                  initialContent={markdownContent}
                  onChange={handleMarkdownChange}
                  onSave={saveMarkdown}
                  validationErrors={errors}
                  validated={validated}
                  fileName={markdownFile.name}
                />
              ) : (
                schemaPath && (
                  <SchemaEditor
                    schemaPath={schemaPath}
                    initialSchema={editedSchemaContent}
                    onSave={content => saveSchema(schemaPath, content)}
                    active={activeTab === 'schema'}
                    onChange={handleSchemaChange}
                    fileName={schemaFile.name}
                  />
                )
              )}
            </div>
          </div>
        </main>
      </div>
    </LoggerProvider>
  );
};

export default App;
