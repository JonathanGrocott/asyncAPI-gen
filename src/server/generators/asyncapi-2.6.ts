/**
 * AsyncAPI 2.6.0 Generator
 */

import type { GeneratorConfig, ChannelDefinition, JSONSchema } from '../shared/types.js';
import type { AsyncAPI26Document, ChannelItem26, Operation26, Message26 } from '../shared/asyncapi-2.6.js';
import { inferSchema } from '../schema/inferrer.js';
import { SchemaRegistry } from '../registry/schema-registry.js';

/**
 * Generate AsyncAPI 2.6.0 document from channel definitions
 */
export function generateAsyncAPI26(
  channels: ChannelDefinition[],
  registry: SchemaRegistry,
  config: GeneratorConfig
): AsyncAPI26Document {
  const doc: AsyncAPI26Document = {
    asyncapi: '2.6.0',
    info: {
      title: config.info?.title || 'Generated AsyncAPI',
      version: config.info?.version || '1.0.0',
      description: config.info?.description,
    },
    servers: buildServers26(config),
    channels: {},
    components: {
      schemas: {},
      messages: {},
    },
  };

  // Process each channel
  for (const channel of channels) {
    const channelItem = buildChannelItem26(channel, registry, config);
    doc.channels[channel.topic] = channelItem;
  }

  // Add schemas from registry
  doc.components!.schemas = registry.toRecord();

  return doc;
}

/**
 * Build servers object for 2.6.0
 */
function buildServers26(config: GeneratorConfig): AsyncAPI26Document['servers'] {
  // Use configured servers if provided
  if (config.servers && config.servers.length > 0) {
    const servers: AsyncAPI26Document['servers'] = {};
    for (const server of config.servers) {
      servers[server.name] = {
        url: server.url,
        protocol: server.protocol,
        description: server.description || `${server.protocol.toUpperCase()} Broker`,
      };
    }
    return servers;
  }

  // Fallback to MQTT connection config if no servers configured
  if (config.mqtt) {
    return {
      production: {
        url: `${config.mqtt.host}:${config.mqtt.port}`,
        protocol: 'mqtt',
        description: 'MQTT Broker',
      },
    };
  }

  return undefined;
}

/**
 * Build a channel item for 2.6.0
 */
function buildChannelItem26(
  channel: ChannelDefinition,
  registry: SchemaRegistry,
  config: GeneratorConfig
): ChannelItem26 {
  const channelItem: ChannelItem26 = {};

  // Add parameters if any
  if (Object.keys(channel.parameters).length > 0) {
    channelItem.parameters = {};
    for (const [name, def] of Object.entries(channel.parameters)) {
      channelItem.parameters[name] = {
        description: def.description,
        schema: def.enum ? { type: 'string', enum: def.enum } : { type: 'string' },
      };
    }
  }

  // Build publish operation - documents what the system publishes
  // In AsyncAPI 2.6, 'publish' means the API publishes these messages (subscribers receive them)
  const operation = buildOperation26(channel, registry, config);
  channelItem.publish = operation;

  // Add bindings if configured
  if (config.mqtt) {
    channelItem.bindings = {
      mqtt: {},
    };
  }

  return channelItem;
}

/**
 * Build an operation for 2.6.0
 */
