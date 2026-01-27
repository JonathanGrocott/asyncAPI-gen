/**
 * HighByte Intelligence Hub Project Types (Browser Version)
 */

export interface HighByteProjectExport {
  productInfo: {
    product: string;
    version: string;
  };
  project: {
    name: string;
    description?: string;
    connections: HighByteConnection[];
    inputs: HighByteInput[];
    outputs: HighByteOutput[];
    modeling?: {
      models: HighByteModel[];
    };
  };
}

export interface HighByteConnection {
  name: string;
  type: string;
  uri?: string;
  description?: string;
}

export interface HighByteInput {
  name: string;
  type: string;
  connection: string;
  qualifier: {
    topic: string;
  };
}

export interface HighByteOutput {
  name: string;
  type: string;
  connection: string;
  qualifier: {
    topic: string;
  };
}

export interface HighByteModel {
  name: string;
  description?: string;
  attributes: HighByteAttribute[];
}

export interface HighByteAttribute {
  name: string;
  internalType?: HighByteInternalType;
  description?: string;
  required?: boolean;
  nullable?: boolean;
  array?: boolean;
  defaultValue?: unknown;
}

export type HighByteInternalType =
  | 'String'
  | 'Int32'
  | 'Int64'
  | 'Float'
  | 'Double'
  | 'Boolean'
  | 'DateTime'
  | 'Any';
