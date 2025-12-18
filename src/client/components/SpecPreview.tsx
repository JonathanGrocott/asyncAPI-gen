interface SpecPreviewProps {
  spec: string | null;
  format: 'yaml' | 'json';
  onGenerate: () => void;
  onExport: (format: 'yaml' | 'json') => void;
  hasMessages: boolean;
}

export function SpecPreview({ spec, format, onGenerate, onExport, hasMessages }: SpecPreviewProps) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Generated Spec
        </h2>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onGenerate}
            disabled={!hasMessages}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white py-1.5 px-3 rounded text-sm transition-colors"
          >
            Generate
          </button>
          
          {spec && (
            <div className="flex rounded overflow-hidden border border-slate-600">
              <button
                onClick={() => onExport('yaml')}
                className={`px-2 py-1 text-xs transition-colors ${
                  format === 'yaml' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                YAML
              </button>
              <button
                onClick={() => onExport('json')}
                className={`px-2 py-1 text-xs transition-colors ${
                  format === 'json' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                JSON
              </button>
            </div>
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
