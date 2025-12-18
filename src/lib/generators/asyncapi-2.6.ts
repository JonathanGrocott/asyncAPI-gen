/**
 * AsyncAPI 2.6.0 Generator - Browser-compatible version
 */

import type { GeneratorConfig, ChannelDefinition, JSONSchema } from '../types';
import type { AsyncAPI26Document, ChannelItem26, Operation26, Message26 } from './asyncapi-2.6-types';

/**
 * Generate AsyncAPI 2.6.0 document from processed channels and schemas
 */
export function generateAsyncAPI26(
  channels: ChannelDefinition[],
  schemas: Record<string, JSONSchema>,
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
    const channelItem = buildChannelItem26(channel, config);
    doc.channels[channel.topic] = channelItem;
  }

  // Add schemas to components
  doc.components!.schemas = schemas;

  return doc;
}

/**
 * Build servers object for 2.6.0
 */
function buildServers26(config: GeneratorConfig): AsyncAPI26Document['servers'] {
  if (!config.servers || config.servers.length === 0) {
    return undefined;
  }

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

/**
 * Build a channel item for 2.6.0
 */
function buildChannelItem26(
  channel: ChannelDefinition,
  config: GeneratorConfig
): ChannelItem26 {
  const channelId = topicToChannelId(channel.topic);
  
  const channelItem: ChannelItem26 = {
    description: channel.description,
    // Using subscribe operation - developer-centric documentation
    // This tells developers "subscribe here to receive this data"
    subscribe: {
      operationId: `subscribe_${channelId}`,
      summary: `Subscribe to ${channel.topic} to receive data`,
      description: `Subscribe to this channel to receive messages. ${channel.messageCount} message(s) observed.`,
      message: {
        name: channel.schemaRef,
        title: formatTitle(channel.schemaRef),
        contentType: 'application/json',
        payload: {
          $ref: `#/components/schemas/${channel.schemaRef}`,
        },
        examples: channel.examples?.map(ex => ({ payload: ex })),
      },
    },
  };

  return channelItem;
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
 * Format a schema name as a title
 */
function formatTitle(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}
