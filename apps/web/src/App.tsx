/**
 * @file App.tsx
 * @description YAML Note MVPのメインアプリケーションコンポーネント。
 *              MarkdownエディタコンポーネントとWASMコアを連携させ、フロントマターの検証機能を提供する。
 *              V3仕様に基づき、Markdownを唯一の編集・保存フォーマットとして扱う。
 */

import React from "react";
import MarkdownEditor from "./components/MarkdownEditor";
import { LoggerProvider } from "./contexts/LoggerContext";
import useLogger from "./hooks/useLogger";
/**
 * YAML Note MVPのメインアプリケーションコンポーネント
 * 
 * @component
 * @description
 * V3仕様に基づく、Markdownをフォーマットとして使用するノートアプリケーション。
 * Markdownエディタコンポーネントを表示し、フロントマターのリアルタイム検証を行う。
 * 
 * @returns {JSX.Element} アプリケーション全体のUI
 */
const App: React.FC = () => {
  return (
    <LoggerProvider>
      <div className="min-h-screen bg-white">
        <header className="bg-gray-800 text-white p-4">
          <h1 className="text-xl font-bold">YAML Note MVP</h1>
        </header>
        <main className="container mx-auto p-4 h-[calc(100vh-8rem)]">
          <MarkdownEditor />
        </main>
      </div>
    </LoggerProvider>
  );
};

export default App;
