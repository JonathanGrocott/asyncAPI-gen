/**
 * JSON File Loader - Parses the hierarchical JSON format with _path and _model fields
 */

import { readFile } from 'fs/promises';
import type { ExtractedMessage } from '../shared/types.js';

/**
 * Metadata fields used in the hierarchical JSON structure
 */
const METADATA_FIELDS = ['_path', '_model', '_name', '_timestamp', '_elementID'];

/**
 * Interface for nodes in the hierarchical JSON structure
 */
interface HierarchyNode {
  _path?: string;
  _model?: string;
  _name?: string;
  _timestamp?: string;
  _elementID?: string;
  [key: string]: unknown;
}

/**
 * Load and parse a JSON file containing hierarchical MQTT topic data
 */
export async function loadJsonFile(filePath: string): Promise<ExtractedMessage[]> {
  const content = await readFile(filePath, 'utf-8');
  const data = JSON.parse(content);
  return extractMessagesFromHierarchy(data);
}

/**
 * Parse JSON string containing hierarchical MQTT topic data
 */
export function parseJsonContent(content: string): ExtractedMessage[] {
  const data = JSON.parse(content);
  return extractMessagesFromHierarchy(data);
}

/**
 * Extract messages from the hierarchical JSON structure
 * Recursively traverses the tree, extracting topics from _path fields
 */
export function extractMessagesFromHierarchy(
  node: HierarchyNode,
  parentPath: string = ''
): ExtractedMessage[] {
  const messages: ExtractedMessage[] = [];

  // Check if this node has a _path (it's a message-bearing node)
  if (node._path) {
    // Convert backslash-separated path to MQTT topic format (forward slashes)
    const topic = convertPathToTopic(node._path);
    
    // Extract payload (everything except metadata fields)
    const payload = extractPayload(node);
    
    // Only add if there's actual payload data
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
    // Skip metadata fields
    if (METADATA_FIELDS.includes(key)) continue;
    
    // Skip non-object values (these are payload fields)
    if (typeof value !== 'object' || value === null) continue;
    
    // Check if this child is a hierarchy node (has nested objects or _path)
    if (isHierarchyNode(value)) {
      const childPath = parentPath ? `${parentPath}/${key}` : key;
      const childMessages = extractMessagesFromHierarchy(value as HierarchyNode, childPath);
      messages.push(...childMessages);
    }
  }

  return messages;
}

/**
 * Convert a backslash-separated path to MQTT topic format
 * Example: "Building\\Area\\WorkCenter" -> "Building/Area/WorkCenter"
 */
function convertPathToTopic(path: string): string {
  // Replace backslashes with forward slashes
  return path.replace(/\\/g, '/');
}

/**
 * Extract payload data from a node (exclude metadata fields and child hierarchy nodes)
 */
function extractPayload(node: HierarchyNode): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(node)) {
    // Skip metadata fields
    if (METADATA_FIELDS.includes(key)) continue;
    
    // Skip child hierarchy nodes (objects that contain _path or other hierarchy nodes)
    if (typeof value === 'object' && value !== null && isHierarchyNode(value)) {
      continue;
    }
    
    // Include this field in the payload
    payload[key] = value;
  }

  return payload;
}

/**
 * Check if an object is a hierarchy node (contains hierarchy structure)
 * Recursively checks if this node or any descendant contains _path
 */
function isHierarchyNode(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return false;
  }

  const record = obj as Record<string, unknown>;
  
  // If it has _path, it's definitely a hierarchy node
  if ('_path' in record) return true;
  
  // Recursively check if any child is a hierarchy node
  for (const value of Object.values(record)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (isHierarchyNode(value)) return true;
    }
  }
  
  return false;
}

/**
 * Group extracted messages by their model name
 */
export function groupByModel(
  messages: ExtractedMessage[]
): Map<string, ExtractedMessage[]> {
  const groups = new Map<string, ExtractedMessage[]>();

  for (const message of messages) {
    const modelName = message.modelName || '__unknown__';
    
    if (!groups.has(modelName)) {
      groups.set(modelName, []);
    }
    groups.get(modelName)!.push(message);
  }

  return groups;
}

/**
 * Get unique topics from extracted messages
 */
export function getUniqueTopics(messages: ExtractedMessage[]): string[] {
  const topics = new Set<string>();
  for (const message of messages) {
    topics.add(message.topic);
  }
  return Array.from(topics).sort();
}

/**
 * Extract topic segments for parameterization
 * Returns segments at each level of the topic hierarchy
 */
export function extractTopicSegments(
  messages: ExtractedMessage[]
): Map<number, Set<string>> {
  const segmentsByLevel = new Map<number, Set<string>>();

  for (const message of messages) {
    const parts = message.topic.split('/');
    
    for (let i = 0; i < parts.length; i++) {
      if (!segmentsByLevel.has(i)) {
        segmentsByLevel.set(i, new Set());
      }
      segmentsByLevel.get(i)!.add(parts[i]);
    }
  }

  return segmentsByLevel;
}

/**
 * Suggest topic parameters based on segment variability
 * Returns level indices where parameters could be used
 */
export function suggestParameters(
  messages: ExtractedMessage[],
  minVariants: number = 2
): Map<number, string[]> {
  const segmentsByLevel = extractTopicSegments(messages);
  const suggestions = new Map<number, string[]>();

  for (const [level, segments] of segmentsByLevel) {
    if (segments.size >= minVariants) {
      suggestions.set(level, Array.from(segments).sort());
    }
  }

  return suggestions;
}
