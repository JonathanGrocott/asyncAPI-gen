/**
 * Schema Inferrer - Generates JSON Schema from example payloads
 * Client-side compatible (no Node.js dependencies)
 */

import type { JSONSchema } from './types';

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

  // US date format
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
  const schema: JSONSchema = {
    type: Number.isInteger(value) ? 'integer' : 'number',
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
    schema.items = inferSchema(value[0], false);

    // Try to merge schemas from all elements for better accuracy
    if (value.length > 1) {
      for (let i = 1; i < Math.min(value.length, 10); i++) {
        const itemSchema = inferSchema(value[i], false);
        schema.items = mergeSchemas(schema.items, itemSchema);
      }
    }
  }

  if (includeExamples && value.length > 0) {
    schema.examples = [value.slice(0, 3)];
  }

  return schema;
}

/**
 * Infer schema for object values
 */
function inferObjectSchema(value: Record<string, unknown>, includeExamples: boolean): JSONSchema {
  const schema: JSONSchema = {
    type: 'object',
    properties: {},
    required: [],
  };

  for (const [key, val] of Object.entries(value)) {
    schema.properties![key] = inferSchema(val, false);
    schema.required!.push(key);
  }

  // Sort required for consistency
  schema.required!.sort();

  return schema;
}

/**
 * Merge two schemas to create a more general schema
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

  // For objects, merge properties
  if (schema1.type === 'object' && schema2.type === 'object') {
    const merged: JSONSchema = {
      type: 'object',
      properties: { ...schema1.properties },
      required: [],
    };

    // Merge properties from schema2
    for (const [key, prop] of Object.entries(schema2.properties || {})) {
      if (merged.properties![key]) {
        merged.properties![key] = mergeSchemas(merged.properties![key], prop);
      } else {
        merged.properties![key] = prop;
      }
    }

    // Required = intersection of both required arrays
    const req1 = new Set(schema1.required || []);
    const req2 = new Set(schema2.required || []);
    merged.required = Array.from(req1).filter(k => req2.has(k)).sort();

    return merged;
  }

  // For arrays, merge items
  if (schema1.type === 'array' && schema2.type === 'array') {
    return {
      type: 'array',
      items: schema1.items && schema2.items 
        ? mergeSchemas(schema1.items, schema2.items)
        : schema1.items || schema2.items,
    };
  }

  return schema1;
}

/**
 * Generate a hash for a schema (for deduplication)
 */
export function hashSchema(schema: JSONSchema): string {
  const normalized = normalizeSchema(schema);
  return JSON.stringify(normalized);
}

/**
 * Normalize schema for consistent hashing
 */
function normalizeSchema(schema: JSONSchema): JSONSchema {
  const normalized: JSONSchema = {};

  if (schema.type) normalized.type = schema.type;
  if (schema.format) normalized.format = schema.format;

  if (schema.properties) {
    normalized.properties = {};
    const sortedKeys = Object.keys(schema.properties).sort();
    for (const key of sortedKeys) {
      normalized.properties[key] = normalizeSchema(schema.properties[key]);
    }
  }

  if (schema.items) {
    normalized.items = normalizeSchema(schema.items);
  }

  if (schema.required) {
    normalized.required = [...schema.required].sort();
  }

  return normalized;
}
