/**
 * Test WebSocket flow after HighByte upload
 */

import WebSocket from 'ws';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001/ws';

async function testWebSocketFlow() {
  console.log('🧪 Testing WebSocket flow after HighByte upload\n');

  // Step 1: Connect WebSocket
  console.log('1️⃣ Connecting to WebSocket...');
  const ws = new WebSocket(WS_URL);

  await new Promise<void>((resolve, reject) => {
    ws.on('open', () => {
      console.log('✅ WebSocket connected\n');
      resolve();
    });
    ws.on('error', reject);
  });

  // Step 2: Listen for WebSocket messages
  const messages: any[] = [];
  ws.on('message', (data: Buffer) => {
    const message = JSON.parse(data.toString());
    console.log('📨 WebSocket message received:', {
      type: message.type,
      hasPayload: !!message.payload,
    });
    messages.push(message);
  });

  // Wait for initial state message
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log(`Received ${messages.length} initial message(s)\n`);

  // Step 3: Upload HighByte file
  console.log('2️⃣ Uploading HighByte project file...');
  const filePath = join(__dirname, '../example_json/intelligencehub-configuration_1_26_26.json');
  const content = readFileSync(filePath, 'utf-8');

  const uploadResponse = await fetch(`${BASE_URL}/api/upload/highbyte`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`Upload failed: ${error}`);
  }

  const uploadResult = await uploadResponse.json();
  console.log('✅ Upload successful:', uploadResult);
  console.log();

  // Step 4: Wait for WebSocket state update
  console.log('3️⃣ Waiting for WebSocket state update...');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 5: Analyze WebSocket messages
  console.log(`\n📊 Total WebSocket messages received: ${messages.length}`);
  
  const stateMessages = messages.filter(m => m.type === 'state');
  console.log(`   - State updates: ${stateMessages.length}`);

  if (stateMessages.length > 1) {
    const lastState = stateMessages[stateMessages.length - 1].payload;
    console.log('\n📈 Latest state:');
    console.log(`   - Message count: ${lastState.stats?.messageCount || 0}`);
    console.log(`   - Has spec: ${!!lastState.spec}`);
    console.log(`   - Spec length: ${lastState.spec?.length || 0} bytes`);
    console.log(`   - Models: ${lastState.stats?.models?.length || 0}`);
    console.log(`   - Unique topics: ${lastState.stats?.uniqueTopics || 0}`);
  }

  // Step 6: Verify state via REST API
  console.log('\n4️⃣ Verifying state via REST API...');
  const stateResponse = await fetch(`${BASE_URL}/api/state`);
  const state = await stateResponse.json();

  console.log('✅ State from API:');
  console.log(`   - Message count: ${state.stats?.messageCount || 0}`);
  console.log(`   - Has spec: ${!!state.spec}`);
  console.log(`   - Spec length: ${state.spec?.length || 0} bytes`);
  console.log(`   - Models: ${state.stats?.models?.length || 0}`);

  // Step 7: Close WebSocket
  ws.close();
  console.log('\n✅ Test completed successfully!');

  // Verify results
  if (stateMessages.length < 2) {
    console.error('\n❌ ISSUE: Expected at least 2 state updates (initial + after upload)');
    process.exit(1);
  }

  if (!state.spec) {
    console.error('\n❌ ISSUE: No spec generated');
    process.exit(1);
  }

  console.log('\n✅ All checks passed!');
}

testWebSocketFlow().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
