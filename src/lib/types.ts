/**
 * Shared types for the AsyncAPI Generator (client-side)
 */

// AsyncAPI Specification version options
export type AsyncAPIVersion = '2.6.0' | '3.0.0';

// Channel generation mode
export type ChannelMode = 'verbose' | 'parameterized';

// Output format
export type OutputFormat = 'yaml' | 'json';

// Topic substitution for parameterization
export interface TopicSubstitution {
  levelIndex: number;
  parameterName: string;
  description?: string;
  values?: string[];
  pattern?: string;
}

// Server configuration
export interface ServerConfig {
  name: string;
  url: string;
  protocol: 'mqtt' | 'mqtts' | 'ws' | 'wss';
  description?: string;
}

// Generator configuration
export interface GeneratorConfig {
  version: AsyncAPIVersion;  // Alias for asyncApiVersion for generator compatibility
  asyncApiVersion: AsyncAPIVersion;
  channelMode: ChannelMode;
  outputFormat: OutputFormat;
  topicSubstitutions: TopicSubstitution[];
  includeExamples: boolean;
  info?: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: ServerConfig[];
}

// Extracted topic with payload
export interface ExtractedMessage {
  topic: string;
  payload: Record<string, unknown>;
  modelName?: string;
  timestamp: Date;
}

// JSON Schema type
export interface JSONSchema {
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  description?: string;
  format?: string;
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  examples?: unknown[];
  additionalProperties?: boolean | JSONSchema;
  oneOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  allOf?: JSONSchema[];
  $ref?: string;
}

// Channel definition (simplified for client-side)
export interface ChannelDefinition {
  topic: string;
  schemaRef: string;
  description?: string;
  messageCount: number;
  examples?: unknown[];
}

// Application state
export interface AppState {
  messages: ExtractedMessage[];
  config: GeneratorConfig;
  spec: string | null;
  stats: {
    messageCount: number;
    uniqueTopics: number;
    models: string[];
  };
}

// Default configuration
export const DEFAULT_CONFIG: GeneratorConfig = {
  version: '3.0.0',
  asyncApiVersion: '3.0.0',
  channelMode: 'verbose',
  outputFormat: 'yaml',
  topicSubstitutions: [],
  includeExamples: true,
  info: {
    title: 'Generated AsyncAPI',
    version: '1.0.0',
  },
  servers: [],
};
