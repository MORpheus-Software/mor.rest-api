#!/usr/bin/env node

/**
 * Simple script to directly test API key creation
 * Run with: node scripts/create-test-key.js
 */

async function createTestKey() {
  try {
    console.log('Testing API key creation...');
    
    const response = await fetch('http://localhost:4000/api/v1/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Test Key from Script' }),
    });
    
    const result = await response.text();
    console.log('\nStatus:', response.status);
    console.log('Response:', result);
    
    try {
      const json = JSON.parse(result);
      if (json.data?.key) {
        console.log('\n✅ SUCCESS! API Key created: ' + json.data.key);
      }
    } catch(e) {
      console.log('Non-JSON response');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createTestKey(); 