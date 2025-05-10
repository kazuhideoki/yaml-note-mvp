import { useState, useEffect } from 'react';
import { fileSave, fileOpen, supported } from 'browser-fs-access';

interface FileInfo {
  content: string;
  name: string;
}

export function useFileAccess() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileHandle, setFileHandle] = useState<any>(null);
  // 常にサポートありとして初期化し、マウント後に確認する
  const [isSupported, setIsSupported] = useState<boolean>(true);

  // マウント後にAPIのサポート状況を確認
  useEffect(() => {
    console.log("File System Access API supported:", supported);
    setIsSupported(supported);
  }, []);

  const openFile = async (): Promise<FileInfo | null> => {
    if (!supported) {
      console.error('File System Access API is not supported in this browser');
      alert('お使いのブラウザはFile System Access APIをサポートしていません。Chrome/Edge等の最新版をお使いください。');
      return null;
    }

    try {
      const blob = await fileOpen({
        extensions: ['.yaml', '.yml'],
        description: 'YAML files',
      });
      
      const text = await blob.text();
      setFileName(blob.name);
      
      // If fileOpen returns a handle (Chrome), save it for later use
      if ('handle' in blob) {
        setFileHandle(blob.handle);
      }
      
      return { content: text, name: blob.name };
    } catch (error) {
      console.error('Failed to open file:', error);
      return null;
    }
  };

  const saveFile = async (content: string): Promise<boolean> => {
    if (!supported) {
      console.error('File System Access API is not supported in this browser');
      alert('お使いのブラウザはFile System Access APIをサポートしていません。Chrome/Edge等の最新版をお使いください。');
      return false;
    }

    try {
      const blob = new Blob([content], { type: 'text/yaml' });
      const saveOptions = {
        fileName: fileName || 'note.yaml',
        extensions: ['.yaml', '.yml'],
      };
      
      // If we have a file handle, use it
      if (fileHandle) {
        saveOptions['startIn'] = fileHandle;
      }
      
      const savedHandle = await fileSave(blob, saveOptions);
      
      if (savedHandle) {
        // Update name if it's different than current
        const name = savedHandle.name || fileName;
        if (name) setFileName(name);
        setFileHandle(savedHandle);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save file:', error);
      return false;
    }
  };

  return {
    fileName,
    isSupported,
    openFile,
    saveFile,
  };
}

export default useFileAccess;