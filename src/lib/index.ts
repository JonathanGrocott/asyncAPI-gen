/**
 * AsyncAPI Generator Library - Client-side
 * 
 * This module provides all the functionality needed to generate
 * AsyncAPI specifications from JSON data directly in the browser.
 */

// Types
export type {
  AsyncAPIVersion,
  ChannelMode,
  OutputFormat,
  TopicSubstitution,
  ServerConfig,
  GeneratorConfig,
  ExtractedMessage,
  JSONSchema,
  ChannelDefinition,
  AppState,
} from './types';

export { DEFAULT_CONFIG } from './types';

// JSON Parser
export {
  parseJsonContent,
  extractMessagesFromHierarchy,
  groupByModel,
  groupByTopic,
} from './json-parser';

// Schema Inference
export {
  inferSchema,
  hashSchema,
  mergeSchemas,
} from './schema-inferrer';

// Schema Registry
export { SchemaRegistry } from './schema-registry';

// Channel Manager
export {
  ChannelManager,
  processMessages,
  applyTopicSubstitutions,
  generateSchemaName,
  groupChannelsByPrefix,
  type ProcessedChannels,
} from './channel-manager';

// Generators
export { generateAsyncAPI30 } from './generators/asyncapi-3.0';
export { generateAsyncAPI26 } from './generators/asyncapi-2.6';

// Generator types
export type { AsyncAPI30Document } from './generators/asyncapi-3.0-types';
export type { AsyncAPI26Document } from './generators/asyncapi-2.6-types';

// Main generator function
import type { GeneratorConfig, ExtractedMessage, AsyncAPIVersion } from './types';
import { processMessages } from './channel-manager';
import { generateAsyncAPI30 } from './generators/asyncapi-3.0';
import { generateAsyncAPI26 } from './generators/asyncapi-2.6';
import type { AsyncAPI30Document } from './generators/asyncapi-3.0-types';
import type { AsyncAPI26Document } from './generators/asyncapi-2.6-types';
import YAML from 'yaml';

export type AsyncAPIDocument = AsyncAPI30Document | AsyncAPI26Document;

/**
 * Generate an AsyncAPI specification from messages
 */
export function generateAsyncAPISpec(
  messages: ExtractedMessage[],
  config: GeneratorConfig
): AsyncAPIDocument {
  // Process messages into channels and schemas
  const { channels, schemas } = processMessages(messages, config);

  // Generate the appropriate version
  if (config.version === '3.0.0') {
    return generateAsyncAPI30(channels, schemas, config);
  } else {
    return generateAsyncAPI26(channels, schemas, config);
  }
}

/**
 * Format output as YAML or JSON string
 */
export function formatOutput(
  doc: AsyncAPIDocument,
  format: 'yaml' | 'json'
): string {
  if (format === 'yaml') {
    return YAML.stringify(doc, {
      indent: 2,
      lineWidth: 0,
      singleQuote: true,
    });
  }
  return JSON.stringify(doc, null, 2);
}

/**
 * Complete generation pipeline: JSON input -> formatted output
 */
export function generateFromJson(
  jsonContent: string,
  config: GeneratorConfig
): { document: AsyncAPIDocument; output: string } {
  // Parse JSON content
  const messages = parseJsonContent(jsonContent);
  
  // Generate spec
  const document = generateAsyncAPISpec(messages, config);
  
  // Format output
  const output = formatOutput(document, config.outputFormat);
  
  return { document, output };
}
