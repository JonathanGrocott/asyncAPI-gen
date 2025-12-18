/**
 * Channel Manager - Handles topic parameterization and channel definitions
 */

import type { 
  ExtractedMessage, 
  ChannelDefinition, 
  TopicSubstitution,
  GeneratorConfig 
} from '../shared/types.js';

/**
 * Build channel definitions from extracted messages
 */
export function buildChannels(
  messages: ExtractedMessage[],
  config: GeneratorConfig
): ChannelDefinition[] {
  if (config.channelMode === 'verbose') {
    return buildVerboseChannels(messages);
  } else {
    return buildParameterizedChannels(messages, config.topicSubstitutions);
  }
}

/**
 * Build verbose channels - one channel per unique topic
 */
function buildVerboseChannels(messages: ExtractedMessage[]): ChannelDefinition[] {
  const channelMap = new Map<string, ChannelDefinition>();

  for (const message of messages) {
    const channelId = topicToChannelId(message.topic);
    
    if (!channelMap.has(message.topic)) {
      channelMap.set(message.topic, {
        channelId,
        topic: message.topic,
        parameters: {},
        messages: [],
      });
    }

    channelMap.get(message.topic)!.messages.push(message);
  }

  return Array.from(channelMap.values());
}

/**
 * Build parameterized channels - applies substitutions to create template topics
 */
function buildParameterizedChannels(
  messages: ExtractedMessage[],
  substitutions: TopicSubstitution[]
): ChannelDefinition[] {
  const channelMap = new Map<string, ChannelDefinition>();

  for (const message of messages) {
    const { parameterizedTopic, parameters } = applySubstitutions(
      message.topic,
      substitutions
    );

    const channelId = topicToChannelId(parameterizedTopic);

    if (!channelMap.has(parameterizedTopic)) {
      channelMap.set(parameterizedTopic, {
        channelId,
        topic: parameterizedTopic,
        parameters: buildParameterDefinitions(parameters, substitutions),
        messages: [],
      });
    }

    channelMap.get(parameterizedTopic)!.messages.push(message);
  }

  return Array.from(channelMap.values());
}

/**
 * Apply topic substitutions to create a parameterized topic
 */
export function applySubstitutions(
  topic: string,
  substitutions: TopicSubstitution[]
): { parameterizedTopic: string; parameters: Map<string, string> } {
  const parts = topic.split('/');
  const parameters = new Map<string, string>();

  for (const sub of substitutions) {
    if (sub.levelIndex < parts.length) {
      const originalValue = parts[sub.levelIndex];
      
      // Check if this value matches the substitution pattern
      if (matchesSubstitution(originalValue, sub)) {
        parameters.set(sub.parameterName, originalValue);
        parts[sub.levelIndex] = `{${sub.parameterName}}`;
      }
    }
  }

  return {
    parameterizedTopic: parts.join('/'),
    parameters,
  };
}

/**
 * Check if a value matches a substitution pattern
 */
function matchesSubstitution(value: string, sub: TopicSubstitution): boolean {
  // If specific values are listed, check if value is in the list
  if (sub.values && sub.values.length > 0) {
    return sub.values.includes(value);
  }
  
  // If a pattern is provided, test against it
  if (sub.pattern) {
    const regex = new RegExp(sub.pattern);
    return regex.test(value);
  }
  
  // Default: always match (parameterize all values at this level)
  return true;
}

/**
 * Build parameter definitions for a channel
 */
function buildParameterDefinitions(
  usedParameters: Map<string, string>,
  substitutions: TopicSubstitution[]
): Record<string, { description?: string; enum?: string[] }> {
  const definitions: Record<string, { description?: string; enum?: string[] }> = {};

  for (const [paramName] of usedParameters) {
    const sub = substitutions.find(s => s.parameterName === paramName);
    
    if (sub) {
      definitions[paramName] = {};
      
      if (sub.description) {
        definitions[paramName].description = sub.description;
      }
      
      if (sub.values && sub.values.length > 0) {
        definitions[paramName].enum = sub.values;
      }
    }
  }

  return definitions;
}

