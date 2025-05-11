import { useState, useEffect } from "react";
import { fileSave, fileOpen, supported } from "browser-fs-access";

export interface FileInfo {
  /** ファイル内容 */
  content: string;
  /** ファイル名 */
  name: string;
}

/**
 * ファイル保存オプション
 */
interface SaveOptions {
  /** 保存時のファイル名 */
  fileName: string;
  /** 許可する拡張子 */
  extensions: string[];
  /** 開始ディレクトリやファイルハンドル */
  startIn?: any; // Handle for file system API
}

/**
 * useFileAccessの返却型
 * @typedef {object} UseFileAccessResult
 * @property {boolean} isSupported - File System Access APIのサポート有無
 * @property {() => Promise<FileInfo | null>} openFile - ファイルを開く関数
 * @property {(content: string) => Promise<boolean>} saveFile - ファイルを保存する関数
 */
/**
 * useFileAccessの返却型
 */
export type UseFileAccessResult = {
  /** 現在開いているファイル名 */
  fileName: string | null;
  /** File System Access APIのサポート有無 */
  isSupported: boolean;
  /** ファイルを開く関数 */
  openFile: () => Promise<FileInfo | null>;
  /** ファイルを保存する関数 */
  saveFile: (content: string) => Promise<boolean>;
};

/**
 * ファイルアクセス用カスタムフック
 *
 * @description
 * File System Access APIを利用し、YAMLファイルの読み書き・保存・ファイル名管理などを提供する。
 * ブラウザのサポート状況も管理し、未サポート時は警告を表示する。
 *
 * @returns {UseFileAccessResult}
 */
export function useFileAccess(): UseFileAccessResult {
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
      console.error("File System Access API is not supported in this browser");
      alert(
        "お使いのブラウザはFile System Access APIをサポートしていません。Chrome/Edge等の最新版をお使いください。",
      );
      return null;
    }

    try {
      const blob = await fileOpen({
        extensions: [".yaml", ".yml"],
        description: "YAML files",
      });

      const text = await blob.text();
      setFileName(blob.name);

      // If fileOpen returns a handle (Chrome), save it for later use
      if ("handle" in blob) {
        setFileHandle(blob.handle);
      }

      return { content: text, name: blob.name };
    } catch (error) {
      console.error("Failed to open file:", error);
      return null;
    }
  };

  const saveFile = async (content: string): Promise<boolean> => {
    if (!supported) {
      console.error("File System Access API is not supported in this browser");
      alert(
        "お使いのブラウザはFile System Access APIをサポートしていません。Chrome/Edge等の最新版をお使いください。",
      );
      return false;
    }

    try {
      const blob = new Blob([content], { type: "text/yaml" });
      const saveOptions: SaveOptions = {
        fileName: fileName || "note.yaml",
        extensions: [".yaml", ".yml"],
      };

      // If we have a file handle, use it
      if (fileHandle) {
        saveOptions.startIn = fileHandle;
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
      console.error("Failed to save file:", error);
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
