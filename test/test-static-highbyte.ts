/**
 * Test Static (Browser) Build with HighByte Import
 */

import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testStaticHighByte() {
  console.log('🧪 Testing static build with HighByte file...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Listen for console messages
  page.on('console', msg => {
    const type = msg.type();
    if (['log', 'error', 'warn'].includes(type)) {
      console.log(`[Browser ${type.toUpperCase()}]`, msg.text());
    }
  });

  // Navigate to the app
  console.log('1️⃣ Loading app...');
  await page.goto('http://localhost:8000');
  await page.waitForSelector('input[type="file"]', { timeout: 5000 });
  console.log('✅ App loaded\n');

  // Load the HighByte file
  console.log('2️⃣ Uploading HighByte file...');
  const filePath = join(__dirname, '../example_json/intelligencehub-configuration_1_26_26.json');
  const fileContent = readFileSync(filePath, 'utf-8');

  // Set the file input
  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);

  // Wait a bit for processing
  await page.waitForTimeout(2000);

  // Check stats panel for message count
  console.log('\n3️⃣ Checking results...');
  const statsText = await page.locator('.text-3xl').first().textContent();
  console.log(`Message count: ${statsText}`);

  // Check if Generate button is enabled
  const generateButton = page.locator('button:has-text("Generate")');
  const isDisabled = await generateButton.getAttribute('disabled');
  console.log(`Generate button enabled: ${!isDisabled}`);

  // Click generate
  if (!isDisabled) {
    console.log('\n4️⃣ Generating spec...');
    await generateButton.click();
    await page.waitForTimeout(1000);

    // Check if spec was generated
    const spec = await page.locator('pre.spec-preview').textContent();
    if (spec && spec.length > 0) {
      console.log(`✅ Spec generated: ${spec.length} characters`);
      
      // Check for server references
      const hasHiveMQ = spec.includes('HiveMQ');
      const hasIIOT = spec.includes('iiot_evt_dev01_mqtt');
      const hasServerRefs = spec.includes('$ref: "#/servers/');
      
      console.log(`  - Has HiveMQ server: ${hasHiveMQ}`);
      console.log(`  - Has iiot_evt_dev01_mqtt server: ${hasIIOT}`);
      console.log(`  - Has server references in channels: ${hasServerRefs}`);
      
      if (hasHiveMQ && hasIIOT && hasServerRefs) {
        console.log('\n✅ All checks passed!');
      } else {
        console.log('\n❌ Server references missing!');
        process.exit(1);
      }
    } else {
      console.log('❌ No spec generated');
      process.exit(1);
    }
  } else {
    console.log('❌ Generate button is disabled');
    process.exit(1);
  }

  await browser.close();
  console.log('\n✅ Test completed successfully!');
}

testStaticHighByte().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
