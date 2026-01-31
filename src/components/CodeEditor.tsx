'use client';

import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  readOnly?: boolean;
}

export default function CodeEditor({ value, onChange, height = '400px', readOnly = false }: CodeEditorProps) {
  return (
    <div className="rounded-lg overflow-hidden border border-slate-600">
      <Editor
        height={height}
        defaultLanguage="cpp"
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v || '')}
        options={{
          minimap: { enabled: false },
          lineNumbers: 'on',
          fontSize: 14,
          tabSize: 4,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          readOnly,
          padding: { top: 10 },
        }}
      />
    </div>
  );
}
