/**
 * AsyncAPI 3.0.0 Generator - Browser-compatible version
 */

import type { GeneratorConfig, ChannelDefinition, JSONSchema } from '../types';
import type { AsyncAPI30Document, Channel30, Operation30, Message30 } from './asyncapi-3.0-types';

/**
 * Generate AsyncAPI 3.0.0 document from processed channels and schemas
 */
export function generateAsyncAPI30(
  channels: ChannelDefinition[],
  schemas: Record<string, JSONSchema>,
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
    const channelId = topicToChannelId(channel.topic);
    const { channelDef, operation, messages } = buildChannel30(channel, channelId, config);
    
    doc.channels![channelId] = channelDef;
    doc.operations![`subscribe_${channelId}`] = operation;
    
    // Add messages to components
    for (const [msgName, msgDef] of Object.entries(messages)) {
      doc.components!.messages![msgName] = msgDef;
    }
  }

  // Add schemas to components
  doc.components!.schemas = schemas;

  return doc;
}

/**
 * Convert a topic to a valid channel ID
 */
function topicToChannelId(topic: string): string {
  return topic
    .replace(/\//g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/^_+|_+$/g, '');
}

/**
 * Build servers object for 3.0.0
 */
function buildServers30(config: GeneratorConfig): AsyncAPI30Document['servers'] {
  if (!config.servers || config.servers.length === 0) {
    return undefined;
  }

  const servers: AsyncAPI30Document['servers'] = {};
  for (const server of config.servers) {
    servers[server.name] = {
      host: server.url,
      protocol: server.protocol,
      description: server.description || `${server.protocol.toUpperCase()} Broker`,
    };
  }
  return servers;
}

/**
 * Build a channel, operation, and messages for 3.0.0
 */
function buildChannel30(
  channel: ChannelDefinition,
  channelId: string,
  config: GeneratorConfig
): {
  channelDef: Channel30;
  operation: Operation30;
  messages: Record<string, Message30>;
} {
  // Build channel definition
  const channelDef: Channel30 = {
    address: channel.topic,
    description: channel.description,
    messages: {},
  };

  // Build single message for channel
  const msgId = `${channelId}_message`;
  const messages: Record<string, Message30> = {
    [msgId]: {
      name: channel.schemaRef,
      title: formatTitle(channel.schemaRef),
      contentType: 'application/json',
      payload: {
        $ref: `#/components/schemas/${channel.schemaRef}`,
      },
      examples: channel.examples?.map(ex => ({ payload: ex })),
    },
  };

  // Add reference to channel messages
  channelDef.messages![msgId] = {
    $ref: `#/components/messages/${msgId}`,
  };

  // Build operation - using 'receive' for developer-centric documentation
  // This tells developers "subscribe here to receive this data"
  const operation: Operation30 = {
    action: 'receive',
    channel: {
      $ref: `#/channels/${channelId}`,
    },
    summary: `Subscribe to ${channel.topic} to receive data`,
    description: `Subscribe to this channel to receive messages. ${channel.messageCount} message(s) observed.`,
    messages: [{
      $ref: `#/channels/${channelId}/messages/${msgId}`,
    }],
  };

  return { channelDef, operation, messages };
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
