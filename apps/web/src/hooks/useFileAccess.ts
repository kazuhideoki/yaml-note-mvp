/**
 * ファイルアクセスフック
 * @description
 * File System Access APIを利用したファイル操作機能を提供する。
 * ファイルハンドルの管理、dirty状態の追跡、保存・読み込み処理を行う。
 */
import { useState, useCallback, useEffect } from 'react';
import useLogger from './useLogger';

interface FileState {
  handle: FileSystemFileHandle | null;
  path: string;
  name: string;
  content: string;
  dirty: boolean;
}

interface UseFileAccessReturn {
  // ファイル状態
  markdownFile: FileState;
  schemaFile: FileState;

  // ファイル操作
  openFile: (fileType: 'markdown' | 'schema') => Promise<boolean>;
  saveFile: (fileType: 'markdown' | 'schema', content: string) => Promise<boolean>;
  saveFileAs: (fileType: 'markdown' | 'schema', content: string) => Promise<boolean>;

  // 状態管理
  updateContent: (fileType: 'markdown' | 'schema', content: string) => void;
  isDirty: (fileType: 'markdown' | 'schema') => boolean;
  resetDirty: (fileType: 'markdown' | 'schema') => void;
}

export function useFileAccess(): UseFileAccessReturn {
  const { log } = useLogger();

  // ファイル状態の初期化
  const [markdownFile, setMarkdownFile] = useState<FileState>({
    handle: null,
    path: '',
    name: '',
    content: '',
    dirty: false,
  });

  const [schemaFile, setSchemaFile] = useState<FileState>({
    handle: null,
    path: '',
    name: '',
    content: '',
    dirty: false,
  });

  // File System Access APIのサポート確認
  /**
   * File System Access API が利用可能かを判定する
   *
   * @returns {boolean} 利用可能な場合は true
   */
  const isFileSystemAccessSupported = () =>
    typeof window !== 'undefined' && 'showOpenFilePicker' in window;

  // 名前を付けて保存（宣言のみ、実装は後ほど）
  const saveFileAs = useCallback(
    async (fileType: 'markdown' | 'schema', content: string): Promise<boolean> => {
      try {
        if (!isFileSystemAccessSupported()) {
          // フォールバック: Blobを作成し、aタグを使用してダウンロード
          log('warn', 'fsapi_not_supported', {
            action: 'save_as',
            fallback: 'blob_download',
          });

          const blob = new Blob([content], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileType === 'markdown' ? 'note.md' : 'schema.yaml';
          a.click();
          URL.revokeObjectURL(url);

          return true;
        }

        const options: SaveFilePickerOptions = {
          types: [
            {
              description: fileType === 'markdown' ? 'Markdown files' : 'YAML Schema files',
              accept: {
                'text/plain': fileType === 'markdown' ? ['.md'] : ['.yaml', '.yml'],
              },
            },
          ],
          suggestedName: fileType === 'markdown' ? 'note.md' : 'schema.yaml',
        };

        const fileHandle = await window.showSaveFilePicker(options);
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();

        const file = await fileHandle.getFile();

        // 対応するファイル状態を更新
        if (fileType === 'markdown') {
          setMarkdownFile({
            handle: fileHandle,
            path: file.name,
            name: file.name,
            content,
            dirty: false,
          });
        } else {
          setSchemaFile({
            handle: fileHandle,
            path: file.name,
            name: file.name,
            content,
            dirty: false,
          });
        }

        log('info', 'file_saved_as', {
          fileType,
          fileName: file.name,
          contentLength: content.length,
        });

        return true;
      } catch (error) {
        // ユーザーがキャンセルした場合はエラーとして扱わない
        if (error instanceof DOMException && error.name === 'AbortError') {
          return false;
        }

        log('error', 'file_save_as_error', {
          fileType,
          error: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
    },
    [log]
  );

  // ファイルを開く
  const openFile = useCallback(
    async (fileType: 'markdown' | 'schema'): Promise<boolean> => {
      try {
        if (!isFileSystemAccessSupported()) {
          // フォールバック: input[type=file]を使用
          log('warn', 'fsapi_not_supported', {
            action: 'open',
            fallback: 'input_file',
          });

          // input要素を作成して、クリックイベントをシミュレート
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = fileType === 'markdown' ? '.md' : '.yaml,.yml';

          // Promiseでinputのchange eventを待機
          const filePromise = new Promise<File | null>(resolve => {
            input.onchange = e => {
              const target = e.target as HTMLInputElement;
              const file = target.files?.[0] || null;
              resolve(file);
            };
          });

          input.click();

          const file = await filePromise;
          if (!file) return false;

          const content = await file.text();

          if (fileType === 'markdown') {
            setMarkdownFile({
              handle: null,
              path: file.name,
              name: file.name,
              content,
              dirty: false,
            });
          } else {
            setSchemaFile({
              handle: null,
              path: file.name,
              name: file.name,
              content,
              dirty: false,
            });
          }

          log('info', 'file_opened_fallback', {
            fileType,
            fileName: file.name,
            fileSize: file.size,
          });

          return true;
        }

        const options: OpenFilePickerOptions = {
          types: [
            {
              description: fileType === 'markdown' ? 'Markdown files' : 'YAML Schema files',
              accept: {
                'text/plain': fileType === 'markdown' ? ['.md'] : ['.yaml', '.yml'],
              },
            },
          ],
          excludeAcceptAllOption: false,
          multiple: false,
        };

        const [fileHandle] = await window.showOpenFilePicker(options);
        const file = await fileHandle.getFile();
        const content = await file.text();

        // 対応するファイル状態を更新
        if (fileType === 'markdown') {
          setMarkdownFile({
            handle: fileHandle,
            path: file.name, // 実際のパスはセキュリティ上取得できないため名前のみ
            name: file.name,
            content,
            dirty: false,
          });
        } else {
          setSchemaFile({
            handle: fileHandle,
            path: file.name,
            name: file.name,
            content,
            dirty: false,
          });
        }

        log('info', 'file_opened', {
          fileType,
          fileName: file.name,
          fileSize: file.size,
        });

        return true;
      } catch (error) {
        // ユーザーがキャンセルした場合はエラーとして扱わない
        if (error instanceof DOMException && error.name === 'AbortError') {
          return false;
        }

        log('error', 'file_open_error', {
          fileType,
          error: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
    },
    [log]
  );

  // ファイルを保存
  const saveFile = useCallback(
    async (fileType: 'markdown' | 'schema', content: string): Promise<boolean> => {
      const fileState = fileType === 'markdown' ? markdownFile : schemaFile;

      if (!fileState.handle) {
        // ハンドルがない場合は「名前を付けて保存」を実行
        return saveFileAs(fileType, content);
      }

      try {
        // 書き込み権限を確認
        if ((await fileState.handle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
          const permission = await fileState.handle.requestPermission({ mode: 'readwrite' });
          if (permission !== 'granted') {
            throw new Error('書き込み権限がありません');
          }
        }

        // ファイルに書き込み
        const writable = await fileState.handle.createWritable();
        await writable.write(content);
        await writable.close();

        // dirty状態をリセット
        if (fileType === 'markdown') {
          setMarkdownFile(prev => ({ ...prev, content, dirty: false }));
        } else {
          setSchemaFile(prev => ({ ...prev, content, dirty: false }));
        }

        log('info', 'file_saved', {
          fileType,
          fileName: fileState.name,
          contentLength: content.length,
        });

        return true;
      } catch (error) {
        log('error', 'file_save_error', {
          fileType,
          fileName: fileState.name,
          error: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
    },
    [markdownFile, schemaFile, saveFileAs, log]
  );

  // コンテンツ更新（編集）時にdirty状態を設定
  const updateContent = useCallback((fileType: 'markdown' | 'schema', content: string) => {
    if (fileType === 'markdown') {
      setMarkdownFile(prev => ({
        ...prev,
        content,
        dirty: content !== prev.content || prev.dirty,
      }));
    } else {
      setSchemaFile(prev => ({
        ...prev,
        content,
        dirty: content !== prev.content || prev.dirty,
      }));
    }
  }, []);

  // dirty状態を確認
  const isDirty = useCallback(
    (fileType: 'markdown' | 'schema'): boolean => {
      return fileType === 'markdown' ? markdownFile.dirty : schemaFile.dirty;
    },
    [markdownFile.dirty, schemaFile.dirty]
  );

  // dirty状態をリセット
  const resetDirty = useCallback((fileType: 'markdown' | 'schema') => {
    if (fileType === 'markdown') {
      setMarkdownFile(prev => ({ ...prev, dirty: false }));
    } else {
      setSchemaFile(prev => ({ ...prev, dirty: false }));
    }
  }, []);

  // ページ離脱時の未保存警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (markdownFile.dirty || schemaFile.dirty) {
        e.preventDefault();
        // Chrome要件：returnValueを設定
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [markdownFile.dirty, schemaFile.dirty]);

  return {
    markdownFile,
    schemaFile,
    openFile,
    saveFile,
    saveFileAs,
    updateContent,
    isDirty,
    resetDirty,
  };
}
