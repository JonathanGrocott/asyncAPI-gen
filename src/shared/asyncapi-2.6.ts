/**
 * AsyncAPI 2.6.0 Specification Types
 */

export interface AsyncAPI26Document {
  asyncapi: '2.6.0';
  id?: string;
  info: Info26;
  servers?: Record<string, Server26>;
  defaultContentType?: string;
  channels: Record<string, ChannelItem26>;
  components?: Components26;
  tags?: Tag[];
  externalDocs?: ExternalDocumentation;
}

export interface Info26 {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: Contact;
  license?: License;
}

export interface Contact {
  name?: string;
  url?: string;
  email?: string;
}

export interface License {
  name: string;
  url?: string;
}

export interface Server26 {
  url: string;
  protocol: string;
  protocolVersion?: string;
  description?: string;
  variables?: Record<string, ServerVariable>;
  security?: SecurityRequirement[];
  tags?: Tag[];
  bindings?: ServerBindings;
}

export interface ServerVariable {
  enum?: string[];
  default?: string;
  description?: string;
  examples?: string[];
}

export interface ChannelItem26 {
  $ref?: string;
  description?: string;
  servers?: string[];
  subscribe?: Operation26;
  publish?: Operation26;
  parameters?: Record<string, Parameter26 | Reference>;
  bindings?: ChannelBindings;
}

export interface Operation26 {
  operationId?: string;
  summary?: string;
  description?: string;
  security?: SecurityRequirement[];
  tags?: Tag[];
  externalDocs?: ExternalDocumentation;
  bindings?: OperationBindings;
  traits?: (OperationTrait | Reference)[];
  message?: Message26 | Reference | { oneOf: (Message26 | Reference)[] };
}

export interface Message26 {
  messageId?: string;
  headers?: Schema | Reference;
  payload?: unknown;
  correlationId?: CorrelationId | Reference;
  schemaFormat?: string;
  contentType?: string;
  name?: string;
  title?: string;
  summary?: string;
  description?: string;
  tags?: Tag[];
  externalDocs?: ExternalDocumentation;
  bindings?: MessageBindings;
  examples?: MessageExample[];
  traits?: (MessageTrait | Reference)[];
}

export interface Parameter26 {
  description?: string;
  schema?: Schema | Reference;
  location?: string;
}

export interface Components26 {
  schemas?: Record<string, Schema | Reference>;
  servers?: Record<string, Server26 | Reference>;
  serverVariables?: Record<string, ServerVariable | Reference>;
  channels?: Record<string, ChannelItem26>;
  messages?: Record<string, Message26 | Reference>;
  securitySchemes?: Record<string, SecurityScheme | Reference>;
  parameters?: Record<string, Parameter26 | Reference>;
  correlationIds?: Record<string, CorrelationId | Reference>;
  operationTraits?: Record<string, OperationTrait | Reference>;
  messageTraits?: Record<string, MessageTrait | Reference>;
  serverBindings?: Record<string, ServerBindings | Reference>;
  channelBindings?: Record<string, ChannelBindings | Reference>;
  operationBindings?: Record<string, OperationBindings | Reference>;
  messageBindings?: Record<string, MessageBindings | Reference>;
}

// Common types used by both versions
export interface Schema {
  type?: string | string[];
  properties?: Record<string, Schema | Reference>;
  items?: Schema | Reference;
  required?: string[];
  description?: string;
  format?: string;
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  examples?: unknown[];
  additionalProperties?: boolean | Schema | Reference;
  oneOf?: (Schema | Reference)[];
  anyOf?: (Schema | Reference)[];
  allOf?: (Schema | Reference)[];
  title?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  deprecated?: boolean;
  discriminator?: string;
  externalDocs?: ExternalDocumentation;
}

export interface Reference {
  $ref: string;
}

export interface Tag {
  name: string;
  description?: string;
  externalDocs?: ExternalDocumentation;
}

export interface ExternalDocumentation {
  description?: string;
  url: string;
}

export interface CorrelationId {
  description?: string;
  location: string;
}

export interface SecurityRequirement {
  [name: string]: string[];
}

export interface SecurityScheme {
  type: string;
  description?: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: OAuthFlows;
  openIdConnectUrl?: string;
}

export interface OAuthFlows {
  implicit?: OAuthFlow;
  password?: OAuthFlow;
  clientCredentials?: OAuthFlow;
  authorizationCode?: OAuthFlow;
}

export interface OAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface OperationTrait {
  operationId?: string;
  summary?: string;
  description?: string;
  security?: SecurityRequirement[];
  tags?: Tag[];
  externalDocs?: ExternalDocumentation;
  bindings?: OperationBindings;
}

export interface MessageTrait {
  messageId?: string;
  headers?: Schema | Reference;
  correlationId?: CorrelationId | Reference;
  schemaFormat?: string;
  contentType?: string;
  name?: string;
  title?: string;
  summary?: string;
  description?: string;
  tags?: Tag[];
  externalDocs?: ExternalDocumentation;
  bindings?: MessageBindings;
  examples?: MessageExample[];
}

export interface MessageExample {
  headers?: Record<string, unknown>;
  payload?: unknown;
  name?: string;
  summary?: string;
}

// Binding types (simplified - protocol specific)
export interface ServerBindings {
  mqtt?: MQTTServerBinding;
  [key: string]: unknown;
}

export interface ChannelBindings {
  mqtt?: MQTTChannelBinding;
  [key: string]: unknown;
}

export interface OperationBindings {
  mqtt?: MQTTOperationBinding;
  [key: string]: unknown;
}

export interface MessageBindings {
  mqtt?: MQTTMessageBinding;
  [key: string]: unknown;
}

// MQTT specific bindings
export interface MQTTServerBinding {
  clientId?: string;
  cleanSession?: boolean;
  lastWill?: {
    topic?: string;
    qos?: number;
    message?: string;
    retain?: boolean;
  };
  keepAlive?: number;
  bindingVersion?: string;
}

export interface MQTTChannelBinding {
  bindingVersion?: string;
}

export interface MQTTOperationBinding {
  qos?: number;
  retain?: boolean;
  bindingVersion?: string;
}

export interface MQTTMessageBinding {
  bindingVersion?: string;
}
