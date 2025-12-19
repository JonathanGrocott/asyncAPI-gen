/**
 * AsyncAPI Generator - Main Server (Express)
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import type { 
  ProjectState, 
  GeneratorConfig, 
  ExtractedMessage,
  TopicSubstitution,
  WSMessage 
} from './shared/types.js';
import { loadJsonFile, parseJsonContent, groupByModel } from './loader/index.js';
import { buildChannels, detectParameters } from './channels/index.js';
import { SchemaRegistry, getSchemaRegistry, resetSchemaRegistry } from './registry/index.js';
import { 
  generateAsyncAPIFromChannels, 
  exportDocument, 
  mergeAsyncAPIDocs,
  AsyncAPIDocument 
} from './generators/index.js';
import { MQTTListener, createMQTTListener } from './mqtt/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Extended state with proper typing for server
interface ServerProjectState extends Omit<ProjectState, 'generatedSpec'> {
  generatedSpec: AsyncAPIDocument | null;
}

// Global state
let projectState: ServerProjectState = {
  messages: [],
  config: {
    asyncApiVersion: '3.0.0',
    channelMode: 'verbose',
    topicSubstitutions: [],
    outputFormat: 'yaml',
    includeExamples: true,
  },
  generatedSpec: null,
};

let mqttListener: MQTTListener | null = null;
const wsClients: Set<WebSocket> = new Set();

// Create Express app
const app = express();
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../../dist/client')));
}

// WebSocket connection handler
wss.on('connection', (socket: WebSocket) => {
  wsClients.add(socket);
  
  // Send current state on connect
  sendToClient(socket, {
    type: 'state',
    payload: getStateForClient(),
  });

  socket.on('message', (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString()) as WSMessage;
      handleWebSocketMessage(socket, data);
    } catch (error) {
      sendToClient(socket, {
        type: 'error',
        payload: { message: 'Invalid message format' },
      });
    }
  });

  socket.on('close', () => {
    wsClients.delete(socket);
  });
});

// API Routes

/**
 * Get current project state
 */
app.get('/api/state', (req: Request, res: Response) => {
  res.json(getStateForClient());
});

/**
 * Update configuration
 */
app.post('/api/config', (req: Request, res: Response) => {
  projectState.config = {
    ...projectState.config,
    ...req.body,
  };
  
  // Regenerate spec if we have messages
  if (projectState.messages.length > 0) {
    regenerateSpec();
  }
  
  broadcastState();
  res.json({ success: true, config: projectState.config });
});

/**
 * Upload JSON file
 */
app.post('/api/upload/json', (req: Request, res: Response) => {
  try {
    const messages = parseJsonContent(req.body.content);
    
    // Add to existing messages or replace
    projectState.messages = [...projectState.messages, ...messages];
    
    // Regenerate spec
    regenerateSpec();
    
    broadcastState();
    
    res.json({
      success: true,
      messagesAdded: messages.length,
      totalMessages: projectState.messages.length,
    });
  } catch (error) {
    res.status(400).json({ error: 'Failed to parse JSON content' });
  }
});

/**
 * Load JSON from file path (for development/testing)
 */
app.post('/api/load/file', async (req: Request, res: Response) => {
  try {
    const messages = await loadJsonFile(req.body.filePath);
    
    projectState.messages = [...projectState.messages, ...messages];
    regenerateSpec();
    broadcastState();
    
    res.json({
      success: true,
      messagesAdded: messages.length,
      totalMessages: projectState.messages.length,
    });
  } catch (error) {
    res.status(400).json({ 
      error: `Failed to load file: ${error instanceof Error ? error.message : String(error)}` 
    });
  }
});

/**
 * Connect to MQTT broker
 */
app.post('/api/mqtt/connect', async (req: Request, res: Response) => {
  try {
    // Disconnect existing connection
    if (mqttListener) {
      await mqttListener.disconnect();
    }
    
    projectState.config.mqtt = {
      host: req.body.host,
      port: req.body.port,
      username: req.body.username,
      password: req.body.password,
    };
    
    mqttListener = createMQTTListener(projectState.config.mqtt);
    
    // Set up event handlers
    mqttListener.on('message', (message: ExtractedMessage) => {
      projectState.messages.push(message);
      
      // Broadcast new message to WebSocket clients
      broadcast({
        type: 'mqtt_message',
        payload: message,
      });
    });
    
    mqttListener.on('connected', () => {
      broadcast({ type: 'mqtt_connected', payload: null });
    });
    
    mqttListener.on('disconnected', () => {
      broadcast({ type: 'mqtt_disconnected', payload: null });
    });
    
    mqttListener.on('error', (error: Error) => {
      broadcast({ type: 'error', payload: { message: error.message } });
    });
    
    await mqttListener.connect();
    
    // Subscribe to specified topics
    if (req.body.topics) {
      for (const topic of req.body.topics) {
        await mqttListener.subscribe(topic);
      }
    }
    
    res.json({ success: true, status: mqttListener.getStatus() });
  } catch (error) {
    res.status(500).json({ 
      error: `Failed to connect: ${error instanceof Error ? error.message : String(error)}` 
    });
  }
});

/**
 * Subscribe to MQTT topic
 */
app.post('/api/mqtt/subscribe', async (req: Request, res: Response) => {
  if (!mqttListener || !mqttListener.isConnected()) {
    res.status(400).json({ error: 'Not connected to MQTT broker' });
    return;
  }
  
  await mqttListener.subscribe(req.body.topic);
  res.json({ success: true, status: mqttListener.getStatus() });
});

/**
 * Unsubscribe from MQTT topic
 */
