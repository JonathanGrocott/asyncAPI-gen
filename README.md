# AsyncAPI Generator

A web-based tool for generating AsyncAPI specifications from JSON examples or live MQTT broker data. Supports both AsyncAPI 2.6.0 and 3.0.0 versions.

## Features

- **JSON Import**: Upload JSON files with nested hierarchical data containing `_path` and `_model` fields
- **MQTT Live Capture**: Connect to an MQTT broker and capture messages in real-time with wildcard subscriptions
- **Dual Version Support**: Generate specs for AsyncAPI 2.6.0 or 3.0.0
- **Channel Modes**:
  - **Verbose**: One channel per unique topic
  - **Parameterized**: Create template topics with parameters (e.g., `Building/{area}/Machine/{machineId}`)
- **Schema Deduplication**: Automatically reuses schemas for identical payloads
- **Model-based Grouping**: Uses `_model` field in JSON data to group and name schemas
- **Real-time Preview**: Live YAML/JSON preview of the generated specification
- **Export**: Download the generated spec as YAML or JSON

## Installation

```bash
npm install
```

## Usage

### Development Mode

```bash
npm run dev
```

This starts both the frontend (http://localhost:5173) and backend (http://localhost:3001) servers.

### Production Build

```bash
npm run build
npm start
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

**Option B: MQTT Connection**
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

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/state` | GET | Get current project state |
| `/api/config` | POST | Update configuration |
| `/api/upload/json` | POST | Upload JSON content |
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
- **Backend**: Fastify, WebSocket
- **MQTT**: mqtt.js
- **Language**: TypeScript

## License

MIT
