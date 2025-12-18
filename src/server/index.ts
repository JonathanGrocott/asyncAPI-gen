/**
 * AsyncAPI Generator - Main Server
 */

import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';

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
const wsClients: Set<import('ws').WebSocket> = new Set();

// Create Fastify instance
const fastify = Fastify({
  logger: true,
});

// Register plugins
await fastify.register(fastifyCors, {
  origin: true,
});

await fastify.register(fastifyWebsocket);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  await fastify.register(fastifyStatic, {
    root: join(__dirname, '../../dist/client'),
    prefix: '/',
  });
}

// WebSocket route for real-time updates
fastify.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
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
});

// API Routes

/**
 * Get current project state
 */
fastify.get('/api/state', async () => {
  return getStateForClient();
});

/**
 * Update configuration
 */
fastify.post<{ Body: Partial<GeneratorConfig> }>('/api/config', async (request) => {
  projectState.config = {
    ...projectState.config,
    ...request.body,
  };
  
  // Regenerate spec if we have messages
  if (projectState.messages.length > 0) {
    regenerateSpec();
  }
  
  broadcastState();
  return { success: true, config: projectState.config };
});

/**
 * Upload JSON file
 */
fastify.post<{ Body: { content: string; filename?: string } }>(
  '/api/upload/json',
  async (request) => {
    try {
      const messages = parseJsonContent(request.body.content);
      
      // Add to existing messages or replace
      projectState.messages = [...projectState.messages, ...messages];
      
      // Regenerate spec
      regenerateSpec();
      
      broadcastState();
      
      return {
        success: true,
        messagesAdded: messages.length,
        totalMessages: projectState.messages.length,
      };
    } catch (error) {
      throw { statusCode: 400, message: 'Failed to parse JSON content' };
    }
  }
);

/**
 * Load JSON from file path (for development/testing)
 */
