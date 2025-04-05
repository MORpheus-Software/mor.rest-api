#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local' });

// Function to check if the required environment variables are set
function checkEnvVars() {
  const requiredVars = [
    'VITE_TEST_POOL_NAME',
    'VITE_TEST_POOL_ID',
    'VITE_TEST_POOL_ADMIN',
    'VITE_TEST_POOL_START',
    'VITE_TEST_POOL_WITHDRAW_LOCK',
    'VITE_TEST_POOL_CLAIM_LOCK_END',
    'VITE_TEST_POOL_MIN_DEPOSIT'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`  - ${varName}`));
    console.error('Please run scripts/create-test-pool.ts first to create a test pool');
    return false;
  }
  return true;
}

// Function to update the Staking component
function updateStakingComponent() {
  const stakingFilePath = path.resolve(process.cwd(), 'src/components/Staking.tsx');

  if (!fs.existsSync(stakingFilePath)) {
    console.error(`❌ File not found: ${stakingFilePath}`);
    return false;
  }

  console.log(`📝 Reading ${stakingFilePath}...`);
  let content = fs.readFileSync(stakingFilePath, 'utf8');
  
  // Create the test pool configuration based on environment variables
  const testPoolConfig = `
    {
      id: "${process.env.VITE_TEST_POOL_ID}",
      name: "${process.env.VITE_TEST_POOL_NAME} (Test)",
      description: "Test pool for development and testing",
      admin: "${process.env.VITE_TEST_POOL_ADMIN}",
      poolStart: {
        timestamp: ${process.env.VITE_TEST_POOL_START},
        date: new Date(${process.env.VITE_TEST_POOL_START} * 1000)
      },
      areDepositsLocked: false,
      areBuilderRewardsStaked: false,
      minimalDeposit: {
        formatted: "${process.env.VITE_TEST_POOL_MIN_DEPOSIT}"
      },
      active: true
    }`;

  // Find the testnet subnet configuration in the file
  const testnetSubnetsRegex = /testnet:\s*\[([\s\S]*?)\]/;
  const match = content.match(testnetSubnetsRegex);

  if (!match) {
    console.error('❌ Could not find testnet subnets configuration in the file');
    return false;
  }

  // Check if our test pool is already in the config
  if (content.includes(process.env.VITE_TEST_POOL_ID!)) {
    console.log('✅ Test pool already configured in Staking component');
    
    // Update the existing pool configuration
    const poolIdRegex = new RegExp(`id:\\s*"${process.env.VITE_TEST_POOL_ID}"[\\s\\S]*?active:\\s*true`, 'g');
    content = content.replace(poolIdRegex, testPoolConfig.trim());
    
    fs.writeFileSync(stakingFilePath, content);
    console.log('✅ Updated existing test pool configuration');
    return true;
  }

  // Add our test pool to the testnet subnets
  const existingSubnets = match[1].trim();
  let newSubnets;
  
  if (existingSubnets) {
    // Add to existing subnets
    newSubnets = `${existingSubnets},\n    ${testPoolConfig}`;
  } else {
    // No existing subnets
    newSubnets = testPoolConfig;
  }

  // Replace the testnet subnets configuration
  const updatedContent = content.replace(testnetSubnetsRegex, `testnet: [\n    ${newSubnets}\n  ]`);

  // Write the updated content back to the file
  fs.writeFileSync(stakingFilePath, updatedContent);
  console.log('✅ Added test pool to Staking component');
  return true;
}

// Main function
async function main() {
  console.log('🔄 Updating test pool configuration in the application...');

  if (!checkEnvVars()) {
    process.exit(1);
  }

  // Display the current environment variables
  console.log('\n📋 Current test pool environment variables:');
  console.log(`- VITE_TEST_POOL_NAME: ${process.env.VITE_TEST_POOL_NAME}`);
  console.log(`- VITE_TEST_POOL_ID: ${process.env.VITE_TEST_POOL_ID}`);
  console.log(`- VITE_TEST_POOL_ADMIN: ${process.env.VITE_TEST_POOL_ADMIN}`);
  console.log(`- VITE_TEST_POOL_START: ${process.env.VITE_TEST_POOL_START}`);
  console.log(`- VITE_TEST_POOL_WITHDRAW_LOCK: ${process.env.VITE_TEST_POOL_WITHDRAW_LOCK}`);
  console.log(`- VITE_TEST_POOL_CLAIM_LOCK_END: ${process.env.VITE_TEST_POOL_CLAIM_LOCK_END}`);
  console.log(`- VITE_TEST_POOL_MIN_DEPOSIT: ${process.env.VITE_TEST_POOL_MIN_DEPOSIT}`);

  if (updateStakingComponent()) {
    console.log('✅ Successfully updated test pool configuration');
  } else {
    console.error('❌ Failed to update test pool configuration');
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
}); 