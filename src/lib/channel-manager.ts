/**
 * Channel Manager - Manages AsyncAPI channels and their schemas
 * Browser-compatible version
 */

import type { ChannelDefinition, ExtractedMessage, JSONSchema, TopicSubstitution, GeneratorConfig } from './types';
import { inferSchema, hashSchema, mergeSchemas } from './schema-inferrer';
import { SchemaRegistry } from './schema-registry';

export interface ProcessedChannels {
  channels: ChannelDefinition[];
  schemas: Record<string, JSONSchema>;
}

/**
 * Apply topic substitutions to a topic string
 */
export function applyTopicSubstitutions(topic: string, substitutions: TopicSubstitution[]): string {
  let result = topic;
  for (const sub of substitutions) {
    if (sub.pattern && sub.replacement) {
      try {
        const regex = new RegExp(sub.pattern, 'g');
        result = result.replace(regex, sub.replacement);
      } catch {
        // Invalid regex, skip this substitution
        console.warn(`Invalid regex pattern: ${sub.pattern}`);
      }
    }
  }
  return result;
}

/**
 * Generate a schema name from a topic
 */
export function generateSchemaName(topic: string): string {
  // Convert topic to a valid schema name
  // e.g., "devices/sensor/temperature" -> "DevicesSensorTemperature"
  return topic
    .split(/[\/\.\-_]/)
    .filter(part => part.length > 0)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('') + 'Payload';
}

/**
 * Process messages and generate channels with schemas
 */
export function processMessages(
  messages: ExtractedMessage[],
  config: GeneratorConfig
): ProcessedChannels {
  const registry = new SchemaRegistry();
  const channelMap = new Map<string, ChannelDefinition>();

  for (const message of messages) {
    const topic = applyTopicSubstitutions(message.topic, config.topicSubstitutions);
    const schemaName = generateSchemaName(topic);
    
    // Infer schema from payload
    const inferredSchema = inferSchema(message.payload, schemaName);
    
    // Register the schema (handles deduplication and merging)
    const registeredName = registry.register(schemaName, inferredSchema);
    
    // Get or create channel definition
    let channel = channelMap.get(topic);
    if (!channel) {
      channel = {
        topic,
        schemaRef: registeredName,
        description: generateChannelDescription(topic),
        messageCount: 0
      };
      channelMap.set(topic, channel);
    }
    
    channel.messageCount++;
    
    // Store example payload (keep the most recent)
    channel.examples = channel.examples || [];
    if (channel.examples.length < 3) {
      channel.examples.push(message.payload);
    }
  }

  return {
    channels: Array.from(channelMap.values()),
    schemas: registry.toRecord()
  };
}

/**
 * Generate a description for a channel based on its topic
 */
function generateChannelDescription(topic: string): string {
  const parts = topic.split(/[\/\.\-_]/).filter(Boolean);
  if (parts.length === 0) return 'Data channel';
  
  const humanized = parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
  
  return `${humanized} data channel`;
}

/**
 * Group channels by a common prefix
 */
export function groupChannelsByPrefix(channels: ChannelDefinition[]): Map<string, ChannelDefinition[]> {
  const groups = new Map<string, ChannelDefinition[]>();
  
  for (const channel of channels) {
    const parts = channel.topic.split('/');
    const prefix = parts.length > 1 ? parts[0] : 'root';
    
    if (!groups.has(prefix)) {
      groups.set(prefix, []);
    }
    groups.get(prefix)!.push(channel);
  }
  
  return groups;
}

/**
 * Channel Manager class for stateful channel management
 */
export class ChannelManager {
  private channels: Map<string, ChannelDefinition> = new Map();
  private schemaRegistry: SchemaRegistry;
  private config: GeneratorConfig;

  constructor(config: GeneratorConfig) {
    this.config = config;
    this.schemaRegistry = new SchemaRegistry();
  }

  /**
   * Add a message to the channel manager
   */
  addMessage(message: ExtractedMessage): void {
    const topic = applyTopicSubstitutions(message.topic, this.config.topicSubstitutions);
    const schemaName = generateSchemaName(topic);
    
    // Infer and register schema
    const inferredSchema = inferSchema(message.payload, schemaName);
    const registeredName = this.schemaRegistry.register(schemaName, inferredSchema);
    
    // Get or create channel
    let channel = this.channels.get(topic);
    if (!channel) {
      channel = {
        topic,
        schemaRef: registeredName,
        description: generateChannelDescription(topic),
        messageCount: 0,
        examples: []
      };
      this.channels.set(topic, channel);
    }
    
    channel.messageCount++;
    
    // Add example (keep up to 3)
    if (channel.examples && channel.examples.length < 3) {
      channel.examples.push(message.payload);
    }
  }

  /**
   * Get all channels
   */
  getChannels(): ChannelDefinition[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get all schemas
   */
  getSchemas(): Record<string, JSONSchema> {
    return this.schemaRegistry.toRecord();
  }

  /**
   * Get processed output
   */
  getProcessed(): ProcessedChannels {
    return {
      channels: this.getChannels(),
      schemas: this.getSchemas()
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.channels.clear();
    this.schemaRegistry.clear();
  }

  /**
   * Get statistics
   */
  getStats(): { channelCount: number; schemaCount: number; totalMessages: number } {
    const channels = this.getChannels();
    return {
      channelCount: channels.length,
      schemaCount: this.schemaRegistry.size,
      totalMessages: channels.reduce((sum, ch) => sum + ch.messageCount, 0)
    };
  }
}
