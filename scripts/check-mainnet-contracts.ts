import { ethers } from 'ethers';

const MAINNET_RPC_URL = 'https://arb1.arbitrum.io/rpc';
const MAINNET_BUILDERS_CONTRACT = '0xC0eD68f163d44B6e9985F0041fDf6f67c6BCFF3f';
const TESTNET_BUILDERS_CONTRACT = '0x649B24D0b6F5A4c3852fD4C0dD91308902E5fe8a';

async function checkContract(address: string, name: string, network: string) {
  try {
    console.log(`Checking ${name} contract at address: ${address} on ${network}`);
    const provider = new ethers.JsonRpcProvider(
      network === 'mainnet' ? MAINNET_RPC_URL : 'https://sepolia-rollup.arbitrum.io/rpc'
    );
    
    // Check if address has code
    const code = await provider.getCode(address);
    
    if (code === '0x') {
      console.log(`❌ ${name} contract does NOT exist at ${address} on ${network} (No code found)`);
      return false;
    } else {
      console.log(`✅ ${name} contract EXISTS at ${address} on ${network}`);
      console.log(`Code length: ${code.length / 2 - 1} bytes`);
      
      // Try to get a storage slot to see if it's initialized
      const slot0 = await provider.getStorage(address, 0);
      console.log(`Storage slot 0: ${slot0}`);
      
      return true;
    }
  } catch (error) {
    console.error(`Error checking ${name} contract on ${network}:`, error);
    return false;
  }
}

async function main() {
  console.log('Checking contracts on Arbitrum One mainnet...');
  
  // Check mainnet contract
  const mainnetExists = await checkContract(MAINNET_BUILDERS_CONTRACT, 'Builders', 'mainnet');
  
  console.log('\n---------------------------------------------------\n');
  
  // Also check the testnet contract address we've been using
  const testnetExists = await checkContract(TESTNET_BUILDERS_CONTRACT, 'Builders', 'testnet');
  
  console.log('\nSummary:');
  console.log(`Mainnet Builders Contract (${MAINNET_BUILDERS_CONTRACT}): ${mainnetExists ? 'EXISTS' : 'DOES NOT EXIST'}`);
  console.log(`Testnet Builders Contract (${TESTNET_BUILDERS_CONTRACT}): ${testnetExists ? 'EXISTS' : 'DOES NOT EXIST'}`);
}

main().catch(error => {
  console.error('Error in main execution:', error);
  process.exit(1);
}); 