app.post('/api/mqtt/unsubscribe', async (req: Request, res: Response) => {
  if (!mqttListener || !mqttListener.isConnected()) {
    res.status(400).json({ error: 'Not connected to MQTT broker' });
    return;
  }
  
  await mqttListener.unsubscribe(req.body.topic);
  res.json({ success: true, status: mqttListener.getStatus() });
});

/**
 * Disconnect from MQTT broker
 */
app.post('/api/mqtt/disconnect', async (req: Request, res: Response) => {
  if (mqttListener) {
    await mqttListener.disconnect();
    mqttListener = null;
  }
  res.json({ success: true });
});

/**
 * Get MQTT status
 */
app.get('/api/mqtt/status', (req: Request, res: Response) => {
  res.json(mqttListener?.getStatus() ?? { connected: false, subscribedTopics: [], messageCount: 0 });
});

/**
 * Add topic substitution
 */
app.post('/api/substitutions', (req: Request, res: Response) => {
  projectState.config.topicSubstitutions.push(req.body);
  
  if (projectState.messages.length > 0) {
    regenerateSpec();
  }
  
  broadcastState();
  res.json({ success: true, substitutions: projectState.config.topicSubstitutions });
});

/**
 * Remove topic substitution
 */
app.delete('/api/substitutions/:index', (req: Request, res: Response) => {
  const index = parseInt(req.params.index, 10);
  if (index >= 0 && index < projectState.config.topicSubstitutions.length) {
    projectState.config.topicSubstitutions.splice(index, 1);
    
    if (projectState.messages.length > 0) {
      regenerateSpec();
    }
    
    broadcastState();
  }
  res.json({ success: true, substitutions: projectState.config.topicSubstitutions });
});

/**
 * Detect parameters automatically
 */
app.post('/api/detect-parameters', (req: Request, res: Response) => {
  const suggestions = detectParameters(projectState.messages);
  res.json({ success: true, suggestions });
});

/**
 * Generate/regenerate the spec
 */
app.post('/api/generate', (req: Request, res: Response) => {
  regenerateSpec();
  broadcastState();
  res.json({ 
    success: true, 
    spec: projectState.generatedSpec,
    output: projectState.generatedSpec 
      ? exportDocument(projectState.generatedSpec, projectState.config.outputFormat)
      : null,
  });
});

/**
 * Export the generated spec
 */
app.get('/api/export', (req: Request, res: Response) => {
  if (!projectState.generatedSpec) {
    res.status(400).json({ error: 'No spec generated yet' });
    return;
  }
  
  const format = (req.query.format as 'yaml' | 'json') || projectState.config.outputFormat;
  const content = exportDocument(projectState.generatedSpec, format);
  const filename = `asyncapi.${format}`;
  
  res.setHeader('Content-Type', format === 'yaml' ? 'text/yaml' : 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content);
});

/**
 * Clear all messages
 */
app.post('/api/clear', (req: Request, res: Response) => {
  projectState.messages = [];
  projectState.generatedSpec = null;
  resetSchemaRegistry();
  
  if (mqttListener) {
    mqttListener.clearBuffer();
  }
  
  broadcastState();
  res.json({ success: true });
});

/**
 * Merge with existing spec
 */
app.post('/api/merge', (req: Request, res: Response) => {
  if (!projectState.generatedSpec) {
    res.status(400).json({ error: 'No spec generated yet' });
    return;
  }
  
  try {
    const existingDoc = JSON.parse(req.body.existingSpec) as AsyncAPIDocument;
    projectState.generatedSpec = mergeAsyncAPIDocs(existingDoc, projectState.generatedSpec);
    broadcastState();
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to parse existing spec' });
  }
});

// SPA fallback for production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(join(__dirname, '../../dist/client/index.html'));
  });
}

// Helper functions

function regenerateSpec(): void {
  if (projectState.messages.length === 0) {
    projectState.generatedSpec = null;
    return;
  }
  
  resetSchemaRegistry();
  const registry = getSchemaRegistry();
  const channels = buildChannels(projectState.messages, projectState.config);
  projectState.generatedSpec = generateAsyncAPIFromChannels(channels, registry, projectState.config);
}

function getStateForClient(): {
  messages: ExtractedMessage[];
  config: GeneratorConfig;
  spec: string | null;
  mqttStatus: { connected: boolean; subscribedTopics: string[]; messageCount: number };
  stats: { messageCount: number; uniqueTopics: number; models: string[] };
} {
  const uniqueTopics = new Set(projectState.messages.map(m => m.topic));
  const modelGroups = groupByModel(projectState.messages);
  
  return {
    messages: projectState.messages.slice(-100), // Last 100 messages
    config: projectState.config,
    spec: projectState.generatedSpec 
      ? exportDocument(projectState.generatedSpec, projectState.config.outputFormat)
      : null,
    mqttStatus: mqttListener?.getStatus() ?? { connected: false, subscribedTopics: [], messageCount: 0 },
    stats: {
      messageCount: projectState.messages.length,
      uniqueTopics: uniqueTopics.size,
      models: Array.from(modelGroups.keys()).filter(m => m !== '__unknown__'),
    },
  };
}

function sendToClient(socket: WebSocket, message: WSMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function broadcast(message: WSMessage): void {
  const data = JSON.stringify(message);
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function broadcastState(): void {
  broadcast({
    type: 'state',
    payload: getStateForClient(),
  });
}

function handleWebSocketMessage(socket: WebSocket, message: WSMessage): void {
  switch (message.type) {
    case 'get_state':
      sendToClient(socket, {
        type: 'state',
        payload: getStateForClient(),
      });
      break;
    
    case 'generate':
      regenerateSpec();
      broadcastState();
      break;
    
    default:
      sendToClient(socket, {
        type: 'error',
        payload: { message: `Unknown message type: ${message.type}` },
      });
  }
}

// Start server
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
