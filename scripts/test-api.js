#!/usr/bin/env node

/**
 * Test script to verify the API endpoints functionality
 * Run with: node scripts/test-api.js
 */

async function testAPI() {
  const BASE_URL = 'http://localhost:4000';
  let apiKey = null;
  let keyId = null;
  
  console.log('🧪 Testing MorSaaS API');
  console.log('====================\n');
  
  // Test health endpoint
  try {
    console.log('🔍 Testing health endpoint...');
    const response = await fetch(`${BASE_URL}/api/health`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health check successful:', data);
    } else {
      console.error('❌ Health check failed:', response.status);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Health check error:', error.message);
    console.error('   Is your server running? (npm run server:dev)');
    process.exit(1);
  }
  
  console.log('\n');
  
  // Test creating an API key
  try {
    console.log('🔍 Creating a test API key...');
    const response = await fetch(`${BASE_URL}/api/v1/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Test API Key' })
    });
    
    if (response.ok) {
      const data = await response.json();
      apiKey = data.data.key;
      keyId = data.data.id;
      console.log(`✅ API key created: ${apiKey.substring(0, 8)}...`);
    } else {
      const errorData = await response.json().catch(() => null);
      console.error('❌ Failed to create API key:', response.status, errorData);
    }
  } catch (error) {
    console.error('❌ API key creation error:', error.message);
  }
  
  console.log('\n');
  
  // Test listing API keys
  if (apiKey) {
    try {
      console.log('🔍 Listing API keys...');
      const response = await fetch(`${BASE_URL}/api/v1/keys`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API keys retrieved:', data.data.length, 'keys found');
      } else {
        const errorData = await response.json().catch(() => null);
        console.error('❌ Failed to list API keys:', response.status, errorData);
      }
    } catch (error) {
      console.error('❌ API key listing error:', error.message);
    }
    
    console.log('\n');
    
    // Test chat completions
    try {
      console.log('🔍 Testing chat completions...');
      const response = await fetch(`${BASE_URL}/api/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'GPT-4o',
          messages: [{ role: 'user', content: 'Hello, world!' }],
          stream: false
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Chat completion successful, response content:');
        console.log(`   "${data.choices?.[0]?.message?.content?.substring(0, 60)}..."`);
      } else {
        const errorData = await response.json().catch(() => null);
        console.error('❌ Chat completion failed:', response.status, errorData);
      }
    } catch (error) {
      console.error('❌ Chat completion error:', error.message);
    }
    
    console.log('\n');
    
    // Test deleting API key
    if (keyId) {
      try {
        console.log(`🔍 Deleting test API key (${keyId})...`);
        const response = await fetch(`${BASE_URL}/api/v1/keys/${keyId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ API key deleted:', data.data.deleted ? 'Success' : 'Failed');
        } else {
          const errorData = await response.json().catch(() => null);
          console.error('❌ Failed to delete API key:', response.status, errorData);
        }
      } catch (error) {
        console.error('❌ API key deletion error:', error.message);
      }
    }
  }
  
  console.log('\n====================');
  console.log('🏁 API Tests Completed');
}

testAPI().catch(error => {
  console.error('Unhandled error during tests:', error);
  process.exit(1);
}); 