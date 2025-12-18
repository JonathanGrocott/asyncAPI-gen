import { useState } from 'react';
import type { TopicSubstitution } from '../../shared/types';

interface SubstitutionPanelProps {
  substitutions: TopicSubstitution[];
  onAdd: (sub: TopicSubstitution) => void;
  onRemove: (index: number) => void;
  onDetect: () => Promise<TopicSubstitution[]>;
  channelMode: 'verbose' | 'parameterized';
}

export function SubstitutionPanel({ 
  substitutions, 
  onAdd, 
  onRemove, 
  onDetect,
  channelMode 
}: SubstitutionPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [levelIndex, setLevelIndex] = useState('0');
  const [parameterName, setParameterName] = useState('');
  const [description, setDescription] = useState('');
  const [values, setValues] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [suggestions, setSuggestions] = useState<TopicSubstitution[]>([]);

  const handleAdd = () => {
    if (parameterName) {
      onAdd({
        levelIndex: parseInt(levelIndex, 10),
        parameterName,
        description: description || undefined,
        values: values ? values.split(',').map(v => v.trim()) : undefined,
      });
      resetForm();
    }
  };

  const resetForm = () => {
    setLevelIndex('0');
    setParameterName('');
    setDescription('');
    setValues('');
    setShowForm(false);
  };

  const handleDetect = async () => {
    setIsDetecting(true);
    try {
      const detected = await onDetect();
      setSuggestions(detected);
    } finally {
      setIsDetecting(false);
    }
  };

  const addSuggestion = (suggestion: TopicSubstitution) => {
    onAdd(suggestion);
    setSuggestions(suggestions.filter(s => s.parameterName !== suggestion.parameterName));
  };

  if (channelMode === 'verbose') {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-slate-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Topic Parameters
        </h2>
        <p className="text-xs text-slate-500">
          Switch to Parameterized mode in config to enable topic substitutions
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Topic Parameters
        </h2>
        
        <div className="flex gap-2">
          <button
            onClick={handleDetect}
            disabled={isDetecting}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
          >
            {isDetecting ? 'Detecting...' : 'Auto-detect'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs text-green-400 hover:text-green-300 transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Suggestions from auto-detect */}
      {suggestions.length > 0 && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
          <p className="text-xs text-blue-400 mb-2">Suggested parameters:</p>
          <div className="space-y-2">
            {suggestions.map((sug, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-300">Level {sug.levelIndex}:</span>{' '}
                  <span className="text-blue-300 font-mono">{`{${sug.parameterName}}`}</span>
                  <span className="text-slate-500 ml-1">
                    ({sug.values?.length || 0} values)
                  </span>
                </div>
                <button
                  onClick={() => addSuggestion(sug)}
                  className="text-green-400 hover:text-green-300"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => setSuggestions([])}
            className="text-xs text-slate-500 hover:text-slate-400 mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="mb-4 p-3 bg-slate-700/50 rounded space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Level index"
              value={levelIndex}
              onChange={(e) => setLevelIndex(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Parameter name"
              value={parameterName}
              onChange={(e) => setParameterName(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Values (comma-separated, optional)"
            value={values}
            onChange={(e) => setValues(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-xs focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={resetForm}
              className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-1 px-2 rounded text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!parameterName}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white py-1 px-2 rounded text-xs transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Current substitutions */}
      {substitutions.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-2">
          No substitutions configured
        </p>
      ) : (
        <div className="space-y-2">
          {substitutions.map((sub, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-2 p-2 bg-slate-700/50 rounded text-xs"
            >
              <div>
                <span className="text-slate-400">Level {sub.levelIndex}:</span>{' '}
                <span className="text-orange-300 font-mono">{`{${sub.parameterName}}`}</span>
                {sub.values && (
                  <span className="text-slate-500 ml-1">
                    [{sub.values.slice(0, 3).join(', ')}
                    {sub.values.length > 3 && `, +${sub.values.length - 3}`}]
                  </span>
                )}
              </div>
              <button
                onClick={() => onRemove(index)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
