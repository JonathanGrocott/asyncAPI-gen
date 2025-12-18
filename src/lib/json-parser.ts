/**
 * JSON Parser - Parses the hierarchical JSON format with _path and _model fields
 * Browser-compatible version (no fs dependencies)
 */

import type { ExtractedMessage } from './types';

const METADATA_FIELDS = ['_path', '_model', '_name', '_timestamp', '_elementID'];

interface HierarchyNode {
  _path?: string;
  _model?: string;
  _name?: string;
  _timestamp?: string;
  _elementID?: string;
  [key: string]: unknown;
}

/**
 * Parse JSON string containing hierarchical MQTT topic data
 * Supports multiple formats:
 * 1. Array of { topic, payload } objects
 * 2. Hierarchical format with _path and _model fields
 */
export function parseJsonContent(content: string): ExtractedMessage[] {
  const data = JSON.parse(content);
  
  // Check if it's an array of simple { topic, payload } objects
  if (Array.isArray(data) && data.length > 0 && data[0].topic !== undefined) {
    return parseSimpleFormat(data);
  }
  
  return extractMessagesFromHierarchy(data);
}

/**
 * Parse simple format: array of { topic, payload } objects
 */
function parseSimpleFormat(data: Array<{ topic: string; payload: unknown; modelName?: string }>): ExtractedMessage[] {
  return data.map(item => ({
    topic: item.topic,
    payload: (typeof item.payload === 'object' && item.payload !== null) 
      ? item.payload as Record<string, unknown>
      : { value: item.payload },
    modelName: item.modelName,
    timestamp: new Date(),
  }));
}

/**
 * Extract messages from hierarchical JSON structure
 */
export function extractMessagesFromHierarchy(
  node: HierarchyNode | HierarchyNode[],
  parentPath: string = ''
): ExtractedMessage[] {
  // Handle array at root level
  if (Array.isArray(node)) {
    const messages: ExtractedMessage[] = [];
    for (const item of node) {
      messages.push(...extractMessagesFromHierarchy(item, parentPath));
    }
    return messages;
  }

  const messages: ExtractedMessage[] = [];

  // Check if this node has a _path (it's a message-bearing node)
  if (node._path) {
    const topic = convertPathToTopic(node._path);
    const payload = extractPayload(node);
    
    if (Object.keys(payload).length > 0) {
      messages.push({
        topic,
        payload,
        modelName: node._model,
        timestamp: node._timestamp ? new Date(node._timestamp) : new Date(),
      });
    }
  }

  // Recursively process child nodes
  for (const [key, value] of Object.entries(node)) {
    if (METADATA_FIELDS.includes(key)) continue;
    if (typeof value !== 'object' || value === null) continue;
    
    if (isHierarchyNode(value)) {
      const childPath = parentPath ? `${parentPath}/${key}` : key;
      const childMessages = extractMessagesFromHierarchy(value as HierarchyNode, childPath);
      messages.push(...childMessages);
    }
  }

  return messages;
}

function convertPathToTopic(path: string): string {
  return path.replace(/\\/g, '/');
}

function extractPayload(node: HierarchyNode): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(node)) {
    if (METADATA_FIELDS.includes(key)) continue;
    if (typeof value === 'object' && value !== null && isHierarchyNode(value)) {
      continue;
    }
    payload[key] = value;
  }

  return payload;
}

function isHierarchyNode(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return false;
  }

  const record = obj as Record<string, unknown>;
  if ('_path' in record) return true;
  
  for (const value of Object.values(record)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if ('_path' in value) return true;
    }
  }
  
  return false;
}

/**
 * Group messages by model name
 */
export function groupByModel(messages: ExtractedMessage[]): Map<string, ExtractedMessage[]> {
  const groups = new Map<string, ExtractedMessage[]>();
  
  for (const msg of messages) {
    const key = msg.modelName || '__unknown__';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(msg);
  }
  
  return groups;
}

/**
 * Group messages by topic
 */
export function groupByTopic(messages: ExtractedMessage[]): Map<string, ExtractedMessage[]> {
  const groups = new Map<string, ExtractedMessage[]>();
  
  for (const msg of messages) {
    if (!groups.has(msg.topic)) {
      groups.set(msg.topic, []);
    }
    groups.get(msg.topic)!.push(msg);
  }
  
  return groups;
}
