/**
 * Schema Registry - Manages and deduplicates JSON schemas
 * Browser-compatible version
 */

import type { JSONSchema } from './types';
import { hashSchema, mergeSchemas } from './schema-inferrer';

interface SchemaEntry {
  name: string;
  schema: JSONSchema;
  usageCount: number;
}

export class SchemaRegistry {
  private schemas: Map<string, SchemaEntry> = new Map();
  private hashToName: Map<string, string> = new Map();

  /**
   * Register a schema with a given name
   * If the schema already exists (by content), returns the existing name
   * If a schema with the same name exists but different content, merges them
   */
  register(name: string, schema: JSONSchema): string {
    const hash = hashSchema(schema);
    
    // Check if we've seen this exact schema before
    const existingName = this.hashToName.get(hash);
    if (existingName) {
      const entry = this.schemas.get(existingName)!;
      entry.usageCount++;
      return existingName;
    }

    // Check if a schema with this name exists
    if (this.schemas.has(name)) {
      const existing = this.schemas.get(name)!;
      // Merge the schemas
      const merged = mergeSchemas(existing.schema, schema);
      existing.schema = merged;
      existing.usageCount++;
      
      // Update hash mapping
      const newHash = hashSchema(merged);
      this.hashToName.set(newHash, name);
      
      return name;
    }

    // New schema
    this.schemas.set(name, { name, schema, usageCount: 1 });
    this.hashToName.set(hash, name);
    
    return name;
  }

  /**
   * Get a schema by name
   */
  get(name: string): JSONSchema | undefined {
    return this.schemas.get(name)?.schema;
  }

  /**
   * Get all schemas as a record
   */
  toRecord(): Record<string, JSONSchema> {
    const result: Record<string, JSONSchema> = {};
    for (const [name, entry] of this.schemas) {
      result[name] = entry.schema;
    }
    return result;
  }

  /**
   * Get all schema entries
   */
  entries(): SchemaEntry[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Clear all schemas
   */
  clear(): void {
    this.schemas.clear();
    this.hashToName.clear();
  }

  /**
   * Get the number of unique schemas
   */
  get size(): number {
    return this.schemas.size;
  }
}
