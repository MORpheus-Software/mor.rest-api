#!/usr/bin/env node

/**
 * Test script to verify user authentication API
 * Run with: node scripts/test-user-auth.js
 */

// Helper function to wait for a specified time
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testUserAuth() {
  const BASE_URL = 'http://localhost:4000';
  
  console.log('🧪 Testing MorSaaS User Authentication');
  console.log('===================================\n');
  
  console.log('Waiting for server to be fully initialized...');
  await sleep(2000); // Wait 2 seconds for server to initialize
  
  // Test health endpoint
  try {
    console.log('🔍 Testing health endpoint...');
    console.log(`   GET ${BASE_URL}/api/health`);
    
    const response = await fetch(`${BASE_URL}/api/health`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health check successful:', data);
    } else {
      console.error(`❌ Health check failed: ${response.status} ${response.statusText}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Health check error:', error.message);
    console.error('   Is your server running? (npm run server:dev)');
    process.exit(1);
  }
  
  console.log('\n======== USER REGISTRATION ========\n');
  
  // Create test user data
  const testUser = {
    name: "Test User",
    email: `test${Date.now()}@example.com`,
    password: "testpassword123"
  };
  
  console.log(`Using test user email: ${testUser.email}`);
  
  // Test user registration
  let userId = null;
  
  try {
    console.log('🔍 Registering a new user...');
    console.log(`   POST ${BASE_URL}/api/v1/auth/register`);
    
    const response = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });
    
    const responseText = await response.text();
    console.log(`   Response: ${response.status} ${response.statusText}`);
    console.log(`   Body: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      userId = data.data.id;
      console.log('✅ User registered successfully!');
      console.log(`   User ID: ${userId}`);
    } else {
      console.error('❌ Failed to register user:', response.status);
    }
  } catch (error) {
    console.error('❌ User registration error:', error.message);
  }
  
  console.log('\n======== USER LOGIN ========\n');
  
  // Test user login
  let userToken = null;
  
  try {
    console.log('🔍 Logging in with newly created user...');
    console.log(`   POST ${BASE_URL}/api/v1/auth/login`);
    
    const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    const responseText = await response.text();
    console.log(`   Response: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ User logged in successfully!');
      console.log(`   User data: ${JSON.stringify(data.data, null, 2)}`);
      
      // Create a simple auth token (user-id-timestamp)
      userToken = `user-${data.data.id}-${Date.now()}`;
      console.log(`   Generated user token: ${userToken}`);
    } else {
      console.error('❌ Failed to log in:', response.status);
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
  }
  
  console.log('\n======== API KEY CREATION WITH USER AUTH ========\n');
  
  // Test creating an API key with user auth
  let apiKey = null;
  
  if (userToken) {
    try {
      console.log('🔍 Creating an API key using user authentication...');
      console.log(`   POST ${BASE_URL}/api/v1/app/keys`);
      
      const response = await fetch(`${BASE_URL}/api/v1/app/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({ name: 'Test API Key' })
      });
      
      const responseText = await response.text();
      console.log(`   Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = JSON.parse(responseText);
        apiKey = data.data.key;
        console.log('✅ API key created successfully with user auth!');
        console.log(`   API Key: ${apiKey.substring(0, 12)}...`);
      } else {
        console.error('❌ Failed to create API key:', response.status);
      }
    } catch (error) {
      console.error('❌ API key creation error:', error.message);
    }
  
    console.log('\n======== RETRIEVE API KEYS WITH USER AUTH ========\n');
    
    // Test retrieving API keys with user auth
    try {
      console.log('🔍 Retrieving API keys using user authentication...');
      console.log(`   GET ${BASE_URL}/api/v1/app/keys`);
      
      const response = await fetch(`${BASE_URL}/api/v1/app/keys`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        }
      });
      
      const responseText = await response.text();
      console.log(`   Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = JSON.parse(responseText);
        console.log('✅ API keys retrieved successfully!');
        console.log(`   Number of keys: ${data.data.length}`);
        data.data.forEach(key => {
          console.log(`   - ${key.name}: ${key.id.substring(0, 12)}...`);
        });
      } else {
        console.error('❌ Failed to retrieve API keys:', response.status);
      }
    } catch (error) {
      console.error('❌ API key retrieval error:', error.message);
    }
  }
  
  console.log('\nUser Authentication Testing Complete! 🎉');
}

// Run the tests
console.log('Starting user authentication tests...');
testUserAuth().catch(err => {
  console.error('Error in test script:', err);
  process.exit(1);
}); 