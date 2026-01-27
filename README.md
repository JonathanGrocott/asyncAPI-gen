# AsyncAPI Generator

A web-based tool for generating AsyncAPI specifications from JSON examples. Supports both AsyncAPI 2.6.0 and 3.0.0 versions.

## Features

- **JSON Import**: Upload JSON files or paste JSON data directly
- **HighByte Intelligence Hub Support**: Import HighByte project exports to automatically generate AsyncAPI specs
- **Server Configuration**: Configure MQTT brokers for the generated spec
- **Dual Version Support**: Generate specs for AsyncAPI 2.6.0 or 3.0.0
- **Developer-Centric Documentation**: Uses `subscribe`/`receive` operations to document channels from a developer's perspective
- **Channel Modes**:
  - **Verbose**: One channel per unique topic
  - **Parameterized**: Create template topics with parameters (e.g., `Building/{area}/Machine/{machineId}`)
- **Schema Inference**: Automatically infers JSON Schema from payload examples
- **Schema Deduplication**: Automatically reuses schemas for identical payloads
- **Model-based Grouping**: Uses `_model` field in JSON data to group and name schemas
- **Real-time Preview**: Live YAML/JSON preview of the generated specification
- **Export**: Download the generated spec as YAML or JSON

## Two Deployment Modes

### 1. Static/Browser-Only (Vercel)

Runs entirely in the browser - no backend required. Upload JSON files to generate specs.

```bash
npm run dev      # Development
npm run build    # Build for deployment (outputs to dist/)
```

### 2. Full-Stack with MQTT (Local)

Includes an Express server with live MQTT capture capabilities.

```bash
npm run dev:full      # Development (server + client)
npm run build:full    # Production build
npm run start         # Run production server
```

**Note:** You need an MQTT broker running. Quick start with Docker:
```bash
docker run -d --name mosquitto -p 1883:1883 eclipse-mosquitto:2 mosquitto -c /mosquitto-no-auth.conf
```

## 🚀 Deployment on Vercel

This app is designed for static deployment on Vercel (or any static hosting):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/JonathanGrocott/asyncAPI-gen&project-name=asyncapi-generator&repository-name=asyncapi-generator)

Or manually:

```bash
npm run build
# Deploy the 'dist' folder to any static hosting
```

The `vercel.json` is already configured for automatic deployment.

## Installation

```bash
npm install
```

## How to Use

### 1. Configure Settings

In the **Configuration** panel:
- Select AsyncAPI version (2.6.0 or 3.0.0)
- Choose channel mode (Verbose or Parameterized)
- Set output format (YAML or JSON)
- Optionally set API title and version

### 2. Import Data

**Option A: JSON File Upload**
- Drag and drop a JSON file, or click to browse
- JSON should contain nested objects with `_path` fields (backslash-separated topic paths)
- Optional `_model` field identifies the schema type

**Option B: HighByte Intelligence Hub Project**
- Export your project from HighByte Intelligence Hub (Project → Export → Full Project)
- Upload the exported JSON file
- The tool will automatically:
  - Extract MQTT connections as servers
  - Convert models to JSON schemas
  - Map inputs/outputs to AsyncAPI channels
  - Match models to messages intelligently
  - **Assign each channel to the correct server** based on the connection used in HighByte

**Option C: MQTT Connection**
- Enter broker host and port (e.g., `localhost:1883`)
- Optionally provide credentials
- Subscribe to topics using MQTT wildcards (`#` for all, `+` for single level)
- Messages will stream in real-time

### 3. Configure Parameters (Parameterized Mode)

When using parameterized mode:
- Click **Auto-detect** to find variable segments in your topics
- Or manually add substitutions specifying:
  - Level index (0-based position in topic path)
  - Parameter name (e.g., `machineId`)
  - Optional allowed values

### 4. Generate & Export

- Click **Generate** to create the AsyncAPI specification
- Preview the output in the right panel
- Click **YAML** or **JSON** to download

## JSON Input Format

The tool expects JSON with a nested hierarchy where leaf nodes contain:

```json
{
  "Building": {
    "Area1": {
      "Machine1": {
        "_path": "Building\\Area1\\Machine1\\Data",
        "_model": "MachineData_v1",
        "temperature": 72.5,
        "status": "running"
      }
    }
  }
}
```

- `_path`: Backslash-separated topic path (converted to MQTT-style forward slashes)
- `_model`: Schema identifier for grouping similar payloads
- Other fields become the message payload schema

## HighByte Intelligence Hub Integration

### Overview

