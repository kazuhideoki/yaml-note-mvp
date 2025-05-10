import React, { useState, useCallback, useRef, useEffect } from 'react';
import YamlEditor from './components/YamlEditor';
import ErrorBadge from './components/ErrorBadge';
import MarkdownPreview from './components/MarkdownPreview';
import DevLogViewer from './components/DevLogViewer';
import useFileAccess from './hooks/useFileAccess';
import useYaml from './hooks/useYaml';
import useMarkdownContent from './hooks/useMarkdownContent';
import useLogger from './hooks/useLogger';
import { summarizeContent, formatError, createPerformanceMarker } from './utils/logUtils';

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

// ビューモードの定義
type ViewMode = 'split' | 'editor' | 'preview';

const App: React.FC = () => {
  const [yaml, setYaml] = useState<string>(defaultYaml);
  const [isSaved, setIsSaved] = useState<boolean>(true);
  // ビューモードの初期値をlocalStorageから取得
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const savedMode = localStorage.getItem('yaml-note-view-mode');
    return (savedMode as ViewMode) || 'split';
  });
  // 開発用ログビューア表示状態
  const [showLogViewer, setShowLogViewer] = useState<boolean>(false);

  const { fileName, openFile, saveFile } = useFileAccess();
  const { validateYaml, validationResult } = useYaml();
  const { markdownContent, error: mdError } = useMarkdownContent(yaml);
  const { log } = useLogger();
  const editorRef = useRef<any>(null);

  // ビューモード変更時にlocalStorageに保存
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('yaml-note-view-mode', mode);

    // ビューモード変更ログ
    log('info', 'view_mode_change', {
      previousMode: viewMode,
      newMode: mode
    });
  };

  // YAML変更時の処理
  const handleYamlChange = useCallback((newValue: string) => {
    setYaml(newValue);
    setIsSaved(false);

    // パフォーマンス計測開始
    const endMeasure = createPerformanceMarker('yaml_validation');

    // バリデーション実行
    validateYaml(newValue, schemaPath);

    // パフォーマンス計測終了とログ記録
    const perfData = endMeasure();
    if (perfData.duration > 50) { // 50ms以上かかった場合のみログに記録
      log('debug', 'performance_measurement', perfData);
    }

    // コンテンツ変更ログ（プライバシーに配慮）
    log('info', 'editor_change', {
      content_summary: summarizeContent(newValue),
      changed_characters: Math.abs(newValue.length - yaml.length),
    });
  }, [validateYaml, yaml, log]);

  // ファイルを開く処理
  const handleOpenFile = useCallback(async () => {
    // ファイルオープン開始ログ
    log('info', 'file_open_start');

    try {
      const fileInfo = await openFile();
      if (fileInfo) {
        setYaml(fileInfo.content);
        validateYaml(fileInfo.content, schemaPath);
        setIsSaved(true);

        // ファイルオープン成功ログ
        log('info', 'file_open_success', {
          content_summary: summarizeContent(fileInfo.content),
          filename: fileInfo.name,
          fileSize: new Blob([fileInfo.content]).size,
        });
      } else {
        // ユーザーがキャンセルした場合
        log('info', 'file_open_cancelled');
      }
    } catch (error) {
      console.error('Error opening file:', error);

      // エラーログ
      log('error', 'file_open_error', {
        error: formatError(error)
      });

      alert('ファイルを開く際にエラーが発生しました');
    }
  }, [openFile, validateYaml, log]);

  // ファイルを保存する処理
  const handleSaveFile = useCallback(async () => {
    // 保存開始ログ
    log('info', 'file_save_start', {
      content_summary: summarizeContent(yaml),
    });

    try {
      const success = await saveFile(yaml);
      if (success) {
        setIsSaved(true);

        // 保存成功ログ
        log('info', 'file_save_success', {
          fileName,
          fileSize: new Blob([yaml]).size,
          is_valid: validationResult.success,
        });
      } else {
        // キャンセルまたは失敗した場合
        log('info', 'file_save_cancelled');
      }
    } catch (error) {
      console.error('Error saving file:', error);

      // 保存エラーログ
      log('error', 'file_save_error', {
        error: formatError(error),
      });

      alert('ファイルの保存中にエラーが発生しました');
    }
  }, [saveFile, yaml, fileName, validationResult.success, log]);

  // エラーバッジクリック時のエディタ行移動
  const handleErrorClick = useCallback((line: number) => {
    if (editorRef.current && line > 0) {
      editorRef.current.setCursor(line - 1);

      // エラーナビゲーションログ
      log('info', 'error_navigation', {
        targetLine: line,
        totalErrors: validationResult.errors.length,
      });
    }
  }, [validationResult.errors.length, log]);

  // 開発者ログビューアの表示/非表示を切り替える
  const toggleLogViewer = useCallback(() => {
    setShowLogViewer(prev => !prev);
    log('debug', 'log_viewer_toggle', {
      show: !showLogViewer
    });
  }, [showLogViewer, log]);

  // マウント時に初回バリデーション
  useEffect(() => {
    validateYaml(yaml, schemaPath);
  }, [validateYaml, yaml]);

  // バリデーション結果変更時のログ記録
  useEffect(() => {
    // バリデーション結果が変わったときだけログを記録
    if (validationResult.success) {
      log('info', 'validation_success');
    } else {
      log('warn', 'validation_error', {
        errorCount: validationResult.errors.length,
        errorTypes: validationResult.errors.map(e => e.message.substring(0, 50)),
      });
    }
  }, [validationResult, log]);

  // キーボードショートカットの設定
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+1 = エディタのみ表示
      if (e.key === '1' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleViewModeChange('editor');
      }
      // Cmd/Ctrl+2 = 分割表示
      else if (e.key === '2' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleViewModeChange('split');
      }
      // Cmd/Ctrl+3 = プレビューのみ表示
      else if (e.key === '3' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleViewModeChange('preview');
      }
      // Cmd/Ctrl+L = ログビューアトグル (開発モードのみ)
      else if (e.key === 'l' && (e.metaKey || e.ctrlKey) && process.env.NODE_ENV === 'development') {
        e.preventDefault();
        toggleLogViewer();
        log('debug', 'keyboard_shortcut', { key: 'Cmd+L', action: 'toggle_log_viewer' });
      }

      // キーボード操作時には毎回ログを記録しない（必要な場合のみ）
      if (e.key !== 'Meta' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Shift') {
        log('debug', 'keyboard_input', {
          key: e.key,
          modifiers: {
            meta: e.metaKey,
            ctrl: e.ctrlKey,
            alt: e.altKey,
            shift: e.shiftKey
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleViewModeChange, toggleLogViewer, log]);

  return (
    <div className="flex flex-col h-screen bg-slate-100 p-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">YAML Note MVP</h1>

        <div className="flex items-center gap-4">
          {/* ビューモード切り替えボタン */}
          <div className="flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => handleViewModeChange('editor')}
              className={`px-3 py-1 rounded-md text-sm ${
                viewMode === 'editor'
                  ? 'bg-white shadow-sm text-gray-800'
                  : 'text-gray-600 hover:bg-gray-300'
              }`}
            >
              エディタ (⌘1)
            </button>
            <button
              onClick={() => handleViewModeChange('split')}
              className={`px-3 py-1 rounded-md text-sm ${
                viewMode === 'split'
                  ? 'bg-white shadow-sm text-gray-800'
                  : 'text-gray-600 hover:bg-gray-300'
              }`}
            >
              分割 (⌘2)
            </button>
            <button
              onClick={() => handleViewModeChange('preview')}
              className={`px-3 py-1 rounded-md text-sm ${
                viewMode === 'preview'
                  ? 'bg-white shadow-sm text-gray-800'
                  : 'text-gray-600 hover:bg-gray-300'
              }`}
            >
              プレビュー (⌘3)
            </button>
          </div>

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
        </div>
      </header>

      <div className={`flex-1 mb-4 ${
        viewMode === 'split' ? 'grid grid-cols-2 gap-4' : 'flex'
      }`}>
        {/* YAMLエディタ */}
        {(viewMode === 'editor' || viewMode === 'split') && (
          <div className="relative h-full" style={{
            width: viewMode === 'split' ? 'auto' : '100%'
          }}>
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
        )}

        {/* マークダウンプレビュー */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="bg-white rounded-md shadow overflow-auto h-full" style={{
            width: viewMode === 'split' ? 'auto' : '100%'
          }}>
            {mdError ? (
              <div className="p-4 text-red-600">{mdError}</div>
            ) : (
              <MarkdownPreview content={markdownContent} />
            )}
          </div>
        )}
      </div>

      <footer className="flex justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2">
          {fileName || 'Unsaved document'}

          {/* 開発モードでのみログビューアボタンを表示 */}
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={toggleLogViewer}
              className="ml-4 px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
              title="開発者ログビューア (⌘+L)"
            >
              ログ表示 (⌘L)
            </button>
          )}
        </div>
        <div>
          {isSaved ? 'Saved' : 'Unsaved changes'}
          {validationResult.success
            ? ' • Valid YAML'
            : ` • ${validationResult.errors.length} error(s)`}
        </div>
      </footer>

      {/* 開発者ログビューア */}
      {showLogViewer && <DevLogViewer onClose={toggleLogViewer} />}
    </div>
  );
};

export default App;