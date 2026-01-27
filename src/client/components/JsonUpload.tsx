import { useCallback, useState } from 'react';

interface JsonUploadProps {
  onUpload: (content: string, type: 'json' | 'highbyte') => void;
}

export function JsonUpload({ onUpload }: JsonUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [uploadType, setUploadType] = useState<'json' | 'highbyte'>('json');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const detectFileType = (_filename: string, content: string): 'json' | 'highbyte' => {
    try {
      const parsed = JSON.parse(content);
      // Check if it's a HighByte project export
      if (parsed.productInfo?.product === 'IntelligenceHub' && parsed.project) {
        console.log('✅ Detected HighByte Intelligence Hub project export');
        return 'highbyte';
      }
    } catch (error) {
      console.error('Failed to parse JSON for file type detection:', error);
    }
    console.log('📄 Detected regular JSON file');
    return 'json';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          const type = detectFileType(file.name, content);
          onUpload(content, type);
        };
        reader.readAsText(file);
      }
    }
  }, [onUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const type = detectFileType(file.name, content);
        onUpload(content, type);
      };
      reader.readAsText(file);
    }
    e.target.value = ''; // Reset input
  }, [onUpload]);

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onUpload(textInput, uploadType);
      setTextInput('');
      setShowTextInput(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        JSON Input
      </h2>

      {!showTextInput ? (
        <>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            <svg className="w-10 h-10 mx-auto text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-slate-400 mb-2">
              Drag & drop a JSON file here
            </p>
            <p className="text-xs text-slate-500 mb-2">
              Supports JSON samples or HighByte Intelligence Hub exports
            </p>
            <label className="inline-block">
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="text-blue-400 hover:text-blue-300 cursor-pointer text-sm underline">
                or click to browse
              </span>
            </label>
          </div>

          <button
            onClick={() => setShowTextInput(true)}
            className="w-full mt-3 text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            Or paste JSON directly →
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setUploadType('json')}
              className={`flex-1 py-1.5 px-3 rounded text-xs transition-colors ${
                uploadType === 'json'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:text-slate-300'
              }`}
            >
              JSON Samples
            </button>
            <button
              onClick={() => setUploadType('highbyte')}
              className={`flex-1 py-1.5 px-3 rounded text-xs transition-colors ${
                uploadType === 'highbyte'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:text-slate-300'
              }`}
            >
              HighByte Project
            </button>
          </div>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={
              uploadType === 'json'
                ? 'Paste your JSON samples here...'
                : 'Paste your HighByte Intelligence Hub project export here...'
            }
            className="w-full h-40 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowTextInput(false)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleTextSubmit}
              disabled={!textInput.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white py-2 px-4 rounded transition-colors text-sm"
            >
              Load {uploadType === 'json' ? 'JSON' : 'HighByte'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