fastify.post<{ Body: { filePath: string } }>(
  '/api/load/file',
  async (request) => {
    try {
      const messages = await loadJsonFile(request.body.filePath);
      
      projectState.messages = [...projectState.messages, ...messages];
      regenerateSpec();
      broadcastState();
      
      return {
        success: true,
        messagesAdded: messages.length,
        totalMessages: projectState.messages.length,
      };
    } catch (error) {
      throw { 
        statusCode: 400, 
        message: `Failed to load file: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
);

/**
 * Connect to MQTT broker
 */
fastify.post<{ 
  Body: { host: string; port: number; username?: string; password?: string; topics?: string[] } 
}>('/api/mqtt/connect', async (request) => {
  try {
    // Disconnect existing connection
    if (mqttListener) {
      await mqttListener.disconnect();
    }
    
    projectState.config.mqtt = {
      host: request.body.host,
      port: request.body.port,
      username: request.body.username,
      password: request.body.password,
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
    if (request.body.topics) {
      for (const topic of request.body.topics) {
        await mqttListener.subscribe(topic);
      }
    }
    
    return { success: true, status: mqttListener.getStatus() };
  } catch (error) {
    throw { 
      statusCode: 500, 
      message: `Failed to connect: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
});

/**
 * Subscribe to MQTT topic
 */
fastify.post<{ Body: { topic: string } }>('/api/mqtt/subscribe', async (request) => {
  if (!mqttListener || !mqttListener.isConnected()) {
    throw { statusCode: 400, message: 'Not connected to MQTT broker' };
  }
  
  await mqttListener.subscribe(request.body.topic);
  return { success: true, status: mqttListener.getStatus() };
});

/**
 * Unsubscribe from MQTT topic
 */
fastify.post<{ Body: { topic: string } }>('/api/mqtt/unsubscribe', async (request) => {
  if (!mqttListener || !mqttListener.isConnected()) {
    throw { statusCode: 400, message: 'Not connected to MQTT broker' };
  }
  
  await mqttListener.unsubscribe(request.body.topic);
  return { success: true, status: mqttListener.getStatus() };
});

/**
 * Disconnect from MQTT broker
 */
fastify.post('/api/mqtt/disconnect', async () => {
  if (mqttListener) {
    await mqttListener.disconnect();
    mqttListener = null;
  }
  return { success: true };
});

/**
 * Get MQTT status
 */
fastify.get('/api/mqtt/status', async () => {
  return mqttListener?.getStatus() ?? { connected: false, subscribedTopics: [], messageCount: 0 };
});

/**
 * Add topic substitution
 */
fastify.post<{ Body: TopicSubstitution }>('/api/substitutions', async (request) => {
  projectState.config.topicSubstitutions.push(request.body);
  
  if (projectState.messages.length > 0) {
    regenerateSpec();
  }
  
  broadcastState();
  return { success: true, substitutions: projectState.config.topicSubstitutions };
});

/**
 * Remove topic substitution
 */
fastify.delete<{ Params: { index: string } }>('/api/substitutions/:index', async (request) => {
  const index = parseInt(request.params.index, 10);
  if (index >= 0 && index < projectState.config.topicSubstitutions.length) {
    projectState.config.topicSubstitutions.splice(index, 1);
    
    if (projectState.messages.length > 0) {
      regenerateSpec();
    }
    
    broadcastState();
  }
  return { success: true, substitutions: projectState.config.topicSubstitutions };
});

/**
 * Detect parameters automatically
 */
fastify.post('/api/detect-parameters', async () => {
  const suggestions = detectParameters(projectState.messages);
  return { success: true, suggestions };
});

/**
 * Generate/regenerate the spec
 */
fastify.post('/api/generate', async () => {
  regenerateSpec();
  broadcastState();
  return { 
    success: true, 
    spec: projectState.generatedSpec,
    output: projectState.generatedSpec 
      ? exportDocument(projectState.generatedSpec, projectState.config.outputFormat)
      : null,
  };
});

/**
 * Export the generated spec
 */
fastify.get<{ Querystring: { format?: 'yaml' | 'json' } }>('/api/export', async (request, reply) => {
  if (!projectState.generatedSpec) {
    throw { statusCode: 400, message: 'No spec generated yet' };
  }
  
  const format = request.query.format || projectState.config.outputFormat;
  const content = exportDocument(projectState.generatedSpec, format);
  const filename = `asyncapi.${format}`;
  
  reply.header('Content-Type', format === 'yaml' ? 'text/yaml' : 'application/json');
  reply.header('Content-Disposition', `attachment; filename="${filename}"`);
  return content;
});

/**
 * Clear all messages
 */
fastify.post('/api/clear', async () => {
  projectState.messages = [];
  projectState.generatedSpec = null;
  resetSchemaRegistry();
  
  if (mqttListener) {
    mqttListener.clearBuffer();
  }
  
  broadcastState();
  return { success: true };
});

/**
 * Merge with existing spec
 */
fastify.post<{ Body: { existingSpec: string } }>('/api/merge', async (request) => {
  if (!projectState.generatedSpec) {
    throw { statusCode: 400, message: 'No spec generated yet' };
  }
  
  try {
    const existingDoc = JSON.parse(request.body.existingSpec) as AsyncAPIDocument;
    projectState.generatedSpec = mergeAsyncAPIDocs(existingDoc, projectState.generatedSpec);
    broadcastState();
    return { success: true };
  } catch (error) {
    throw { statusCode: 400, message: 'Failed to parse existing spec' };
  }
});

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

function sendToClient(socket: import('ws').WebSocket, message: WSMessage): void {
  if (socket.readyState === 1) { // OPEN
    socket.send(JSON.stringify(message));
  }
}

function broadcast(message: WSMessage): void {
  const data = JSON.stringify(message);
  for (const client of wsClients) {
    if (client.readyState === 1) {
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

function handleWebSocketMessage(socket: import('ws').WebSocket, message: WSMessage): void {
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

try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`🚀 Server running at http://localhost:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
