import { useState } from 'react';

interface MQTTPanelProps {
  status: {
    connected: boolean;
    subscribedTopics: string[];
    messageCount: number;
  };
  onConnect: (config: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    topics?: string[];
  }) => void;
  onDisconnect: () => void;
  onSubscribe: (topic: string) => void;
}

export function MQTTPanel({ status, onConnect, onDisconnect, onSubscribe }: MQTTPanelProps) {
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('1883');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newTopic, setNewTopic] = useState('#');

  const handleConnect = () => {
    onConnect({
      host,
      port: parseInt(port, 10),
      username: username || undefined,
      password: password || undefined,
      topics: newTopic ? [newTopic] : undefined,
    });
  };

  const handleSubscribe = () => {
    if (newTopic) {
      onSubscribe(newTopic);
      setNewTopic('');
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
        MQTT Connection
        {status.connected && (
          <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
            Connected
          </span>
        )}
      </h2>

      {!status.connected ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Host"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Port"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Username (optional)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="password"
              placeholder="Password (optional)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <input
            type="text"
            placeholder="Initial topic (e.g., # for all)"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          <button
            onClick={handleConnect}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors"
          >
            Connect
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-slate-300">
            <p><strong>Messages received:</strong> {status.messageCount}</p>
          </div>

          <div>
            <p className="text-xs text-slate-400 mb-1">Subscribed topics:</p>
            <div className="flex flex-wrap gap-1">
              {status.subscribedTopics.map((topic, i) => (
                <span key={i} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                  {topic}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add topic subscription"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubscribe()}
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSubscribe}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded transition-colors text-sm"
            >
              Subscribe
            </button>
          </div>

          <button
            onClick={onDisconnect}
            className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 py-2 px-4 rounded border border-red-600/30 transition-colors text-sm"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
