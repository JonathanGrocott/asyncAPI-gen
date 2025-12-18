// AsyncAPI Specification version options
export type AsyncAPIVersion = '2.6.0' | '3.0.0';

// Channel generation mode
export type ChannelMode = 'verbose' | 'parameterized';

// Output format
export type OutputFormat = 'yaml' | 'json';

// Topic substitution for parameterization
export interface TopicSubstitution {
  /** The level index (0-indexed position in topic path) */
  levelIndex: number;
  /** The parameter name to use (e.g., 'machineId') */
  parameterName: string;
  /** Optional description for the parameter */
  description?: string;
  /** Specific values to match (if empty, matches all values at this level) */
  values?: string[];
  /** Regex pattern to match (alternative to values) */
  pattern?: string;
}

// Configuration for the generator
export interface GeneratorConfig {
  /** AsyncAPI specification version */
  asyncApiVersion: AsyncAPIVersion;
  /** Channel generation mode */
  channelMode: ChannelMode;
  /** Output format */
  outputFormat: OutputFormat;
  /** Topic substitutions for parameterization */
  topicSubstitutions: TopicSubstitution[];
  /** Include examples in schema */
  includeExamples: boolean;
  /** API info */
  info?: {
    title: string;
    version: string;
    description?: string;
  };
  /** MQTT configuration */
  mqtt?: MQTTConfig;
}

// MQTT Connection configuration
export interface MQTTConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  clientId?: string;
}

// Extracted topic with payload
export interface ExtractedMessage {
  /** The topic/channel path */
  topic: string;
  /** The payload data */
  payload: Record<string, unknown>;
  /** Model identifier if present (from _model field) */
  modelName?: string;
  /** Timestamp when captured */
  timestamp: Date;
}

// Schema registry entry
export interface SchemaEntry {
  /** Schema name/identifier */
  name: string;
  /** The JSON Schema */
  schema: JSONSchema;
  /** Number of times this schema is used */
  usageCount: number;
}

// JSON Schema type (simplified)
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

// Channel definition (internal)
export interface ChannelDefinition {
  /** Channel ID (sanitized for use as key) */
  channelId: string;
  /** Channel topic pattern (may contain {parameters}) */
  topic: string;
  /** Parameters in the topic */
  parameters: Record<string, { description?: string; enum?: string[] }>;
  /** Messages associated with this channel */
  messages: ExtractedMessage[];
}

// Project state (for UI)
export interface ProjectState {
  /** Current configuration */
  config: GeneratorConfig;
  /** Extracted messages */
  messages: ExtractedMessage[];
  /** Generated AsyncAPI spec */
  generatedSpec: unknown | null;
}

// WebSocket message types
export type WSMessageType = 
  | 'state'
  | 'mqtt_message'
  | 'mqtt_connected'
  | 'mqtt_disconnected'
  | 'error'
  | 'get_state'
  | 'generate';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
}
