/**
 * Full end-to-end test: Upload HighByte file and generate AsyncAPI spec
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function e2eTest() {
  console.log('🧪 End-to-End Test: HighByte → AsyncAPI\n');

  try {
    // 1. Upload HighByte file
    console.log('Step 1: Uploading HighByte project...');
    const filePath = join(__dirname, '../example_json/intelligencehub-configuration_1_26_26.json');
    const content = readFileSync(filePath, 'utf-8');

    const uploadResponse = await fetch('http://localhost:3001/api/upload/highbyte', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(`Upload failed: ${errorData.error}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log(`✅ Uploaded ${uploadResult.messagesAdded} messages\n`);

    // 2. Wait a moment for state to propagate
    await new Promise(resolve => setTimeout(resolve, 100));

    // 3. Get current state
    console.log('Step 2: Checking state...');
    const stateResponse = await fetch('http://localhost:3001/api/state');
    const state = await stateResponse.json();
    
    console.log(`✅ State has ${state.stats.messageCount} messages`);
    console.log(`✅ State has ${state.stats.uniqueTopics} unique topics`);
    console.log(`✅ State has ${state.stats.models.length} models\n`);

    // 4. Check if spec was generated
    if (state.spec) {
      console.log('Step 3: AsyncAPI spec generated automatically!');
      console.log(`✅ Spec length: ${state.spec.length} bytes\n`);
      
      // Show first few lines
      const lines = state.spec.split('\n').slice(0, 20);
      console.log('📄 Spec preview (first 20 lines):');
      console.log('─'.repeat(60));
      lines.forEach(line => console.log(line));
      console.log('─'.repeat(60));
      console.log();
    } else {
      console.log('⚠️  No spec generated yet, trying manual generation...');
      
      // 5. Try generating manually
      const generateResponse = await fetch('http://localhost:3001/api/generate', {
        method: 'POST',
      });
      
      const generateResult = await generateResponse.json();
      
      if (generateResult.output) {
        console.log('✅ Manual generation successful!');
        console.log(`Spec length: ${generateResult.output.length} bytes\n`);
      } else {
        throw new Error('Failed to generate spec');
      }
    }

    console.log('✨ End-to-end test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Check if server is running
console.log('⏳ Waiting for server to be ready...\n');
const maxRetries = 10;
let retries = 0;

const checkServer = async () => {
  while (retries < maxRetries) {
    try {
      const response = await fetch('http://localhost:3001/api/state');
      if (response.ok) {
        console.log('✅ Server is ready!\n');
        await e2eTest();
        return;
      }
    } catch {
      retries++;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  console.error('❌ Server not available');
  process.exit(1);
};

checkServer();