/**
 * Convert a topic to a valid channel ID
 * Removes slashes and special characters
 */
export function topicToChannelId(topic: string): string {
  return topic
    .replace(/\{([^}]+)\}/g, '$1') // Remove braces from parameters
    .replace(/[\/\-\.]/g, '_')      // Replace slashes, dashes, dots with underscore
    .replace(/^_+|_+$/g, '')        // Remove leading/trailing underscores
    .replace(/_+/g, '_');           // Collapse multiple underscores
}

/**
 * Auto-detect potential parameters from a set of topics
 * Returns suggested substitutions based on value variability
 */
export function detectParameters(
  messages: ExtractedMessage[],
  minVariants: number = 2
): TopicSubstitution[] {
  const suggestions: TopicSubstitution[] = [];
  const segmentsByLevel = new Map<number, Set<string>>();
  const segmentNames = new Map<number, Set<string>>();

  // Collect all segments at each level
  for (const message of messages) {
    const parts = message.topic.split('/');
    
    for (let i = 0; i < parts.length; i++) {
      if (!segmentsByLevel.has(i)) {
        segmentsByLevel.set(i, new Set());
        segmentNames.set(i, new Set());
      }
      segmentsByLevel.get(i)!.add(parts[i]);
    }
  }

  // Find levels with multiple unique values (good candidates for parameters)
  for (const [level, segments] of segmentsByLevel) {
    if (segments.size >= minVariants) {
      // Try to infer a parameter name from common patterns
      const values = Array.from(segments);
      const paramName = inferParameterName(values, level);
      
      suggestions.push({
        levelIndex: level,
        parameterName: paramName,
        values: values,
        description: `Parameter at level ${level} with ${values.length} variants`,
      });
    }
  }

  return suggestions;
}

/**
 * Infer a parameter name from values
 */
function inferParameterName(values: string[], level: number): string {
  // Check for common patterns
  
  // UUID pattern
  if (values.every(v => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))) {
    return 'uuid';
  }
  
  // Numeric IDs
  if (values.every(v => /^\d+$/.test(v))) {
    return 'id';
  }
  
  // Common naming patterns
  const allUpper = values.every(v => v === v.toUpperCase());
  const allLower = values.every(v => v === v.toLowerCase());
  
  if (values.some(v => v.toLowerCase().includes('machine'))) {
    return 'machineId';
  }
  
  if (values.some(v => v.toLowerCase().includes('area'))) {
    return 'areaId';
  }
  
  if (values.some(v => v.toLowerCase().includes('line'))) {
    return 'lineId';
  }
  
  // Default to level-based name
  return `param${level}`;
}

/**
 * Validate a topic against a parameterized pattern
 */
export function topicMatchesPattern(topic: string, pattern: string): boolean {
  // Convert pattern to regex
  const regexStr = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex chars
    .replace(/\\\{([^}]+)\\\}/g, '([^/]+)'); // Replace {param} with capture group
  
  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(topic);
}

/**
 * Extract parameter values from a topic given a pattern
 */
export function extractParameterValues(
  topic: string,
  pattern: string,
  parameterNames: string[]
): Map<string, string> {
  const values = new Map<string, string>();
  
  // Build regex with named capture groups
  let regexStr = pattern;
  const orderedParams: string[] = [];
  
  // Find parameters in order
  const paramRegex = /\{([^}]+)\}/g;
  let match;
  while ((match = paramRegex.exec(pattern)) !== null) {
    orderedParams.push(match[1]);
  }
  
  // Convert to capturing regex
  regexStr = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\{([^}]+)\\\}/g, '([^/]+)');
  
  const regex = new RegExp(`^${regexStr}$`);
  const result = regex.exec(topic);
  
  if (result) {
    for (let i = 0; i < orderedParams.length; i++) {
      values.set(orderedParams[i], result[i + 1]);
    }
  }
  
  return values;
}
