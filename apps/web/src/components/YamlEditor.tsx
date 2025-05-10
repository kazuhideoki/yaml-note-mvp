import React, { useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import { EditorView } from '@codemirror/view';

interface YamlEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const YamlEditor: React.FC<YamlEditorProps> = ({ 
  value, 
  onChange,
  className = '' 
}) => {
  const handleChange = useCallback((value: string) => {
    onChange(value);
  }, [onChange]);

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
};

export default YamlEditor;