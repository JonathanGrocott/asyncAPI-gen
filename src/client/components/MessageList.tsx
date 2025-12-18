import type { ExtractedMessage } from '../../shared/types';

interface MessageListProps {
  messages: ExtractedMessage[];
  onClear: () => void;
}

export function MessageList({ messages, onClear }: MessageListProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Messages
          <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full text-slate-400">
            {messages.length}
          </span>
        </h2>
        
        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-sm">No messages yet</p>
          <p className="text-xs mt-1">Upload JSON or connect to MQTT</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {messages.slice(-50).reverse().map((msg, index) => (
            <div
              key={index}
              className="bg-slate-700/50 rounded p-2 text-xs hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-mono text-blue-400 truncate flex-1" title={msg.topic}>
                  {msg.topic}
                </span>
                {msg.modelName && (
                  <span className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                    {msg.modelName}
                  </span>
                )}
              </div>
              <pre className="text-slate-400 overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(msg.payload, null, 1).slice(0, 200)}
                {JSON.stringify(msg.payload).length > 200 && '...'}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
