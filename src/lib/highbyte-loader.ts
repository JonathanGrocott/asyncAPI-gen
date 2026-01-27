/**
 * HighByte Intelligence Hub Project Loader (Browser Version)
 * Converts HighByte project exports to ExtractedMessages for AsyncAPI generation
 */

import type { ExtractedMessage, JSONSchema, ServerConfig } from './types';
import type {
  HighByteProjectExport,
  HighByteConnection,
  HighByteOutput,
  HighByteInput,
  HighByteModel,
  HighByteAttribute,
  HighByteInternalType,
} from './highbyte-types';

export interface HighByteLoaderResult {
  messages: ExtractedMessage[];
  servers: ServerConfig[];
  models: Map<string, JSONSchema>;
  warnings: string[];
}

/**
 * Main loader function for HighByte project exports
 */
export function loadHighByteProject(data: unknown): HighByteLoaderResult {
  const warnings: string[] = [];
  
  // Validate the input
  if (!isHighByteProjectExport(data)) {
    throw new Error('Invalid HighByte project export format');
  }

  const project = data.project;
  
  // Extract MQTT connections as servers
  const servers = extractMQTTServers(project.connections);
  
  // Extract models and convert to JSON Schema
  const models = extractModels(project.modeling?.models || []);
  
  // Extract MQTT outputs as publish messages
  const publishMessages = extractMQTTOutputs(
    project.outputs,
    project.connections,
    models,
    warnings
  );
  
  // Extract MQTT inputs as subscribe messages
  const subscribeMessages = extractMQTTInputs(
    project.inputs,
    project.connections,
    models,
    warnings
  );
  
  const messages = [...publishMessages, ...subscribeMessages];
  
  return {
    messages,
    servers,
    models,
    warnings,
  };
}

/**
 * Type guard for HighByte project export
 */
function isHighByteProjectExport(data: unknown): data is HighByteProjectExport {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  
  return !!(
    obj.productInfo &&
    typeof obj.productInfo === 'object' &&
    obj.project &&
    typeof obj.project === 'object'
  );
}

/**
 * Extract MQTT connections and convert to ServerConfig
 */
function extractMQTTServers(connections: HighByteConnection[]): ServerConfig[] {
  const servers: ServerConfig[] = [];
  
  for (const conn of connections) {
    if (!conn.uri) continue;
    
    // Parse MQTT URIs (e.g., "mqtt://host:port" or "mqtts://host:port")
    const mqttMatch = conn.uri.match(/^(mqtts?):\/\/([^:]+):(\d+)/);
    if (mqttMatch) {
      const [, protocol, host, port] = mqttMatch;
      
      servers.push({
        name: conn.name,
        url: `${host}:${port}`,
        protocol: protocol as 'mqtt' | 'mqtts',
        description: conn.description || `HighByte connection: ${conn.name}`,
      });
    }
  }
  
  return servers;
}

/**
 * Extract models and convert to JSON Schema
 */
function extractModels(models: HighByteModel[]): Map<string, JSONSchema> {
  const schemaMap = new Map<string, JSONSchema>();
  
  for (const model of models) {
    const schema = convertModelToSchema(model);
    schemaMap.set(model.name, schema);
  }
  
  return schemaMap;
}

/**
 * Convert a HighByte model to JSON Schema
 */
function convertModelToSchema(model: HighByteModel): JSONSchema {
  const properties: Record<string, JSONSchema> = {};
  const required: string[] = [];
  
  for (const attr of model.attributes) {
    // Skip metadata fields (those starting with underscore)
    if (attr.name.startsWith('_')) continue;
    
    const propSchema = convertAttributeToSchema(attr);
    properties[attr.name] = propSchema;
    
    if (attr.required && !attr.nullable) {
      required.push(attr.name);
    }
  }
  
  const schema: JSONSchema = {
    type: 'object',
    properties,
  };
  
  if (model.description) {
    schema.description = model.description;
  }
  
  if (required.length > 0) {
    schema.required = required;
  }
  
  return schema;
}

/**
 * Convert a HighByte attribute to JSON Schema property
 */
function convertAttributeToSchema(attr: HighByteAttribute): JSONSchema {
  const schema: JSONSchema = {};
  
  // Handle arrays
  if (attr.array) {
    schema.type = 'array';
    schema.items = {
      ...convertTypeToSchema(attr.internalType || 'Any'),
    };
  } else {
    Object.assign(schema, convertTypeToSchema(attr.internalType || 'Any'));
  }
  
  // Add description
  if (attr.description) {
    schema.description = attr.description;
  }
  
  // Add default value
  if (attr.defaultValue !== undefined) {
    schema.default = attr.defaultValue;
  }
  
  // Handle nullable
  if (attr.nullable && schema.type) {
    schema.type = [schema.type as string, 'null'];
  }
  
  return schema;
}

/**
 * Convert HighByte internal type to JSON Schema type
 */
function convertTypeToSchema(type: HighByteInternalType): JSONSchema {
  switch (type) {
    case 'String':
      return { type: 'string' };
    
    case 'Int32':
      return { type: 'integer', format: 'int32' };
    
    case 'Int64':
      return { type: 'integer', format: 'int64' };
    
    case 'Float':
      return { type: 'number', format: 'float' };
    
    case 'Double':
      return { type: 'number', format: 'double' };
    
    case 'Boolean':
      return { type: 'boolean' };
    
    case 'DateTime':
      return { type: 'string', format: 'date-time' };
    
    case 'Any':
    default:
      // No type constraint for 'Any'
      return {};
  }
}

