const { ethers } = require('ethers');
const fs = require('fs-extra');
const path = require('path');
const fetchContractCode = require('./fetch-contracts');

// Path to configuration file
const configPath = path.join(__dirname, '../config.json');

// ERC1967 implementation slot
const IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

async function getImplementationAddress(proxyAddress) {
  try {
    // Connect to Arbitrum network using a public provider
    const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    
    // Get the implementation address from the storage slot
    const implementationAddressBytes = await provider.getStorage(
      proxyAddress,
      IMPLEMENTATION_SLOT
    );
    
    // Convert the bytes to a proper address format
    const implementationAddress = ethers.getAddress('0x' + implementationAddressBytes.slice(26));
    
    return implementationAddress;
  } catch (error) {
    console.error('Error fetching implementation address:', error);
    throw error;
  }
}

async function updateImplementationAddress(networkType = 'mainnet') {
  try {
    // Read config file
    const config = await fs.readJson(configPath);
    
    // Get the network configuration
    if (!config[networkType]) {
      throw new Error(`Network type "${networkType}" configuration not found in config.json`);
    }
    
    // Get the proxy address from config
    const proxyAddress = config[networkType].proxyAddress;
    
    if (!proxyAddress) {
      throw new Error(`Proxy address not found in config.json for ${networkType}`);
    }
    
    console.log(`Checking implementation address for ${networkType} proxy ${proxyAddress}...`);
    
    // Get the current implementation address
    const currentImplementation = await getImplementationAddress(proxyAddress);
    
    console.log(`Current implementation address: ${currentImplementation}`);
    
    // Check if the implementation address has changed
    if (currentImplementation !== config[networkType].implementationAddress) {
      console.log(`Implementation address has changed!`);
      console.log(`Previous: ${config[networkType].implementationAddress || 'Not set'}`);
      console.log(`New: ${currentImplementation}`);
      
      // Update config with the new implementation address
      config[networkType].implementationAddress = currentImplementation;
      
      // Save updated config
      await fs.writeJson(configPath, config, { spaces: 2 });
      
      console.log(`Config updated successfully for ${networkType}`);
      
      // Return true if the address was updated
      return true;
    } else {
      console.log('Implementation address has not changed');
      
      // Return false if the address was not updated
      return false;
    }
  } catch (error) {
    console.error('Error updating implementation address:', error);
    throw error;
  }
}

// Run the script if it's called directly
if (require.main === module) {
  // Check if network type is provided as an argument
  const networkType = process.argv[2] || 'mainnet';
  
  console.log(`Updating implementation address for ${networkType} network`);
  
  updateImplementationAddress(networkType)
    .then(updated => {
      if (updated) {
        // If the implementation was updated, run the fetch contracts script
        console.log('Running fetch-contracts script to update contract code...');
        fetchContractCode(networkType)
          .catch(error => {
            console.error('Error running fetch-contracts script:', error);
          });
      }
    })
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = updateImplementationAddress; 