/**
 * AsyncAPI 3.0.0 Generator
 */

import type { GeneratorConfig, ChannelDefinition, JSONSchema } from '../shared/types.js';
import type { 
  AsyncAPI30Document, 
  Channel30, 
  Operation30, 
  Message30 
} from '../shared/asyncapi-3.0.js';
import { inferSchema } from '../schema/inferrer.js';
import { SchemaRegistry } from '../registry/schema-registry.js';

/**
 * Generate AsyncAPI 3.0.0 document from channel definitions
 */
export function generateAsyncAPI30(
  channels: ChannelDefinition[],
  registry: SchemaRegistry,
  config: GeneratorConfig
): AsyncAPI30Document {
  const doc: AsyncAPI30Document = {
    asyncapi: '3.0.0',
    info: {
      title: config.info?.title || 'Generated AsyncAPI',
      version: config.info?.version || '1.0.0',
      description: config.info?.description,
    },
    servers: buildServers30(config),
    channels: {},
    operations: {},
    components: {
      schemas: {},
      messages: {},
    },
  };

  // Process each channel
  for (const channel of channels) {
    const { channelDef, operation, messages } = buildChannel30(channel, registry, config);
    
    doc.channels![channel.channelId] = channelDef;
    doc.operations![`receive_${channel.channelId}`] = operation;
    
    // Add messages to components
    for (const [msgName, msgDef] of Object.entries(messages)) {
      doc.components!.messages![msgName] = msgDef;
    }
  }

  // Add schemas from registry
  doc.components!.schemas = registry.toRecord();

  return doc;
}

/**
 * Build servers object for 3.0.0
 */
function buildServers30(config: GeneratorConfig): AsyncAPI30Document['servers'] {
  if (!config.mqtt) {
    return undefined;
  }

  return {
    production: {
      host: `${config.mqtt.host}:${config.mqtt.port}`,
      protocol: 'mqtt',
      description: 'MQTT Broker',
      ...(config.mqtt.username ? {
        security: [{ $ref: '#/components/securitySchemes/userPassword' }],
      } : {}),
    },
  };
}

/**
 * Build a channel, operation, and messages for 3.0.0
 */
function buildChannel30(
  channel: ChannelDefinition,
  registry: SchemaRegistry,
  config: GeneratorConfig
): {
  channelDef: Channel30;
  operation: Operation30;
  messages: Record<string, Message30>;
} {
  // Build channel definition
  const channelDef: Channel30 = {
    address: channel.topic,
    messages: {},
  };

  // Add parameters if any
  if (Object.keys(channel.parameters).length > 0) {
    channelDef.parameters = {};
    for (const [name, def] of Object.entries(channel.parameters)) {
      channelDef.parameters[name] = {
        description: def.description,
        enum: def.enum,
      };
    }
  }

  // Add bindings if configured
  if (config.mqtt) {
    channelDef.bindings = {
      mqtt: {},
    };
  }

  // Group messages by their schema
  const messagesBySchema = groupMessagesBySchema(channel, registry);
  const messages: Record<string, Message30> = {};

  // Build messages
  for (const schemaName of messagesBySchema.keys()) {
    const msgId = `${channel.channelId}_${schemaName}`;
    
    messages[msgId] = {
      name: schemaName,
      title: formatTitle(schemaName),
      contentType: 'application/json',
      payload: {
        $ref: `#/components/schemas/${schemaName}`,
      },
    };

    // Add reference to channel messages
    channelDef.messages![msgId] = {
      $ref: `#/components/messages/${msgId}`,
    };
  }

  // Build operation
  const operation: Operation30 = {
    action: 'receive',
    channel: {
      $ref: `#/channels/${channel.channelId}`,
    },
    summary: `Receive messages on ${channel.topic}`,
    messages: Object.keys(messages).map(msgId => ({
      $ref: `#/channels/${channel.channelId}/messages/${msgId}`,
    })),
  };

  return { channelDef, operation, messages };
}

/**
 * Group messages by their schema
 */
function groupMessagesBySchema(
  channel: ChannelDefinition,
  registry: SchemaRegistry
): Map<string, number> {
  const schemaMap = new Map<string, number>();

  for (const message of channel.messages) {
    let schemaName: string;
    
    if (message.modelName) {
      // Register with model name
      const schema = inferSchema(message.payload, false);
      schemaName = registry.register(message.modelName, schema);
    } else {
      // Generate name from channel ID
      const schema = inferSchema(message.payload, true);
      const baseName = `${channel.channelId}_payload`;
      schemaName = registry.register(baseName, schema);
    }

    schemaMap.set(schemaName, (schemaMap.get(schemaName) || 0) + 1);
  }

  return schemaMap;
}

/**
 * Format a schema name as a title
 */
function formatTitle(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Merge a new AsyncAPI 3.0.0 document into an existing one
 */
export function mergeAsyncAPI30(
  existing: AsyncAPI30Document,
  newDoc: AsyncAPI30Document
): AsyncAPI30Document {
  const merged: AsyncAPI30Document = {
    ...existing,
    channels: { ...existing.channels },
    operations: { ...existing.operations },
    components: {
      schemas: { ...existing.components?.schemas },
      messages: { ...existing.components?.messages },
    },
  };

  // Merge channels
  if (newDoc.channels) {
    for (const [channelId, channel] of Object.entries(newDoc.channels)) {
      if (merged.channels![channelId]) {
        // Channel exists - merge
        merged.channels![channelId] = mergeChannels30(
          merged.channels![channelId],
          channel
        );
      } else {
        merged.channels![channelId] = channel;
      }
    }
  }

  // Merge operations
  if (newDoc.operations) {
    for (const [opId, operation] of Object.entries(newDoc.operations)) {
      if (!merged.operations![opId]) {
        merged.operations![opId] = operation;
      } else {
        // Merge message references
        merged.operations![opId] = mergeOperations30(
          merged.operations![opId],
          operation
        );
      }
    }
  }

  // Merge schemas
  if (newDoc.components?.schemas) {
    for (const [name, schema] of Object.entries(newDoc.components.schemas)) {
      if (!merged.components!.schemas![name]) {
        merged.components!.schemas![name] = schema;
      }
    }
  }

  // Merge messages
  if (newDoc.components?.messages) {
    for (const [name, msg] of Object.entries(newDoc.components.messages)) {
      if (!merged.components!.messages![name]) {
        merged.components!.messages![name] = msg;
      }
    }
  }

  return merged;
}

/**
 * Merge two channels
 */
function mergeChannels30(existing: Channel30, newChannel: Channel30): Channel30 {
  const merged: Channel30 = { ...existing };

  // Merge parameters
  if (newChannel.parameters) {
    merged.parameters = { ...existing.parameters, ...newChannel.parameters };
  }

  // Merge messages
  if (newChannel.messages) {
    merged.messages = { ...existing.messages, ...newChannel.messages };
  }

  return merged;
}

/**
 * Merge two operations
 */
function mergeOperations30(existing: Operation30, newOp: Operation30): Operation30 {
  const merged: Operation30 = { ...existing };

  // Merge message references
  if (newOp.messages) {
    const existingRefs = new Set(
      (existing.messages || []).map(m => '$ref' in m ? m.$ref : '')
    );
    
    const newMessages = (newOp.messages || []).filter(m => {
      if ('$ref' in m) {
        return !existingRefs.has(m.$ref);
      }
      return true;
    });

    merged.messages = [...(existing.messages || []), ...newMessages];
  }

  return merged;
}
