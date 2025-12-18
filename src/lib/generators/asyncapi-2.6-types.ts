/**
 * AsyncAPI 2.6.0 Type Definitions
 */

export interface AsyncAPI26Document {
  asyncapi: '2.6.0';
  info: {
    title: string;
    version: string;
    description?: string;
    termsOfService?: string;
    contact?: {
      name?: string;
      url?: string;
      email?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers?: Record<string, Server26>;
  channels: Record<string, ChannelItem26>;
  components?: {
    schemas?: Record<string, unknown>;
    messages?: Record<string, Message26>;
    parameters?: Record<string, unknown>;
  };
}

export interface Server26 {
  url: string;
  protocol: string;
  protocolVersion?: string;
  description?: string;
  variables?: Record<string, unknown>;
  security?: unknown[];
  bindings?: Record<string, unknown>;
}

export interface ChannelItem26 {
  description?: string;
  subscribe?: Operation26;
  publish?: Operation26;
  parameters?: Record<string, {
    description?: string;
    schema?: unknown;
  }>;
  bindings?: Record<string, unknown>;
}

export interface Operation26 {
  operationId?: string;
  summary?: string;
  description?: string;
  message?: Message26 | { oneOf: Message26[] };
  bindings?: Record<string, unknown>;
}

export interface Message26 {
  name?: string;
  title?: string;
  summary?: string;
  description?: string;
  contentType?: string;
  payload?: unknown;
  schemaFormat?: string;
  headers?: unknown;
  correlationId?: unknown;
  bindings?: Record<string, unknown>;
  examples?: unknown[];
}
