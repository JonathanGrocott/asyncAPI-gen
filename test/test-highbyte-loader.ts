/**
 * Test script for HighByte loader
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadHighByteProject } from '../src/server/loader/highbyte-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testHighByteLoader() {
  console.log('🧪 Testing HighByte Loader...\n');

  try {
    // Load the example HighByte file
    const filePath = join(__dirname, '../example_json/intelligencehub-configuration_1_26_26.json');
    console.log(`📂 Loading: ${filePath}\n`);
    
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Run the loader
    const result = loadHighByteProject(data);

    // Display results
    console.log('✅ HighByte project loaded successfully!\n');
    console.log('📊 Results:');
    console.log('─'.repeat(60));
    console.log(`Messages extracted: ${result.messages.length}`);
    console.log(`Servers found: ${result.servers.length}`);
    console.log(`Models found: ${result.models.size}`);
    console.log(`Warnings: ${result.warnings.length}`);
    console.log('─'.repeat(60));
    console.log();

    // Show servers
    if (result.servers.length > 0) {
      console.log('🖥️  Servers:');
      result.servers.forEach(server => {
        console.log(`  - ${server.name} (${server.protocol}://${server.url})`);
      });
      console.log();
    }

    // Show models
    if (result.models.size > 0) {
      console.log('📋 Models:');
      for (const [name, schema] of result.models.entries()) {
        const propCount = schema.properties ? Object.keys(schema.properties).length : 0;
        console.log(`  - ${name} (${propCount} properties)`);
      }
      console.log();
    }

    // Show sample messages
    if (result.messages.length > 0) {
      console.log('📨 Sample Messages (first 5):');
      result.messages.slice(0, 5).forEach((msg, idx) => {
        console.log(`  ${idx + 1}. Topic: ${msg.topic}`);
        console.log(`     Model: ${msg.modelName || 'none'}`);
        console.log(`     Payload keys: ${Object.keys(msg.payload).join(', ')}`);
        console.log();
      });
    }

    // Show warnings
    if (result.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      result.warnings.forEach(warning => {
        console.log(`  - ${warning}`);
      });
      console.log();
    }

    console.log('✨ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

testHighByteLoader();
