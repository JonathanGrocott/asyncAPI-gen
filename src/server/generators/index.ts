/**
 * AsyncAPI Generator Entry Point
 */

import type { GeneratorConfig, ChannelDefinition, ExtractedMessage } from '../shared/types.js';
import type { AsyncAPI26Document } from '../shared/asyncapi-2.6.js';
import type { AsyncAPI30Document } from '../shared/asyncapi-3.0.js';
import { generateAsyncAPI26, mergeAsyncAPI26 } from './asyncapi-2.6.js';
import { generateAsyncAPI30, mergeAsyncAPI30 } from './asyncapi-3.0.js';
import { SchemaRegistry } from '../registry/schema-registry.js';
import { buildChannels } from '../channels/manager.js';
import { stringify as yamlStringify } from 'yaml';

export type AsyncAPIDocument = AsyncAPI26Document | AsyncAPI30Document;

/**
 * Generate an AsyncAPI document from extracted messages
 */
export function generateAsyncAPI(
  messages: ExtractedMessage[],
  config: GeneratorConfig
): AsyncAPIDocument {
  // Build channels from messages
  const channels = buildChannels(messages, config);
  
  // Create schema registry
  const registry = new SchemaRegistry();

  // Generate based on version
  if (config.asyncApiVersion === '2.6.0') {
    return generateAsyncAPI26(channels, registry, config);
  } else {
    return generateAsyncAPI30(channels, registry, config);
  }
}

/**
 * Generate an AsyncAPI document from pre-built channels
 */
export function generateAsyncAPIFromChannels(
  channels: ChannelDefinition[],
  registry: SchemaRegistry,
  config: GeneratorConfig
): AsyncAPIDocument {
  if (config.asyncApiVersion === '2.6.0') {
    return generateAsyncAPI26(channels, registry, config);
  } else {
    return generateAsyncAPI30(channels, registry, config);
  }
}

/**
 * Merge two AsyncAPI documents
 */
export function mergeAsyncAPIDocs(
  existing: AsyncAPIDocument,
  newDoc: AsyncAPIDocument
): AsyncAPIDocument {
  // Detect version from document
  if (existing.asyncapi.startsWith('2.')) {
    return mergeAsyncAPI26(
      existing as AsyncAPI26Document,
      newDoc as AsyncAPI26Document
    );
  } else {
    return mergeAsyncAPI30(
      existing as AsyncAPI30Document,
      newDoc as AsyncAPI30Document
    );
  }
}

/**
 * Convert AsyncAPI document to YAML string
 */
export function toYAML(doc: AsyncAPIDocument): string {
  return yamlStringify(doc, {
    indent: 2,
    lineWidth: 120,
    defaultKeyType: 'PLAIN',
    defaultStringType: 'QUOTE_DOUBLE',
  });
}

/**
 * Convert AsyncAPI document to JSON string
 */
export function toJSON(doc: AsyncAPIDocument, pretty: boolean = true): string {
  return pretty ? JSON.stringify(doc, null, 2) : JSON.stringify(doc);
}

/**
 * Export document in specified format
 */
export function exportDocument(
  doc: AsyncAPIDocument,
  format: 'yaml' | 'json'
): string {
  return format === 'yaml' ? toYAML(doc) : toJSON(doc);
}

// Re-export version-specific functions
export { generateAsyncAPI26, mergeAsyncAPI26 } from './asyncapi-2.6.js';
export { generateAsyncAPI30, mergeAsyncAPI30 } from './asyncapi-3.0.js';
