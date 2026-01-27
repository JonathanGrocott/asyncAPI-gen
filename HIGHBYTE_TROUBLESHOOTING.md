# HighByte Upload Troubleshooting Guide

## Quick Test Steps

1. **Start the full-stack server:**
   ```bash
   npm run dev:full
   ```
   Or separately:
   ```bash
   npm run dev:server  # Terminal 1
   npm run dev:client  # Terminal 2
   ```

2. **Open browser to http://localhost:5173 (dev) or http://localhost:3001 (production)**

3. **Open browser console (F12 → Console tab)**

4. **Upload the HighByte file:**
   - Drag and drop `example_json/intelligencehub-configuration_1_26_26.json`
   - OR click browse and select the file
   - OR paste the JSON content directly (click "Or paste JSON directly →")

## What to Look For

### In Browser Console:
You should see:
```
✅ Detected HighByte Intelligence Hub project export
📤 Uploading highbyte file...
Response status: 200
✅ Upload successful: { success: true, messagesAdded: 11, ... }
```

### In the UI:
After upload, you should see:
- **Stats Panel**: Shows message count, unique topics, and models
- **Messages List**: Shows the extracted MQTT messages with topics
- **Spec Preview**: Shows the generated AsyncAPI YAML/JSON

### In Server Console:
No errors should appear. You might see:
```
🚀 Server running at http://localhost:3001
```

## Common Issues & Solutions

### Issue 1: Nothing happens when uploading

**Symptoms:**
- No console logs appear
- UI doesn't change
- No error messages

**Diagnosis:**
1. Check if WebSocket is connected:
   - Open browser console
   - Look for WebSocket connection in Network tab
   - Should see `ws://localhost:3001/ws` or `ws://localhost:5173/ws`

2. Check if the file is being detected correctly:
   - Look for "Detected HighByte" or "Detected regular JSON" log
   - If no log appears, the file might not be loading

**Solutions:**
- Ensure server is running on port 3001
- Check browser console for errors
- Try clearing browser cache and reloading
- Verify file is valid JSON with `jq . < file.json`

### Issue 2: "Failed to parse HighByte project" error

**Symptoms:**
- Error message in UI
- Console shows error response

**Diagnosis:**
Check the error message details in console

**Solutions:**
- Verify the file is a valid HighByte export
- Check that it has `productInfo.product === "IntelligenceHub"`
- Ensure the JSON is not corrupted

### Issue 3: File uploads but no spec appears

**Symptoms:**
- Upload succeeds (console shows success)
- Stats update but spec panel is empty

**Diagnosis:**
1. Check if messages were extracted:
   ```javascript
   // In browser console
   fetch('/api/state').then(r => r.json()).then(console.log)
   ```
   Should show `messageCount > 0`

2. Check if spec was generated:
   Look for `spec` field in the state response

**Solutions:**
- Click "Generate" button manually if auto-generation failed
- Check server console for generation errors
- Verify AsyncAPI version is set (3.0.0 or 2.6.0)

### Issue 4: WebSocket connection fails

**Symptoms:**
- Console shows "WebSocket connection error"
- State updates don't appear in real-time

**Diagnosis:**
Check Network tab → WS filter → Look for failed connections

**Solutions:**
- Ensure server is running
- Check if port 3001 is available
- Try refreshing the page
- In development, ensure Vite proxy is working

## Manual Testing via API

Test the upload endpoint directly:

```bash
# Start server
npm run dev:server

# In another terminal, test upload
curl -X POST http://localhost:3001/api/upload/highbyte \
  -H "Content-Type: application/json" \
  -d "{\"content\": $(cat example_json/intelligencehub-configuration_1_26_26.json | jq -R -s '.')}"

# Check state
curl http://localhost:3001/api/state | jq '.stats'

# Get generated spec
curl http://localhost:3001/api/state | jq -r '.spec' | head -30
```

## Automated Tests

Run the included tests:

```bash
# Test just the loader logic
npx tsx test/test-highbyte-loader.ts

# Test the API endpoint (requires server running)
npm run dev:server &
sleep 3
npx tsx test/test-highbyte-endpoint.ts

# Full end-to-end test
npm run dev:server &
sleep 3
npx tsx test/test-e2e-highbyte.ts
```

## Expected Results

After successful upload of the example file:

- **Messages**: 11 (8 outputs + 3 inputs)
- **Servers**: 2 (HiveMQ, iiot_evt_dev01_mqtt)
- **Models**: 16 (AFP_EMOM_v1, AFP_Progress_Model, etc.)
- **Warnings**: 0 (all models matched)
- **Unique Topics**: 11
- **Spec Size**: ~16KB YAML

## Debug Mode

Enable verbose logging:

```javascript
// In browser console before upload
localStorage.setItem('debug', 'asyncapi:*');
location.reload();
```

## Still Having Issues?

1. Check browser console for errors
2. Check server console for errors
3. Verify file is valid HighByte export:
   ```bash
   jq '.productInfo.product, .project | keys' < your-file.json
   # Should show: "IntelligenceHub" and list of project keys
   ```
4. Try with the included example file first
5. Compare your file structure with the example

## Contact

If issues persist, please provide:
- Browser console output (full)
- Server console output
- File structure (sanitized): `jq '{productInfo, project: .project | keys}' < your-file.json`
- Steps to reproduce
