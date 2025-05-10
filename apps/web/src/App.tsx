import React, { useState, useCallback, useRef, useEffect } from 'react';
import YamlEditor from './components/YamlEditor';
import ErrorBadge from './components/ErrorBadge';
import useFileAccess from './hooks/useFileAccess';
import useYaml from './hooks/useYaml';

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
const schemaPath = '/schemas/note.schema.yaml';

const App: React.FC = () => {
  const [yaml, setYaml] = useState<string>(defaultYaml);
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const { fileName, openFile, saveFile } = useFileAccess();
  const { validateYaml, validationResult } = useYaml();
  const editorRef = useRef<any>(null);

  // YAML変更時の処理
  const handleYamlChange = useCallback((newValue: string) => {
    setYaml(newValue);
    setIsSaved(false);
    validateYaml(newValue, schemaPath);
  }, [validateYaml]);

  // ファイルを開く処理
  const handleOpenFile = useCallback(async () => {
    try {
      const fileInfo = await openFile();
      if (fileInfo) {
        setYaml(fileInfo.content);
        validateYaml(fileInfo.content, schemaPath);
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error opening file:', error);
      alert('ファイルを開く際にエラーが発生しました');
    }
  }, [openFile, validateYaml]);

  // ファイルを保存する処理
  const handleSaveFile = useCallback(async () => {
    try {
      const success = await saveFile(yaml);
      if (success) {
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error saving file:', error);
      alert('ファイルの保存中にエラーが発生しました');
    }
  }, [saveFile, yaml]);

  // エラーバッジクリック時のエディタ行移動
  const handleErrorClick = useCallback((line: number) => {
    if (editorRef.current && line > 0) {
      editorRef.current.setCursor(line - 1);
    }
  }, []);

  // マウント時に初回バリデーション
  useEffect(() => {
    validateYaml(yaml, schemaPath);
  }, [validateYaml, yaml]);

  return (
    <div className="flex flex-col h-screen bg-slate-100 p-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">YAML Note MVP</h1>
        
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
            Save {!isSaved && '*'}
          </button>
        </div>
      </header>
      
      <div className="flex-1 mb-4 relative">
        <YamlEditor
          value={yaml}
          onChange={handleYamlChange}
          className="h-full"
          editorRef={editorRef}
        />
        
        {/* エラーバッジ */}
        {!validationResult.success && (
          <ErrorBadge 
            errors={validationResult.errors} 
            onClick={handleErrorClick}
          />
        )}
      </div>
      
      <footer className="flex justify-between text-sm text-gray-500">
        <div>{fileName || 'Unsaved document'}</div>
        <div>
          {isSaved ? 'Saved' : 'Unsaved changes'} 
          {validationResult.success 
            ? ' • Valid YAML' 
            : ` • ${validationResult.errors.length} error(s)`}
        </div>
      </footer>
    </div>
  );
};

export default App;