function buildOperation26(
  channel: ChannelDefinition,
  registry: SchemaRegistry,
  config: GeneratorConfig
): Operation26 {
  const operation: Operation26 = {
    operationId: `publish_${channel.channelId}`,
    summary: `Publishes data to ${channel.topic}`,
    description: `Subscribe to this channel to receive messages. The system publishes data in the format described below.`,
  };

  // Group messages by their schema
  const messagesBySchema = groupMessagesBySchema(channel, registry);

  if (messagesBySchema.size === 1) {
    // Single message type
    const [schemaName] = messagesBySchema.keys();
    operation.message = buildMessage26(schemaName, registry);
  } else if (messagesBySchema.size > 1) {
    // Multiple message types - use oneOf
    operation.message = {
      oneOf: Array.from(messagesBySchema.keys()).map(schemaName => 
        buildMessage26(schemaName, registry)
      ),
    };
  }

  return operation;
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
    // Use model name if provided, otherwise infer schema
    let schemaName: string;
    
    if (message.modelName) {
      // Register with model name, schema may already exist
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
 * Build a message object for 2.6.0
 */
function buildMessage26(schemaName: string, registry: SchemaRegistry): Message26 {
  return {
    name: schemaName,
    title: formatTitle(schemaName),
    contentType: 'application/json',
    payload: {
      $ref: `#/components/schemas/${schemaName}`,
    },
  };
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
 * Merge a new AsyncAPI 2.6.0 document into an existing one
 */
export function mergeAsyncAPI26(
  existing: AsyncAPI26Document,
  newDoc: AsyncAPI26Document
): AsyncAPI26Document {
  const merged: AsyncAPI26Document = {
    ...existing,
    channels: { ...existing.channels },
    components: {
      schemas: { ...existing.components?.schemas },
      messages: { ...existing.components?.messages },
    },
  };

  // Merge channels
  for (const [topic, channel] of Object.entries(newDoc.channels)) {
    if (merged.channels[topic]) {
      // Channel exists - merge operations
      merged.channels[topic] = mergeChannelItems26(
        merged.channels[topic],
        channel
      );
    } else {
      merged.channels[topic] = channel;
    }
  }

  // Merge schemas
  if (newDoc.components?.schemas) {
    for (const [name, schema] of Object.entries(newDoc.components.schemas)) {
      if (!merged.components!.schemas![name]) {
        merged.components!.schemas![name] = schema;
      }
      // If schema already exists with same name, keep existing
    }
  }

  return merged;
}

/**
 * Merge two channel items
 */
function mergeChannelItems26(
  existing: ChannelItem26,
  newItem: ChannelItem26
): ChannelItem26 {
  const merged: ChannelItem26 = { ...existing };

  // Merge parameters
  if (newItem.parameters) {
    merged.parameters = { ...existing.parameters, ...newItem.parameters };
  }

  // For subscribe, merge message types
  if (newItem.subscribe?.message) {
    if (!merged.subscribe) {
      merged.subscribe = newItem.subscribe;
    } else if (merged.subscribe.message && newItem.subscribe.message) {
      // Only merge if both are actual messages (not references)
      const existingMsg = merged.subscribe.message;
      const newMsg = newItem.subscribe.message;
      
      if (!('$ref' in existingMsg) && !('$ref' in newMsg)) {
        merged.subscribe.message = mergeMessages26(
          existingMsg as Message26 | { oneOf: Message26[] },
          newMsg as Message26 | { oneOf: Message26[] }
        );
      }
    }
  }

  return merged;
}

/**
 * Merge two message definitions
 */
function mergeMessages26(
  existing: Message26 | { oneOf: Message26[] },
  newMsg: Message26 | { oneOf: Message26[] }
): Message26 | { oneOf: Message26[] } {
  const existingMessages: Message26[] = 'oneOf' in existing ? existing.oneOf : [existing as Message26];
  const newMessages: Message26[] = 'oneOf' in newMsg ? newMsg.oneOf : [newMsg as Message26];

  // Combine unique messages
  const allMessages = [...existingMessages];
  const existingRefs = new Set(
    existingMessages
      .map(m => (m.payload as { $ref?: string })?.$ref)
      .filter(Boolean)
  );

  for (const msg of newMessages) {
    const ref = (msg.payload as { $ref?: string })?.$ref;
    if (ref && !existingRefs.has(ref)) {
      allMessages.push(msg);
    }
  }

  if (allMessages.length === 1) {
    return allMessages[0];
  }

  return { oneOf: allMessages };
}
