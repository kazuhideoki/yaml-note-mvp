import React, { useState, useCallback } from 'react';
import YamlEditor from './components/YamlEditor';
import useFileAccess from './hooks/useFileAccess';

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

const App: React.FC = () => {
  const [yaml, setYaml] = useState<string>(defaultYaml);
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const { fileName, isSupported, openFile, saveFile } = useFileAccess();

  const handleYamlChange = useCallback((newValue: string) => {
    setYaml(newValue);
    setIsSaved(false);
  }, []);

  const handleOpenFile = useCallback(async () => {
    try {
      const fileInfo = await openFile();
      if (fileInfo) {
        setYaml(fileInfo.content);
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error opening file:', error);
      alert('ファイルを開く際にエラーが発生しました');
    }
  }, [openFile]);

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
      
      <div className="flex-1 mb-4">
        <YamlEditor
          value={yaml}
          onChange={handleYamlChange}
          className="h-full"
        />
      </div>
      
      <footer className="flex justify-between text-sm text-gray-500">
        <div>{fileName || 'Unsaved document'}</div>
        <div>{isSaved ? 'Saved' : 'Unsaved changes'}</div>
      </footer>
    </div>
  );
};

export default App;