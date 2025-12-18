/**
 * AsyncAPI 3.0.0 Type Definitions
 */

export interface AsyncAPI30Document {
  asyncapi: '3.0.0';
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
  servers?: Record<string, Server30>;
  channels?: Record<string, Channel30>;
  operations?: Record<string, Operation30>;
  components?: {
    schemas?: Record<string, unknown>;
    messages?: Record<string, Message30>;
    parameters?: Record<string, unknown>;
  };
}

export interface Server30 {
  host: string;
  protocol: string;
  protocolVersion?: string;
  pathname?: string;
  description?: string;
  variables?: Record<string, unknown>;
  security?: unknown[];
  bindings?: Record<string, unknown>;
}

export interface Channel30 {
  address?: string;
  title?: string;
  description?: string;
  messages?: Record<string, { $ref: string } | Message30>;
  parameters?: Record<string, {
    description?: string;
    enum?: string[];
  }>;
  bindings?: Record<string, unknown>;
}

export interface Operation30 {
  action: 'send' | 'receive';
  channel: {
    $ref: string;
  };
  title?: string;
  summary?: string;
  description?: string;
  messages?: Array<{ $ref: string }>;
  bindings?: Record<string, unknown>;
}

export interface Message30 {
  name?: string;
  title?: string;
  summary?: string;
  description?: string;
  contentType?: string;
  payload?: unknown;
  headers?: unknown;
  correlationId?: unknown;
  bindings?: Record<string, unknown>;
  examples?: unknown[];
}
