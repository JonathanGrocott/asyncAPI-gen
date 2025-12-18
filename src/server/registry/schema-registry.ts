/**
 * Schema Registry - Stores and deduplicates schemas
 */

import type { JSONSchema, SchemaEntry } from '../shared/types.js';
import { hashSchema, schemasEqual, mergeSchemas } from '../schema/inferrer.js';

/**
 * Schema Registry class for managing message schemas
 */
export class SchemaRegistry {
  private schemas: Map<string, SchemaEntry> = new Map();
  private hashToName: Map<string, string> = new Map();

  /**
   * Register a schema, deduplicating if an equivalent already exists
   * @param name - Proposed schema name (e.g., from _model field)
   * @param schema - The JSON Schema to register
   * @returns The actual schema name used (may be existing if duplicate)
   */
  register(name: string, schema: JSONSchema): string {
    const hash = hashSchema(schema);

    // Check if an equivalent schema already exists
    if (this.hashToName.has(hash)) {
      const existingName = this.hashToName.get(hash)!;
      const existing = this.schemas.get(existingName)!;
      existing.usageCount++;
      return existingName;
    }

    // Check if name already exists with different schema
    let uniqueName = name;
    let counter = 1;
    while (this.schemas.has(uniqueName)) {
      // If schemas are the same (by hash), use existing
      const existing = this.schemas.get(uniqueName)!;
      if (hashSchema(existing.schema) === hash) {
        existing.usageCount++;
        return uniqueName;
      }
      // Otherwise, increment name
      uniqueName = `${name}_${counter}`;
      counter++;
    }

    // Register new schema
    const entry: SchemaEntry = {
      name: uniqueName,
      schema,
      usageCount: 1,
    };

    this.schemas.set(uniqueName, entry);
    this.hashToName.set(hash, uniqueName);

    return uniqueName;
  }

  /**
   * Get a schema by name
   */
  get(name: string): SchemaEntry | undefined {
    return this.schemas.get(name);
  }

  /**
   * Get all registered schemas
   */
  getAll(): SchemaEntry[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Get schemas as a record for AsyncAPI output
   */
  toRecord(): Record<string, JSONSchema> {
    const result: Record<string, JSONSchema> = {};
    for (const [name, entry] of this.schemas) {
      result[name] = entry.schema;
    }
    return result;
  }

  /**
   * Check if a schema with this name exists
   */
  has(name: string): boolean {
    return this.schemas.has(name);
  }

  /**
   * Find a schema by its content (exact match)
   */
  findBySchema(schema: JSONSchema): string | undefined {
    const hash = hashSchema(schema);
    return this.hashToName.get(hash);
  }

  /**
   * Merge a new schema with an existing one
   * Useful for updating schemas with additional examples
   */
  mergeWith(name: string, newSchema: JSONSchema): void {
    const existing = this.schemas.get(name);
    if (existing) {
      const merged = mergeSchemas(existing.schema, newSchema);
      const newHash = hashSchema(merged);
      const oldHash = hashSchema(existing.schema);

      // Update hash mapping
      this.hashToName.delete(oldHash);
      this.hashToName.set(newHash, name);

      existing.schema = merged;
      existing.usageCount++;
    }
  }

  /**
   * Clear all schemas
   */
  clear(): void {
    this.schemas.clear();
    this.hashToName.clear();
  }

  /**
   * Get statistics about registered schemas
   */
  getStats(): {
    totalSchemas: number;
    totalUsages: number;
    mostUsed: Array<{ name: string; count: number }>;
  } {
    const entries = Array.from(this.schemas.values());
    const totalUsages = entries.reduce((sum, e) => sum + e.usageCount, 0);

    const mostUsed = entries
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map(e => ({ name: e.name, count: e.usageCount }));

    return {
      totalSchemas: this.schemas.size,
      totalUsages,
      mostUsed,
    };
  }

  /**
   * Export registry state for persistence
   */
  export(): Record<string, SchemaEntry> {
    const result: Record<string, SchemaEntry> = {};
    for (const [name, entry] of this.schemas) {
      result[name] = { ...entry };
    }
    return result;
  }

  /**
   * Import registry state
   */
  import(data: Record<string, SchemaEntry>): void {
    this.clear();
    for (const [name, entry] of Object.entries(data)) {
      this.schemas.set(name, { ...entry });
      this.hashToName.set(hashSchema(entry.schema), name);
    }
  }
}

/**
 * Global schema registry instance
 */
let globalRegistry: SchemaRegistry | null = null;

/**
 * Get the global schema registry
 */
export function getSchemaRegistry(): SchemaRegistry {
  if (!globalRegistry) {
    globalRegistry = new SchemaRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global schema registry
 */
export function resetSchemaRegistry(): void {
  globalRegistry = new SchemaRegistry();
}
