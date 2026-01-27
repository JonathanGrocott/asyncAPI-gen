/**
 * HighByte Intelligence Hub Project Export Types
 */

export interface HighByteProjectExport {
  productInfo: {
    company: string;
    product: string;
    version: string;
    build: string;
    stage: string;
  };
  project: HighByteProject;
}

export interface HighByteProject {
  version: number;
  connections: HighByteConnection[];
  inputs: HighByteInput[];
  outputs: HighByteOutput[];
  modeling?: {
    models: HighByteModel[];
    instances?: HighByteInstance[];
  };
  namespace?: HighByteNamespace[];
  pipelines?: HighBytePipeline[];
}

export interface HighByteConnection {
  name: string;
  uri: string;
  description?: string;
  tags?: string[];
  settings?: Record<string, unknown>;
  writes?: Record<string, unknown>;
  subscriptions?: Record<string, unknown>;
  storeForward?: Record<string, unknown>;
}

export interface HighByteInput {
  name: string;
  connection: string;
  type: string;
  qualifier: HighByteInputQualifier;
  cacheLifetime?: Record<string, unknown>;
  template?: Record<string, unknown>;
  parameters?: HighByteParameters;
}

export interface HighByteInputQualifier {
  // MQTT specific
  inputType?: string;
  payloadType?: string;
  qos?: number;
  topic?: string;
  includeTopic?: boolean;
  
  // REST specific
  acceptType?: string;
  method?: string;
  contentType?: string;
  endpointURL?: string;
  body?: string;
  
  // OPC UA / PI System specific
  type?: string;
  options?: Record<string, unknown>;
  
  // Generic
  [key: string]: unknown;
}

export interface HighByteOutput {
  name: string;
  connection: string;
  type: string;
  qualifier: HighByteOutputQualifier;
}

export interface HighByteOutputQualifier {
  // MQTT specific
  qos?: number;
  topic?: string;
  retained?: boolean;
  namedRoot?: boolean;
  type?: string;
  
  // Common
  breakupArrays?: boolean;
  
  // OPC UA / PI System specific
  options?: Record<string, unknown>;
  
  // Generic
  [key: string]: unknown;
}

export interface HighByteModel {
  name: string;
  description?: string;
  groupAs?: string;
  tags?: string[];
  attributes: HighByteAttribute[];
}

export interface HighByteAttribute {
  attributeType: 'Internal' | 'External';
  name: string;
  nullable: boolean;
  required: boolean;
  array: boolean;
  internalType?: HighByteInternalType;
  defaultValue?: unknown;
  description?: string;
}

export type HighByteInternalType =
  | 'String'
  | 'Int64'
  | 'Int32'
  | 'Float'
  | 'Double'
  | 'Boolean'
  | 'DateTime'
  | 'Any';

export interface HighByteParameters {
  type: string;
  model?: HighByteModel;
}

export interface HighBytePipeline {
  name: string;
  description?: string;
  groupAs?: string;
  tags?: string[];
  inputStages?: string[];
  stages?: HighBytePipelineStage[];
  triggers?: HighBytePipelineTrigger[];
  trackActivity?: boolean;
  errorHandler?: Record<string, unknown>;
}

export interface HighBytePipelineStage {
  name: string;
  display?: Record<string, unknown>;
  config?: Record<string, unknown>;
  outputs?: string[];
}

export interface HighBytePipelineTrigger {
  name: string;
  display?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

// Namespace types
export interface HighByteNamespace {
  id: string;
  name: string;
  parentNamespaceId?: string;
  reference: HighByteNamespaceReference;
}

export interface HighByteNamespaceReference {
  type: 'Empty' | 'Instance' | 'Input' | 'Output';
  name?: string;
  path?: string;
  params?: Record<string, unknown>;
  connectionName?: string;
}

// Instance types
export interface HighByteInstance {
  name: string;
  model: string;
  groupAs?: string;
  tags?: string[];
  attributes?: HighByteInstanceAttribute[];
  rootValueAs?: string;
  template?: Record<string, unknown>;
  executeMode?: string;
  initExpression?: string;
  parameters?: HighByteParameters;
}

export interface HighByteInstanceAttribute {
  name: string;
  expression?: {
    type: string;
    reference?: HighByteNamespaceReference;
    [key: string]: unknown;
  };
}
