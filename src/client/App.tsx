import { useState, useEffect, useCallback, useRef } from 'react';
import type { GeneratorConfig, ExtractedMessage, TopicSubstitution, WSMessage } from '../shared/types';

// Components
import { Header } from './components/Header';
import { ConfigPanel } from './components/ConfigPanel';
import { MQTTPanel } from './components/MQTTPanel';
import { JsonUpload } from './components/JsonUpload';
import { MessageList } from './components/MessageList';
import { SpecPreview } from './components/SpecPreview';
import { SubstitutionPanel } from './components/SubstitutionPanel';
import { StatsPanel } from './components/StatsPanel';

interface AppState {
  messages: ExtractedMessage[];
  config: GeneratorConfig;
  spec: string | null;
  mqttStatus: {
    connected: boolean;
    subscribedTopics: string[];
    messageCount: number;
  };
  stats: {
    messageCount: number;
    uniqueTopics: number;
    models: string[];
  };
}

const initialState: AppState = {
  messages: [],
  config: {
    asyncApiVersion: '3.0.0',
    channelMode: 'verbose',
    topicSubstitutions: [],
    outputFormat: 'yaml',
    includeExamples: true,
  },
  spec: null,
  mqttStatus: {
    connected: false,
    subscribedTopics: [],
    messageCount: 0,
  },
  stats: {
    messageCount: 0,
    uniqueTopics: 0,
    models: [],
  },
};

function App() {
  const [state, setState] = useState<AppState>(initialState);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket connection
  useEffect(() => {
    const connectWS = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:${window.location.port}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWS, 3000);
      };

      ws.onerror = () => {
        setError('WebSocket connection error');
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          handleWSMessage(message);
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };
    };

    connectWS();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleWSMessage = useCallback((message: WSMessage) => {
    switch (message.type) {
      case 'state':
        setState(message.payload as AppState);
        break;
      case 'mqtt_message':
        setState(prev => ({
          ...prev,
          messages: [...prev.messages.slice(-99), message.payload as ExtractedMessage],
          stats: {
            ...prev.stats,
            messageCount: prev.stats.messageCount + 1,
          },
        }));
        break;
      case 'mqtt_connected':
        setState(prev => ({
          ...prev,
          mqttStatus: { ...prev.mqttStatus, connected: true },
        }));
        break;
      case 'mqtt_disconnected':
        setState(prev => ({
          ...prev,
          mqttStatus: { ...prev.mqttStatus, connected: false },
        }));
        break;
      case 'error':
        setError((message.payload as { message: string }).message);
        break;
    }
  }, []);

  // API calls
  const updateConfig = async (updates: Partial<GeneratorConfig>) => {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update config');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const uploadJson = async (content: string) => {
    try {
      const response = await fetch('/api/upload/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error('Failed to upload JSON');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const connectMQTT = async (config: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    topics?: string[];
  }) => {
    try {
      const response = await fetch('/api/mqtt/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Failed to connect to MQTT broker');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const disconnectMQTT = async () => {
    try {
      await fetch('/api/mqtt/disconnect', { method: 'POST' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const subscribeMQTT = async (topic: string) => {
    try {
      const response = await fetch('/api/mqtt/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      if (!response.ok) throw new Error('Failed to subscribe');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const addSubstitution = async (sub: TopicSubstitution) => {
    try {
      const response = await fetch('/api/substitutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
      if (!response.ok) throw new Error('Failed to add substitution');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const removeSubstitution = async (index: number) => {
    try {
      const response = await fetch(`/api/substitutions/${index}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove substitution');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const detectParameters = async () => {
    try {
      const response = await fetch('/api/detect-parameters', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to detect parameters');
      const data = await response.json();
      return data.suggestions as TopicSubstitution[];
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      return [];
    }
  };

  const generateSpec = async () => {
    try {
      const response = await fetch('/api/generate', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to generate spec');
      const data = await response.json();
      // Update local state with the generated spec
      if (data.output) {
        setState(prev => ({
          ...prev,
          spec: data.output,
        }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const exportSpec = async (format: 'yaml' | 'json', filename: string) => {
    try {
      const response = await fetch(`/api/export?format=${format}`);
      if (!response.ok) throw new Error('Failed to export');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const clearMessages = async () => {
    try {
      await fetch('/api/clear', { method: 'POST' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header isConnected={isConnected} />
      
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-2 mx-4 mt-4 rounded">
          {error}
          <button 
            onClick={() => setError(null)}
            className="float-right text-red-300 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Input */}
          <div className="space-y-6">
            <ConfigPanel 
              config={state.config} 
              onUpdate={updateConfig} 
            />
            
            <JsonUpload onUpload={uploadJson} />
            
            <MQTTPanel
              status={state.mqttStatus}
              onConnect={connectMQTT}
              onDisconnect={disconnectMQTT}
              onSubscribe={subscribeMQTT}
            />
          </div>

          {/* Middle Column - Messages & Substitutions */}
          <div className="space-y-6">
            <StatsPanel stats={state.stats} />
            
            <SubstitutionPanel
              substitutions={state.config.topicSubstitutions}
              onAdd={addSubstitution}
              onRemove={removeSubstitution}
              onDetect={detectParameters}
              channelMode={state.config.channelMode}
            />
            
            <MessageList 
              messages={state.messages}
              onClear={clearMessages}
            />
          </div>

          {/* Right Column - Output */}
          <div className="space-y-6">
            <SpecPreview
              spec={state.spec}
              format={state.config.outputFormat}
              onGenerate={generateSpec}
              onExport={exportSpec}
              hasMessages={state.stats.messageCount > 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
