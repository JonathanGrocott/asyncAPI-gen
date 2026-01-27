/**
 * Test the HighByte upload endpoint
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testHighByteEndpoint() {
  console.log('🧪 Testing HighByte Upload Endpoint...\n');

  try {
    // Load the example HighByte file
    const filePath = join(__dirname, '../example_json/intelligencehub-configuration_1_26_26.json');
    console.log(`📂 Loading: ${filePath}\n`);
    
    const content = readFileSync(filePath, 'utf-8');

    // Test the endpoint
    const response = await fetch('http://localhost:3001/api/upload/highbyte', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${errorData.error || 'Unknown error'}`);
    }

    const result = await response.json();

    console.log('✅ Upload successful!\n');
    console.log('📊 Results:');
    console.log('─'.repeat(60));
    console.log(`Messages added: ${result.messagesAdded}`);
    console.log(`Total messages: ${result.totalMessages}`);
    console.log(`Servers found: ${result.serversFound}`);
    console.log(`Models found: ${result.modelsFound}`);
    console.log(`Warnings: ${result.warnings?.length || 0}`);
    console.log('─'.repeat(60));
    console.log();

    if (result.warnings?.length > 0) {
      console.log('⚠️  Warnings:');
      result.warnings.forEach((w: string) => console.log(`  - ${w}`));
      console.log();
    }

    console.log('✨ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
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
        await testHighByteEndpoint();
        return;
      }
    } catch {
      retries++;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  console.error('❌ Server not available after 5 seconds');
  console.error('Please start the server first: npm run dev:server');
  process.exit(1);
};

checkServer();
