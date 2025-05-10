import React, { useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { EditorView } from '@codemirror/view';

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

  const handleChange = useCallback((value: string) => {
    onChange(value);
  }, [onChange]);

  const handleEditorCreate = useCallback((view: EditorView) => {
    editorViewRef.current = view;
  }, []);

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
        }
      }
    }
  }), []);

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