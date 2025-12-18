import { useState, useCallback } from 'react';
import YAML from 'yaml';

// Import client-side library
import { 
  parseJsonContent, 
  generateAsyncAPISpec, 
  formatOutput,
  DEFAULT_CONFIG,
  type GeneratorConfig, 
  type ExtractedMessage, 
  type TopicSubstitution,
  type AsyncAPIVersion,
  type OutputFormat,
  type ChannelMode,
  type ServerConfig,
} from '../lib';

// Components
import { Header } from './components/Header.static';
import { ConfigPanel } from './components/ConfigPanel';
import { JsonUpload } from './components/JsonUpload';
import { MessageList } from './components/MessageList';
import { SpecPreview } from './components/SpecPreview';
import { SubstitutionPanel } from './components/SubstitutionPanel';
import { StatsPanel } from './components/StatsPanel';
import { ServerPanel } from './components/ServerPanel';

interface AppState {
  messages: ExtractedMessage[];
  config: GeneratorConfig;
  spec: string | null;
  stats: {
    messageCount: number;
    uniqueTopics: number;
    models: string[];
  };
}

const initialState: AppState = {
  messages: [],
  config: DEFAULT_CONFIG,
  spec: null,
  stats: {
    messageCount: 0,
    uniqueTopics: 0,
    models: [],
  },
};

function App() {
  const [state, setState] = useState<AppState>(initialState);
  const [error, setError] = useState<string | null>(null);

  // Update config - fully client-side
  const updateConfig = useCallback((updates: Partial<GeneratorConfig>) => {
    setState(prev => {
      // Sync version with asyncApiVersion
      const newConfig = { ...prev.config, ...updates };
      if (updates.asyncApiVersion) {
        newConfig.version = updates.asyncApiVersion;
      }
      return {
        ...prev,
        config: newConfig,
      };
    });
  }, []);

  // Upload and parse JSON - fully client-side
  const uploadJson = useCallback((content: string) => {
    try {
      const messages = parseJsonContent(content);
      
      // Calculate stats
      const uniqueTopics = new Set(messages.map(m => m.topic));
      const models = [...new Set(messages.map(m => m.modelName).filter(Boolean))] as string[];
      
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, ...messages],
        stats: {
          messageCount: prev.stats.messageCount + messages.length,
          uniqueTopics: uniqueTopics.size,
          models,
        },
      }));
      
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse JSON');
    }
  }, []);

  // Add substitution - fully client-side
  const addSubstitution = useCallback((sub: TopicSubstitution) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        topicSubstitutions: [...prev.config.topicSubstitutions, sub],
      },
    }));
  }, []);

  // Remove substitution - fully client-side
  const removeSubstitution = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        topicSubstitutions: prev.config.topicSubstitutions.filter((_, i) => i !== index),
      },
    }));
  }, []);

  // Detect parameters from topics - fully client-side
  const detectParameters = useCallback((): TopicSubstitution[] => {
    const topics = [...new Set(state.messages.map(m => m.topic))];
    const suggestions: TopicSubstitution[] = [];
    
    // Find common patterns like UUIDs, IDs, timestamps
    const patterns = [
      { pattern: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', replacement: '{uuid}', name: 'UUID' },
      { pattern: '\\d{10,13}', replacement: '{timestamp}', name: 'Timestamp' },
      { pattern: '\\d+', replacement: '{id}', name: 'Numeric ID' },
    ];

    for (const topic of topics) {
      for (const { pattern, replacement, name } of patterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(topic)) {
          const existing = suggestions.find(s => s.pattern === pattern);
          if (!existing) {
            suggestions.push({ pattern, replacement, description: `Replace ${name}s` });
          }
        }
      }
    }

    return suggestions;
  }, [state.messages]);

  // Update servers
  const updateServers = useCallback((servers: ServerConfig[]) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        servers,
      },
    }));
  }, []);

  // Generate spec - fully client-side
  const generateSpec = useCallback(() => {
    try {
      if (state.messages.length === 0) {
        setError('No messages to generate spec from');
        return;
      }

      const document = generateAsyncAPISpec(state.messages, state.config);
      const output = formatOutput(document, state.config.outputFormat);
      
      setState(prev => ({
        ...prev,
        spec: output,
      }));
      
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate spec');
    }
  }, [state.messages, state.config]);

  // Export spec - fully client-side
  const exportSpec = useCallback((format: 'yaml' | 'json', filename: string) => {
    if (!state.spec) {
      setError('No spec to export');
      return;
    }

    try {
      // Convert format if needed
      let content = state.spec;
      if (format === 'json' && state.config.outputFormat === 'yaml') {
        const doc = YAML.parse(state.spec);
        content = JSON.stringify(doc, null, 2);
      } else if (format === 'yaml' && state.config.outputFormat === 'json') {
        const doc = JSON.parse(state.spec);
        content = YAML.stringify(doc, { indent: 2 });
      }

      const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export');
    }
  }, [state.spec, state.config.outputFormat]);

  // Clear messages - fully client-side
  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [],
      spec: null,
      stats: {
        messageCount: 0,
        uniqueTopics: 0,
        models: [],
      },
    }));
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header />
      
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
            
            <ServerPanel
              servers={state.config.servers || []}
              onUpdate={updateServers}
            />
            
            <JsonUpload onUpload={uploadJson} />
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