This tool natively supports HighByte Intelligence Hub project exports, enabling you to automatically generate AsyncAPI specifications from your industrial IoT configurations.

### How to Export from HighByte

1. Open your HighByte Intelligence Hub instance
2. Navigate to **Project** in the main menu
3. Go to the **Export** tab
4. Select **Full Project**
5. Click **Export** and then **Download**

### What Gets Extracted

The tool analyzes your HighByte project and extracts:

**Connections → Servers**
- MQTT broker connections become AsyncAPI servers
- Connection URIs are parsed to extract host, port, and protocol
- Connection descriptions are preserved

**Models → Schemas**
- HighByte models are converted to JSON Schema
- Type mapping:
  - `String` → `string`
  - `Int32` → `integer` (format: int32)
  - `Int64` → `integer` (format: int64)
  - `Float` → `number` (format: float)
  - `Double` → `number` (format: double)
  - `Boolean` → `boolean`
  - `DateTime` → `string` (format: date-time)
  - `Any` → no type constraint
- Nullable and required attributes are preserved

**Inputs → Subscribe Operations**
- MQTT inputs become `receive` operations in AsyncAPI
- Topics are extracted from input qualifiers
- Models are intelligently matched to inputs

**Outputs → Publish Operations**
- MQTT outputs become `send` operations in AsyncAPI
- Topics are extracted from output qualifiers
- Models are intelligently matched to outputs

### Model Matching

The tool uses intelligent matching to associate HighByte models with inputs/outputs:

1. **Direct name match**: Exact name matches
2. **Case-insensitive match**: Ignores case differences
3. **Partial match**: Finds models contained in names or vice versa
4. **Term-based match**: Matches by key terms (e.g., "AFP2_Alarms" → "ATLM_Alarms_v1")

When no model is found, a default payload is used with a warning in the description.

### Example

Input (HighByte):
```json
{
  "productInfo": { "product": "IntelligenceHub", ... },
  "project": {
    "connections": [{
      "name": "HiveMQ",
      "uri": "mqtt://broker.example.com:1883"
    }],
    "outputs": [{
      "name": "AFP2_Alarms",
      "connection": "HiveMQ",
      "type": "mqtt",
      "qualifier": { "topic": "factory/area/machine/alarms" }
    }],
    "modeling": {
      "models": [{
        "name": "AFP_EMOM_v1",
        "attributes": [
          { "name": "MachineID", "internalType": "String" },
          { "name": "MachineState", "internalType": "Int64" }
        ]
      }]
    }
  }
}
```

Output (AsyncAPI 3.0):
```yaml
servers:
  HiveMQ:
    host: broker.example.com:1883
    protocol: mqtt

channels:
  factoryAreaMachineAlarms:
    address: factory/area/machine/alarms
    messages:
      afpEmomV1:
        payload:
          type: object
          properties:
            MachineID:
              type: string
            MachineState:
              type: integer
              format: int64

operations:
  publishFactoryAreaMachineAlarms:
    action: send
    channel:
      $ref: '#/channels/factoryAreaMachineAlarms'
```

### Limitations

- Currently supports MQTT connections only (REST, OPC UA, etc. are ignored)
- Pipeline configurations are not analyzed for data flow inference
- Only focuses on inputs and outputs, not pipeline stages
- Template variables (e.g., `{{Instance.Model}}`) in qualifiers are not resolved

### Testing Your HighByte Export

Use the included test script to validate your export:

```bash
npx tsx test/test-highbyte-loader.ts
```

This will show:
- Number of messages, servers, and models extracted
- Sample message topics and their matched models
- Any warnings about unmatched models

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/state` | GET | Get current project state |
| `/api/config` | POST | Update configuration |
| `/api/upload/json` | POST | Upload JSON content |
| `/api/upload/highbyte` | POST | Upload HighByte project export |
| `/api/mqtt/connect` | POST | Connect to MQTT broker |
| `/api/mqtt/subscribe` | POST | Subscribe to topic |
| `/api/mqtt/disconnect` | POST | Disconnect from broker |
| `/api/substitutions` | POST | Add topic substitution |
| `/api/detect-parameters` | POST | Auto-detect parameters |
| `/api/generate` | POST | Generate AsyncAPI spec |
| `/api/export` | GET | Download spec file |
| `/api/clear` | POST | Clear all messages |
| `/ws` | WebSocket | Real-time updates |

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS
- **Backend**: Express, WebSocket (ws)
- **MQTT**: mqtt.js
- **Language**: TypeScript

## License

MIT
