/**
 * Schema Inferrer - Generates JSON Schema from example payloads
 */

import type { JSONSchema } from '../shared/types.js';

/**
 * Infer JSON Schema from a sample value
 */
export function inferSchema(value: unknown, includeExamples: boolean = true): JSONSchema {
  if (value === null) {
    return { type: 'null' };
  }

  if (value === undefined) {
    return {};
  }

  const type = typeof value;

  switch (type) {
    case 'string':
      return inferStringSchema(value as string, includeExamples);
    case 'number':
      return inferNumberSchema(value as number, includeExamples);
    case 'boolean':
      return { type: 'boolean', ...(includeExamples ? { examples: [value] } : {}) };
    case 'object':
      if (Array.isArray(value)) {
        return inferArraySchema(value, includeExamples);
      }
      return inferObjectSchema(value as Record<string, unknown>, includeExamples);
    default:
      return {};
  }
}

/**
 * Infer schema for string values, detecting common formats
 */
function inferStringSchema(value: string, includeExamples: boolean): JSONSchema {
  const schema: JSONSchema = { type: 'string' };

  // Detect common formats
  const format = detectStringFormat(value);
  if (format) {
    schema.format = format;
  }

  if (includeExamples && value.length > 0) {
    schema.examples = [value];
  }

  return schema;
}

/**
 * Detect string format from value
 */
function detectStringFormat(value: string): string | undefined {
  // ISO 8601 date-time
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(value)) {
    return 'date-time';
  }

  // ISO 8601 date
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return 'date';
  }

  // US date format (common in the example data)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*(AM|PM)?$/i.test(value)) {
    return 'date-time';
  }

  // Time
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
    return 'time';
  }

  // UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return 'uuid';
  }

  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'email';
  }

  // URI
  if (/^https?:\/\//.test(value)) {
    return 'uri';
  }

  return undefined;
}

/**
 * Infer schema for number values
 */
function inferNumberSchema(value: number, includeExamples: boolean): JSONSchema {
  const isInteger = Number.isInteger(value);
  const schema: JSONSchema = {
    type: isInteger ? 'integer' : 'number',
  };

  if (includeExamples) {
    schema.examples = [value];
  }

  return schema;
}

/**
 * Infer schema for array values
 */
function inferArraySchema(value: unknown[], includeExamples: boolean): JSONSchema {
  const schema: JSONSchema = { type: 'array' };

  if (value.length > 0) {
    // Infer items schema from first element
    // TODO: Could merge schemas from all elements for more accuracy
    schema.items = inferSchema(value[0], includeExamples);
  }

  return schema;
}

/**
 * Infer schema for object values
 * Filters out metadata fields that start with underscore
 * Does not mark properties as required (report-by-exception pattern)
 */
function inferObjectSchema(
  value: Record<string, unknown>,
  includeExamples: boolean
): JSONSchema {
  const schema: JSONSchema = {
    type: 'object',
    properties: {},
  };

  for (const [key, val] of Object.entries(value)) {
    // Skip metadata fields (those starting with _)
    if (key.startsWith('_')) {
      continue;
    }

    schema.properties![key] = inferSchema(val, includeExamples);
  }

  // Add _timestamp field to all object schemas (required for all messages)
  schema.properties!['_timestamp'] = {
    type: 'string',
    format: 'date-time',
    description: 'Timestamp when the data was published',
  };

  return schema;
}

/**
 * Merge two schemas together (for combining multiple examples)
 */
export function mergeSchemas(schema1: JSONSchema, schema2: JSONSchema): JSONSchema {
  // If types differ, create a union
  if (schema1.type !== schema2.type) {
    const types = new Set<string>();
    if (schema1.type) {
      if (Array.isArray(schema1.type)) {
        schema1.type.forEach(t => types.add(t));
      } else {
        types.add(schema1.type);
      }
    }
    if (schema2.type) {
      if (Array.isArray(schema2.type)) {
        schema2.type.forEach(t => types.add(t));
      } else {
        types.add(schema2.type);
      }
    }
    return { type: Array.from(types) };
  }

  // Same type, merge based on type
  if (schema1.type === 'object' && schema2.type === 'object') {
    return mergeObjectSchemas(schema1, schema2);
  }

  if (schema1.type === 'array' && schema2.type === 'array') {
    return mergeArraySchemas(schema1, schema2);
  }

  // For primitives, merge examples
  const merged: JSONSchema = { ...schema1 };
  if (schema1.examples && schema2.examples) {
    const exampleSet = new Set([...schema1.examples, ...schema2.examples]);
    merged.examples = Array.from(exampleSet).slice(0, 5); // Keep max 5 examples
  }

  return merged;
}

/**
 * Merge two object schemas
 * Does not merge required fields (all properties are optional)
 */
function mergeObjectSchemas(schema1: JSONSchema, schema2: JSONSchema): JSONSchema {
  const merged: JSONSchema = {
    type: 'object',
    properties: {},
  };

  const allKeys = new Set([
    ...Object.keys(schema1.properties || {}),
    ...Object.keys(schema2.properties || {}),
  ]);

  for (const key of allKeys) {
    const prop1 = schema1.properties?.[key];
    const prop2 = schema2.properties?.[key];

    if (prop1 && prop2) {
      merged.properties![key] = mergeSchemas(prop1, prop2);
    } else {
      merged.properties![key] = prop1 || prop2!;
    }
  }

  // No required fields in merged schemas (report-by-exception pattern)

  return merged;
}

/**
 * Merge two array schemas
 */
function mergeArraySchemas(schema1: JSONSchema, schema2: JSONSchema): JSONSchema {
  const merged: JSONSchema = { type: 'array' };

  if (schema1.items && schema2.items) {
    merged.items = mergeSchemas(schema1.items, schema2.items);
  } else {
    merged.items = schema1.items || schema2.items;
  }

  return merged;
}

/**
 * Create a hash of a schema for deduplication
 */
export function hashSchema(schema: JSONSchema): string {
  // Create a normalized representation for hashing
  const normalized = normalizeSchema(schema);
  return JSON.stringify(normalized);
}

/**
 * Normalize schema for comparison (remove examples, sort keys)
 */
function normalizeSchema(schema: JSONSchema): JSONSchema {
  const normalized: JSONSchema = {};

  // Copy basic properties (sorted order)
  const sortedKeys = Object.keys(schema).sort();
  
  for (const key of sortedKeys) {
    // Skip examples for comparison
    if (key === 'examples') continue;

    const value = schema[key as keyof JSONSchema];
    
    if (key === 'properties' && typeof value === 'object' && value !== null) {
      // Recursively normalize properties
      const props: Record<string, JSONSchema> = {};
      const propKeys = Object.keys(value as Record<string, JSONSchema>).sort();
      for (const propKey of propKeys) {
        props[propKey] = normalizeSchema((value as Record<string, JSONSchema>)[propKey]);
      }
      (normalized as Record<string, unknown>)[key] = props;
    } else if (key === 'items' && typeof value === 'object' && value !== null) {
      // Recursively normalize items
      (normalized as Record<string, unknown>)[key] = normalizeSchema(value as JSONSchema);
    } else if (key === 'required' && Array.isArray(value)) {
      // Sort required array
      (normalized as Record<string, unknown>)[key] = [...value].sort();
    } else {
      (normalized as Record<string, unknown>)[key] = value;
    }
  }

  return normalized;
}

/**
 * Check if two schemas are equivalent (ignoring examples)
 */
export function schemasEqual(schema1: JSONSchema, schema2: JSONSchema): boolean {
  return hashSchema(schema1) === hashSchema(schema2);
}