/**
 * Extract MQTT outputs (publish operations)
 */
function extractMQTTOutputs(
  outputs: HighByteOutput[],
  connections: HighByteConnection[],
  models: Map<string, JSONSchema>,
  warnings: string[]
): ExtractedMessage[] {
  const messages: ExtractedMessage[] = [];
  
  // Create connection lookup map
  const connectionMap = new Map(connections.map(c => [c.name, c]));
  
  for (const output of outputs) {
    // Only process MQTT outputs
    if (output.type !== 'mqtt') continue;
    
    const connection = connectionMap.get(output.connection);
    if (!connection) {
      warnings.push(`Output "${output.name}" references unknown connection "${output.connection}"`);
      continue;
    }
    
    // Only process MQTT connections
    if (!connection.uri?.startsWith('mqtt')) continue;
    
    const topic = output.qualifier.topic;
    if (!topic) {
      warnings.push(`MQTT output "${output.name}" has no topic specified`);
      continue;
    }
    
    // Try to find a matching model
    const modelName = findMatchingModel(output.name, models);
    let payload: Record<string, unknown>;
    
    if (modelName && models.has(modelName)) {
      // Use the model schema as payload structure
      const schema = models.get(modelName)!;
      payload = createSampleFromSchema(schema);
    } else {
      // No model found - create default payload with warning
      payload = {
        _note: 'No HighByte model found for this output',
      };
      warnings.push(
        `MQTT output "${output.name}" has no associated model. Using default payload.`
      );
    }
    
    messages.push({
      topic,
      payload,
      modelName: modelName || undefined,
      timestamp: new Date(),
      servers: [connection.name],
    });
  }
  
  return messages;
}

/**
 * Extract MQTT inputs (subscribe operations)
 */
function extractMQTTInputs(
  inputs: HighByteInput[],
  connections: HighByteConnection[],
  models: Map<string, JSONSchema>,
  warnings: string[]
): ExtractedMessage[] {
  const messages: ExtractedMessage[] = [];
  
  // Create connection lookup map
  const connectionMap = new Map(connections.map(c => [c.name, c]));
  
  for (const input of inputs) {
    // Only process MQTT inputs
    if (input.type !== 'mqtt') continue;
    
    const connection = connectionMap.get(input.connection);
    if (!connection) {
      warnings.push(`Input "${input.name}" references unknown connection "${input.connection}"`);
      continue;
    }
    
    // Only process MQTT connections
    if (!connection.uri?.startsWith('mqtt')) continue;
    
    const topic = input.qualifier.topic;
    if (!topic) {
      warnings.push(`MQTT input "${input.name}" has no topic specified`);
      continue;
    }
    
    // Try to find a matching model
    const modelName = findMatchingModel(input.name, models);
    let payload: Record<string, unknown>;
    
    if (modelName && models.has(modelName)) {
      // Use the model schema as payload structure
      const schema = models.get(modelName)!;
      payload = createSampleFromSchema(schema);
    } else {
      // No model found - create default payload with warning
      payload = {
        _note: 'No HighByte model found for this input',
      };
      warnings.push(
        `MQTT input "${input.name}" has no associated model. Using default payload.`
      );
    }
    
    messages.push({
      topic,
      payload,
      modelName: modelName || undefined,
      timestamp: new Date(),
      servers: [connection.name],
    });
  }
  
  return messages;
}

/**
 * Find a matching model for an input/output by name similarity
 */
function findMatchingModel(name: string, models: Map<string, JSONSchema>): string | null {
  // Direct match
  if (models.has(name)) return name;
  
  // Try case-insensitive match
  const lowerName = name.toLowerCase();
  for (const modelName of models.keys()) {
    if (modelName.toLowerCase() === lowerName) {
      return modelName;
    }
  }
  
  // Try partial match (model name contained in input/output name or vice versa)
  for (const modelName of models.keys()) {
    const lowerModelName = modelName.toLowerCase();
    if (lowerName.includes(lowerModelName) || lowerModelName.includes(lowerName)) {
      return modelName;
    }
  }
  
  // Try matching by key terms (e.g., "AFP2_Alarms" -> "ATLM_Alarms_v1")
  const nameTerms = lowerName.split(/[_\-\/]/);
  
  for (const modelName of models.keys()) {
    const lowerModelName = modelName.toLowerCase();
    const modelTerms = lowerModelName.split(/[_\-\/]/);
    
    // Check if there's significant term overlap
    const matchingTerms = nameTerms.filter(term => 
      term.length > 2 && modelTerms.some(mt => mt.includes(term) || term.includes(mt))
    );
    
    if (matchingTerms.length > 0) {
      return modelName;
    }
  }
  
  return null;
}

/**
 * Create a sample payload from a JSON Schema
 */
function createSampleFromSchema(schema: JSONSchema): Record<string, unknown> {
  const sample: Record<string, unknown> = {};
  
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      sample[key] = getDefaultValue(propSchema);
    }
  }
  
  return sample;
}

/**
 * Get a default value for a schema property
 */
function getDefaultValue(schema: JSONSchema): unknown {
  if (schema.default !== undefined) {
    return schema.default;
  }
  
  if (schema.type === 'array') {
    return [];
  }
  
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  
  switch (type) {
    case 'string':
      return schema.format === 'date-time' ? new Date().toISOString() : '';
    case 'integer':
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'object':
      return schema.properties ? createSampleFromSchema(schema) : {};
    default:
      return null;
  }
}
