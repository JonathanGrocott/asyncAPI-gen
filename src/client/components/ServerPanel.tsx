import { useState } from 'react';
import type { ServerConfig } from '../../lib/types';

interface ServerPanelProps {
  servers: ServerConfig[];
  onUpdate: (servers: ServerConfig[]) => void;
}

export function ServerPanel({ servers, onUpdate }: ServerPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newServer, setNewServer] = useState<Partial<ServerConfig>>({
    name: 'production',
    protocol: 'mqtt',
    url: '',
    description: '',
  });

  const handleAdd = () => {
    if (newServer.name && newServer.url && newServer.protocol) {
      onUpdate([...servers, newServer as ServerConfig]);
      setNewServer({
        name: 'production',
        protocol: 'mqtt',
        url: '',
        description: '',
      });
      setIsAdding(false);
    }
  };

  const handleRemove = (index: number) => {
    onUpdate(servers.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
          Servers
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-sm text-purple-400 hover:text-purple-300"
          >
            + Add Server
          </button>
        )}
      </div>

      {/* Server list */}
      <div className="space-y-2 mb-4">
        {servers.length === 0 && !isAdding && (
          <p className="text-sm text-slate-500 italic">
            No servers configured. Add a server to include it in the generated spec.
          </p>
        )}
        
        {servers.map((server, index) => (
          <div 
            key={index}
            className="flex items-center justify-between bg-slate-700/50 rounded p-2"
          >
            <div>
              <span className="text-white font-medium">{server.name}</span>
              <span className="text-slate-400 text-sm ml-2">
                {server.protocol}://{server.url}
              </span>
              {server.description && (
                <span className="text-slate-500 text-xs ml-2">({server.description})</span>
              )}
            </div>
            <button
              onClick={() => handleRemove(index)}
              className="text-red-400 hover:text-red-300 p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Add server form */}
      {isAdding && (
        <div className="bg-slate-700/30 rounded p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name</label>
              <input
                type="text"
                value={newServer.name || ''}
                onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                placeholder="e.g., production"
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Protocol</label>
              <select
                value={newServer.protocol || 'mqtt'}
                onChange={(e) => setNewServer({ ...newServer, protocol: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="mqtt">mqtt</option>
                <option value="mqtts">mqtts</option>
                <option value="amqp">amqp</option>
                <option value="amqps">amqps</option>
                <option value="kafka">kafka</option>
                <option value="kafka-secure">kafka-secure</option>
                <option value="ws">ws</option>
                <option value="wss">wss</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-slate-400 mb-1">URL/Host</label>
            <input
              type="text"
              value={newServer.url || ''}
              onChange={(e) => setNewServer({ ...newServer, url: e.target.value })}
              placeholder="e.g., broker.example.com:1883"
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-xs text-slate-400 mb-1">Description (optional)</label>
            <input
              type="text"
              value={newServer.description || ''}
              onChange={(e) => setNewServer({ ...newServer, description: e.target.value })}
              placeholder="e.g., Production MQTT Broker"
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newServer.name || !newServer.url}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Server
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
