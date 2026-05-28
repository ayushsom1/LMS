'use client';

import dynamic from 'next/dynamic';

// Monaco Editor is ~2MB. Lazy load it so MCQ-only tests don't download
// the editor bundle at all, and coding tests load it on demand.
const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg overflow-hidden border border-slate-600 bg-[#1e1e1e] flex items-center justify-center" style={{ height: '400px' }}>
      <div className="w-5 h-5 border-2 border-slate-500 border-t-slate-300 rounded-full animate-spin" />
    </div>
  ),
});

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  readOnly?: boolean;
  language?: string;
}

const MONACO_LANG: Record<string, string> = {
  cpp: 'cpp',
  python: 'python',
  java: 'java',
};

export default function CodeEditor({ value, onChange, height = '400px', readOnly = false, language = 'cpp' }: CodeEditorProps) {
  return (
    <div className="rounded-lg overflow-hidden border border-slate-600">
      <Editor
        height={height}
        language={MONACO_LANG[language] || 'plaintext'}
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
