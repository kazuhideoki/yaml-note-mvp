import React, { useCallback, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { EditorView } from '@codemirror/view';
import useLogger from '../hooks/useLogger';
import { throttle } from '../utils/logUtils';

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  editorRef?: React.Ref<{
    setCursor: (line: number) => void;
  }>;
}

export const YamlEditor: React.FC<YamlEditorProps> = forwardRef(({
  value,
  onChange,
  className = '',
  editorRef
}, _ref) => {
  const editorViewRef = useRef<EditorView | null>(null);
  const { log } = useLogger();

  const handleChange = useCallback((value: string) => {
    onChange(value);
  }, [onChange]);

  // エディタ関連のイベントのスロットル処理
  const throttledCursorLog = useRef(throttle((position: any) => {
    log('debug', 'editor_cursor_move', { position });
  }, 500)); // 500ms間隔でスロットル

  const handleEditorCreate = useCallback((view: EditorView) => {
    editorViewRef.current = view;

    // エディタ初期化ログ
    log('info', 'editor_initialized', {
      config: {
        lineNumbers: true,
        highlightActiveLine: true,
        mode: 'yaml',
      }
    });
  }, [log]);

  // REF APIの実装
  useImperativeHandle(editorRef, () => ({
    setCursor: (line: number) => {
      if (editorViewRef.current) {
        const state = editorViewRef.current.state;
        const lines = state.doc.lines;

        if (line >= 0 && line < lines) {
          const pos = state.doc.line(line + 1).from;

          // カーソル位置の設定とスクロール位置の調整
          const transaction = state.update({
            selection: { anchor: pos, head: pos },
            scrollIntoView: true,
          });

          editorViewRef.current.dispatch(transaction);
          editorViewRef.current.focus();

          // カーソル移動ログ
          log('debug', 'editor_cursor_set', {
            line,
            position: pos,
          });
        }
      }
    }
  }), [log]);

  // エディタイベントのリスナー設定
  useEffect(() => {
    const editorView = editorViewRef.current;
    if (!editorView) return;

    // フォーカスイベントの監視
    const focusHandler = () => {
      log('info', 'editor_focus', { state: 'gained' });
    };

    const blurHandler = () => {
      log('info', 'editor_focus', { state: 'lost' });
    };

    // カーソル位置変更イベントのリスナー（キーアップでトリガー）
    const keyupHandler = () => {
      if (!editorView) return;

      const state = editorView.state;
      const selection = state.selection.main;
      const line = state.doc.lineAt(selection.from).number;

      throttledCursorLog.current({
        from: selection.from,
        to: selection.to,
        line: line,
        isSelection: selection.from !== selection.to,
      });
    };

    // DOMイベントリスナーの登録
    editorView.dom.addEventListener('focus', focusHandler);
    editorView.dom.addEventListener('blur', blurHandler);
    editorView.dom.addEventListener('keyup', keyupHandler);

    // クリーンアップ関数
    return () => {
      if (editorView && editorView.dom) {
        editorView.dom.removeEventListener('focus', focusHandler);
        editorView.dom.removeEventListener('blur', blurHandler);
        editorView.dom.removeEventListener('keyup', keyupHandler);
      }
    };
  }, [log]);

  return (
    <div className={`h-full w-full border border-gray-300 rounded overflow-hidden ${className}`}>
      <CodeMirror
        value={value}
        height="100%"
        extensions={[
          yaml(),
          EditorView.lineWrapping,
        ]}
        onChange={handleChange}
        onCreateEditor={handleEditorCreate}
        theme="light"
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          foldGutter: true,
          autocompletion: true,
          indentOnInput: true,
        }}
      />
    </div>
  );
});

export default YamlEditor;