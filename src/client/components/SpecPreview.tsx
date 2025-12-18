import { useState } from 'react';

interface SpecPreviewProps {
  spec: string | null;
  format: 'yaml' | 'json';
  onGenerate: () => Promise<void>;
  onExport: (format: 'yaml' | 'json', filename: string) => void;
  hasMessages: boolean;
}

export function SpecPreview({ spec, format, onGenerate, onExport, hasMessages }: SpecPreviewProps) {
  const [filename, setFilename] = useState('asyncapi');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = (fmt: 'yaml' | 'json') => {
    onExport(fmt, filename || 'asyncapi');
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 h-full flex flex-col">
      <div className="p-4 border-b border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Generated Spec
          </h2>
        </div>

        {/* Filename input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Filename"
            className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="text-slate-500 text-sm">.{format}</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={!hasMessages || isGenerating}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white py-2 px-4 rounded text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              'Generate'
            )}
          </button>

          {spec && (
            <>
              <button
                onClick={() => handleExport('yaml')}
                className={`py-2 px-3 rounded text-sm transition-colors ${
                  format === 'yaml'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                ↓ YAML
              </button>
              <button
                onClick={() => handleExport('json')}
                className={`py-2 px-3 rounded text-sm transition-colors ${
                  format === 'json'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                ↓ JSON
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        {spec ? (
          <pre className="spec-preview text-slate-300 whitespace-pre-wrap text-xs leading-relaxed">
            {spec}
          </pre>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No spec generated yet</p>
              <p className="text-xs mt-1">
                {hasMessages
                  ? 'Click Generate to create AsyncAPI spec'
                  : 'Add messages first, then generate'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
