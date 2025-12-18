import { useState } from 'react';
import type { GeneratorConfig, ServerConfig } from '../../shared/types';

interface ConfigPanelProps {
  config: GeneratorConfig;
  onUpdate: (updates: Partial<GeneratorConfig>) => void;
}

export function ConfigPanel({ config, onUpdate }: ConfigPanelProps) {
  const [showAddServer, setShowAddServer] = useState(false);
  const [newServer, setNewServer] = useState<Partial<ServerConfig>>({
    name: 'production',
    url: 'localhost:1883',
    protocol: 'mqtt',
    description: 'MQTT Broker',
  });

  const addServer = () => {
    if (newServer.name && newServer.url && newServer.protocol) {
      const servers = [...(config.servers || []), newServer as ServerConfig];
      onUpdate({ servers });
      setNewServer({
        name: 'production',
        url: 'localhost:1883',
        protocol: 'mqtt',
        description: 'MQTT Broker',
      });
      setShowAddServer(false);
    }
  };

  const removeServer = (index: number) => {
    const servers = [...(config.servers || [])];
    servers.splice(index, 1);
    onUpdate({ servers });
  };
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Configuration
      </h2>

      <div className="space-y-4">
        {/* AsyncAPI Version */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            AsyncAPI Version
          </label>
          <select
            value={config.asyncApiVersion}
            onChange={(e) => onUpdate({ asyncApiVersion: e.target.value as '2.6.0' | '3.0.0' })}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="2.6.0">2.6.0</option>
            <option value="3.0.0">3.0.0</option>
          </select>
        </div>

        {/* Channel Mode */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Channel Mode
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="channelMode"
                checked={config.channelMode === 'verbose'}
                onChange={() => onUpdate({ channelMode: 'verbose' })}
                className="text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">Verbose (one channel per topic)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="channelMode"
                checked={config.channelMode === 'parameterized'}
                onChange={() => onUpdate({ channelMode: 'parameterized' })}
                className="text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm">Parameterized (use substitutions)</span>
            </label>
          </div>
        </div>

        {/* Output Format */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Output Format
          </label>
          <select
            value={config.outputFormat}
            onChange={(e) => onUpdate({ outputFormat: e.target.value as 'yaml' | 'json' })}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="yaml">YAML</option>
            <option value="json">JSON</option>
          </select>
        </div>

        {/* Include Examples */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.includeExamples}
            onChange={(e) => onUpdate({ includeExamples: e.target.checked })}
            className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-300">Include examples in schemas</span>
        </label>

        {/* API Info */}
        <div className="border-t border-slate-700 pt-4 mt-4">
          <h3 className="text-sm font-medium text-slate-300 mb-2">API Info</h3>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="API Title"
              value={config.info?.title || ''}
              onChange={(e) => onUpdate({ 
                info: { ...config.info, title: e.target.value, version: config.info?.version || '1.0.0' } 
              })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              placeholder="Version (e.g., 1.0.0)"
              value={config.info?.version || ''}
              onChange={(e) => onUpdate({ 
                info: { ...config.info, version: e.target.value, title: config.info?.title || 'Generated API' } 
              })}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Servers Configuration */}
        <div className="border-t border-slate-700 pt-4 mt-4">
          <h3 className="text-sm font-medium text-slate-300 mb-2">Servers</h3>
          <p className="text-xs text-slate-500 mb-3">
            Configure MQTT brokers that developers can subscribe to
          </p>

          {/* Existing Servers */}
          {config.servers && config.servers.length > 0 && (
            <div className="space-y-2 mb-3">
              {config.servers.map((server, index) => (
                <div key={index} className="flex items-center gap-2 bg-slate-700/50 rounded px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{server.name}</div>
                    <div className="text-xs text-slate-400 truncate">{server.protocol}://{server.url}</div>
                  </div>
                  <button
                    onClick={() => removeServer(index)}
                    className="text-red-400 hover:text-red-300 p-1"
                    title="Remove server"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Server Form */}
          {showAddServer ? (
            <div className="space-y-2 bg-slate-700/30 rounded p-3">
              <input
                type="text"
                placeholder="Server name (e.g., production)"
                value={newServer.name || ''}
                onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex gap-2">
                <select
                  value={newServer.protocol || 'mqtt'}
                  onChange={(e) => setNewServer({ ...newServer, protocol: e.target.value as ServerConfig['protocol'] })}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="mqtt">mqtt</option>
                  <option value="mqtts">mqtts</option>
                  <option value="ws">ws</option>
                  <option value="wss">wss</option>
                </select>
                <input
                  type="text"
                  placeholder="host:port"
                  value={newServer.url || ''}
                  onChange={(e) => setNewServer({ ...newServer, url: e.target.value })}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <input
                type="text"
                placeholder="Description (optional)"
                value={newServer.description || ''}
                onChange={(e) => setNewServer({ ...newServer, description: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex gap-2">
                <button
                  onClick={addServer}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded text-sm transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddServer(false)}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 text-white py-1.5 px-3 rounded text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddServer(true)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 px-3 rounded text-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Server
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
