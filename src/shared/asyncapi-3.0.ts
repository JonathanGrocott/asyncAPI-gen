/**
 * AsyncAPI 3.0.0 Specification Types
 */

import type {
  Contact,
  License,
  Tag,
  ExternalDocumentation,
  Schema,
  Reference,
  SecurityScheme,
  CorrelationId,
  ServerBindings,
  ChannelBindings,
  OperationBindings,
  MessageBindings,
  MessageExample,
} from './asyncapi-2.6.js';

export interface AsyncAPI30Document {
  asyncapi: '3.0.0';
  id?: string;
  info: Info30;
  servers?: Record<string, Server30>;
  defaultContentType?: string;
  channels?: Record<string, Channel30>;
  operations?: Record<string, Operation30>;
  components?: Components30;
}

export interface Info30 {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: Contact;
  license?: License;
  tags?: Tag[];
  externalDocs?: ExternalDocumentation | Reference;
}

export interface Server30 {
  host: string;
  protocol: string;
  protocolVersion?: string;
  pathname?: string;
  description?: string;
  title?: string;
  summary?: string;
  variables?: Record<string, ServerVariable30 | Reference>;
  security?: (SecurityScheme | Reference)[];
  tags?: Tag[];
  externalDocs?: ExternalDocumentation | Reference;
  bindings?: ServerBindings | Reference;
}

export interface ServerVariable30 {
  enum?: string[];
  default?: string;
  description?: string;
  examples?: string[];
}

export interface Channel30 {
  address?: string | null;
  messages?: Record<string, Message30 | Reference>;
  title?: string;
  summary?: string;
  description?: string;
  servers?: Reference[];
  parameters?: Record<string, Parameter30 | Reference>;
  tags?: Tag[];
  externalDocs?: ExternalDocumentation | Reference;
  bindings?: ChannelBindings | Reference;
}

export interface Operation30 {
  action: 'send' | 'receive';
  channel: Reference;
  title?: string;
  summary?: string;
  description?: string;
  security?: (SecurityScheme | Reference)[];
  tags?: Tag[];
  externalDocs?: ExternalDocumentation | Reference;
  bindings?: OperationBindings | Reference;
  traits?: (OperationTrait30 | Reference)[];
  messages?: Reference[];
  reply?: OperationReply | Reference;
}

export interface OperationTrait30 {
  title?: string;
  summary?: string;
  description?: string;
  security?: (SecurityScheme | Reference)[];
  tags?: Tag[];
  externalDocs?: ExternalDocumentation | Reference;
  bindings?: OperationBindings | Reference;
}

export interface OperationReply {
  address?: OperationReplyAddress | Reference;
  channel?: Reference;
  messages?: Reference[];
}

export interface OperationReplyAddress {
  description?: string;
  location: string;
}

export interface Message30 {
  headers?: MultiFormatSchema | Schema | Reference;
  payload?: MultiFormatSchema | Schema | Reference;
  correlationId?: CorrelationId | Reference;
  contentType?: string;
  name?: string;
  title?: string;
  summary?: string;
  description?: string;
  tags?: Tag[];
  externalDocs?: ExternalDocumentation | Reference;
  bindings?: MessageBindings | Reference;
  examples?: MessageExample[];
  traits?: (MessageTrait30 | Reference)[];
}

export interface MessageTrait30 {
  headers?: MultiFormatSchema | Schema | Reference;
  correlationId?: CorrelationId | Reference;
  contentType?: string;
  name?: string;
  title?: string;
  summary?: string;
  description?: string;
  tags?: Tag[];
  externalDocs?: ExternalDocumentation | Reference;
  bindings?: MessageBindings | Reference;
  examples?: MessageExample[];
}

export interface MultiFormatSchema {
  schemaFormat: string;
  schema: unknown;
}

export interface Parameter30 {
  enum?: string[];
  default?: string;
  description?: string;
  examples?: string[];
  location?: string;
}

export interface Components30 {
  schemas?: Record<string, MultiFormatSchema | Schema | Reference>;
  servers?: Record<string, Server30 | Reference>;
  channels?: Record<string, Channel30 | Reference>;
  operations?: Record<string, Operation30 | Reference>;
  messages?: Record<string, Message30 | Reference>;
  securitySchemes?: Record<string, SecurityScheme | Reference>;
  serverVariables?: Record<string, ServerVariable30 | Reference>;
  parameters?: Record<string, Parameter30 | Reference>;
  correlationIds?: Record<string, CorrelationId | Reference>;
  replies?: Record<string, OperationReply | Reference>;
  replyAddresses?: Record<string, OperationReplyAddress | Reference>;
  externalDocs?: Record<string, ExternalDocumentation | Reference>;
  tags?: Record<string, Tag | Reference>;
  operationTraits?: Record<string, OperationTrait30 | Reference>;
  messageTraits?: Record<string, MessageTrait30 | Reference>;
  serverBindings?: Record<string, ServerBindings | Reference>;
  channelBindings?: Record<string, ChannelBindings | Reference>;
  operationBindings?: Record<string, OperationBindings | Reference>;
  messageBindings?: Record<string, MessageBindings | Reference>;
}

// Re-export common types
export type {
  Contact,
  License,
  Tag,
  ExternalDocumentation,
  Schema,
  Reference,
  SecurityScheme,
  CorrelationId,
  ServerBindings,
  ChannelBindings,
  OperationBindings,
  MessageBindings,
  MessageExample,
};
