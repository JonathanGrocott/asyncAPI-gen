interface StatsPanelProps {
  stats: {
    messageCount: number;
    uniqueTopics: number;
    models: string[];
  };
}

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Statistics
      </h2>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.messageCount}</div>
          <div className="text-xs text-slate-500">Messages</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{stats.uniqueTopics}</div>
          <div className="text-xs text-slate-500">Topics</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">{stats.models.length}</div>
          <div className="text-xs text-slate-500">Models</div>
        </div>
      </div>

      {stats.models.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <p className="text-xs text-slate-400 mb-2">Detected models:</p>
          <div className="flex flex-wrap gap-1">
            {stats.models.map((model, i) => (
              <span
                key={i}
                className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded"
              >
                {model}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
