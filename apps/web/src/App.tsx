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
import { LoggerProvider } from './contexts/LoggerContext';
import useValidator from './hooks/useValidator';
import { fetchSchema } from './utils/schema';

/**
 * YAML Note MVPのメインアプリケーションコンポーネント
 *
 * @component
 * @description
 * V3仕様に基づく、Markdownをフォーマットとして使用するノートアプリケーション。
 * タブベースのUIでMarkdownとSchemaの編集を提供し、リアルタイム検証を行う。
 *
 * @returns {JSX.Element} アプリケーション全体のUI
 */
const App: React.FC = () => {
  // エディタの状態管理
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [schemaContent, setSchemaContent] = useState<string>('');
  const [schemaPath, setSchemaPath] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('note');

  // バリデーション状態
  const { errors, schemaPath: validatorSchemaPath } = useValidator(markdownContent);

  // スキーマロード関数
  const loadSchema = useCallback(async (path: string) => {
    try {
      const schema = await fetchSchema(path);
      setSchemaContent(schema);
      setSchemaPath(path);
    } catch (error) {
      console.error('Failed to load schema:', error);
      // エラー処理はここに追加
    }
  }, []);

  // useValidator からスキーマパスを取得して自動ロード
  useEffect(() => {
    if (validatorSchemaPath && validatorSchemaPath !== schemaPath) {
      loadSchema(validatorSchemaPath);
    }
  }, [validatorSchemaPath, loadSchema, schemaPath]);

  // マークダウン保存ハンドラ
  const saveMarkdown = useCallback((content: string) => {
    // ここにマークダウンファイル保存ロジックを実装
    console.log('Saving markdown:', content);
    setMarkdownContent(content);
  }, []);

  // スキーマ保存ハンドラ
  const saveSchema = useCallback((path: string, content: string) => {
    // ここにスキーマファイル保存ロジックを実装
    console.log('Saving schema:', path, content);
    setSchemaContent(content);
  }, []);

  return (
    <LoggerProvider>
      <div className="min-h-screen bg-white">
        <header className="bg-gray-800 text-white p-4">
          <h1 className="text-xl font-bold">YAML Note MVP</h1>
        </header>
        <main className="container mx-auto p-4 h-[calc(100vh-8rem)]">
          <div className="flex flex-col h-full">
            <EditorTabs 
              currentSchemaPath={schemaPath}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
            
            <div className="flex-grow">
              {activeTab === 'note' ? (
                <MarkdownEditor 
                  initialContent={markdownContent}
                  onChange={setMarkdownContent}
                  onSave={saveMarkdown}
                  validationErrors={errors}
                />
              ) : (
                schemaPath && (
                  <SchemaEditor
                    schemaPath={schemaPath}
                    initialSchema={schemaContent}
                    onSave={(content) => saveSchema(schemaPath, content)}
                    active={activeTab === 'schema'}
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
