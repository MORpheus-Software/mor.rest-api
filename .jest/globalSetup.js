// Global setup for tests
const dotenv = require('dotenv');
dotenv.config();

module.exports = async () => {
  console.log('='.repeat(60));
  console.log('Global setup for stake authorization E2E tests');
  console.log('='.repeat(60));
  
  // Check if server is available
  try {
    const axios = require('axios');
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
    
    console.log(`Checking if API server is available at ${apiUrl}/health`);
    const response = await axios.get(`${apiUrl}/health`, { 
      timeout: 5000,
      validateStatus: () => true
    });
    
    if (response.status === 200) {
      console.log('✓ API server is available');
    } else {
      console.warn(`⚠️ API server responded with status ${response.status}`);
    }
  } catch (error) {
    console.warn(`⚠️ API server not available: ${error.message}`);
    console.warn('Tests requiring an active API server may fail');
  }
  
  // Check if required environment variables are set
  const requiredVars = [
    'TEST_PRIVATE_KEY',
    'TESTNET_RPC_URL',
    'REDIS_URL'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️ Missing environment variables:');
    missingVars.forEach(varName => {
      console.warn(`  - ${varName}`);
    });
    console.warn('Tests requiring these variables will be skipped');
  } else {
    console.log('✓ All required environment variables are set');
  }
  
  console.log('='.repeat(60));
}; 