#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Config file path
const CONFIG_DIR = path.join(process.cwd(), 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'subnet-config.json');

// Function to format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

// Main function
async function main() {
  try {
    console.log('📋 Registered Subnets\n');
    
    // Check if config file exists
    if (!fs.existsSync(CONFIG_FILE)) {
      console.log('❌ No subnet configuration found.');
      console.log(`The file ${CONFIG_FILE} does not exist.`);
      console.log('Run the register-test-subnet.ts script first to create a subnet.');
      return;
    }
    
    // Read and parse config file
    const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(configData);
    
    if (!config.subnets || config.subnets.length === 0) {
      console.log('❌ No subnets found in the configuration file.');
      return;
    }
    
    // Display subnet information
    console.log(`Found ${config.subnets.length} subnet(s):\n`);
    
    config.subnets.forEach((subnet: any, index: number) => {
      console.log(`Subnet #${index + 1}:`);
      console.log(`  ID: ${subnet.id}`);
      console.log(`  Name: ${subnet.name}`);
      console.log(`  Description: ${subnet.description}`);
      console.log(`  Admin: ${subnet.adminAddress}`);
      console.log(`  Minimum Deposit: ${subnet.minDeposit} MOR`);
      console.log(`  Start Time: ${new Date(subnet.startTime * 1000).toLocaleString()}`);
      console.log(`  Active: ${subnet.isActive ? 'Yes' : 'No'}`);
      console.log(`  Network: ${subnet.network}`);
      console.log(`  Created: ${formatDate(subnet.createdAt)}`);
      console.log(`  Transaction: https://sepolia.arbiscan.io/tx/${subnet.transactionHash}`);
      console.log(`  View on Dashboard: https://dashboard.mor.org/#/builders?network=testnet&id=${subnet.id}`);
      console.log('');
    });
    
    console.log('To stake to a subnet, run:');
    console.log('npm run stake:testnet-subnet');
    
  } catch (error) {
    console.error('Error reading subnet configuration:', error);
  }
}

// Execute the main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 