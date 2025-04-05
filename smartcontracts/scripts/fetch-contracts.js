const { ethers } = require('ethers');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

// Path to configuration file
const configPath = path.join(__dirname, '../config.json');
const srcDir = path.join(__dirname, '../src');
const interfacesDir = path.join(srcDir, 'interfaces');
const interfacesBuildersDir = path.join(interfacesDir, 'builders');
const libsDir = path.join(srcDir, 'libs');

// Ensure directories exist
fs.ensureDirSync(srcDir);
fs.ensureDirSync(interfacesDir);
fs.ensureDirSync(interfacesBuildersDir);
fs.ensureDirSync(libsDir);

// Arbiscan API base URL
const ARBISCAN_API_URL = 'https://api.arbiscan.io/api';

// Contract addresses to fetch
const CONTRACTS = {
  BUILDERS: '0x969c0f87623dc33010b4069fea48316ba2e45382' // Main contract to fetch
};

async function getContractSource(address) {
  try {
    // Read config file to get the API key
    const config = await fs.readJson(configPath);
    const apiKey = config.arbiscanApiKey || '';
    
    console.log(`Fetching contract source from Arbiscan API for ${address}...`);
    
    // Get contract source code from Arbiscan API
    const response = await axios.get(ARBISCAN_API_URL, {
      params: {
        module: 'contract',
        action: 'getsourcecode',
        address: address,
        apikey: apiKey
      }
    });

    if (response.data.status !== '1' || !response.data.result || response.data.result.length === 0) {
      throw new Error(`Failed to fetch contract source: ${response.data.message}`);
    }

    return response.data.result[0];
  } catch (error) {
    console.error('Error fetching contract source from Arbiscan API:', error);
    
    // Fallback to web scraping if API fails
    console.log('Attempting to fetch from website as fallback...');
    return getContractSourceFromWeb(address);
  }
}

async function getContractSourceFromWeb(address) {
  try {
    console.log(`Fetching contract source from Arbiscan website for ${address}...`);
    
    // Get HTML content of the contract page
    const response = await axios.get(`https://arbiscan.io/address/${address}#code`);
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch contract page: ${response.statusText}`);
    }
    
    const html = response.data;
    
    // Simple regex based extraction of contract source code
    // This is a simplistic approach - in production, you might want to use a proper HTML parser
    const sourceCodeMatch = html.match(/<pre class='js-sourcecopyarea' id='editor'>([\s\S]*?)<\/pre>/);
    
    if (!sourceCodeMatch || !sourceCodeMatch[1]) {
      throw new Error('Could not find source code on the contract page');
    }
    
    // Clean up HTML entities
    const sourceCode = sourceCodeMatch[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Get contract name from the HTML
    const contractNameMatch = html.match(/<div class="h6 mb-0">([\w]+)<\/div>/);
    const contractName = contractNameMatch && contractNameMatch[1] ? contractNameMatch[1] : 'Contract';
    
    return {
      ContractName: contractName,
      SourceCode: sourceCode
    };
  } catch (error) {
    console.error('Error fetching contract source from web:', error);
    throw error;
  }
}

async function parseSourceFiles(sourceCode, contractName) {
  try {
    // Check if sourceCode starts with {{ and ends with }}, which is a special JSON format from Arbiscan
    if (sourceCode.trim().startsWith('{{') && sourceCode.trim().endsWith('}}')) {
      try {
        console.log('Found special JSON format with double braces, extracting...');
        // Remove the outer {{ and }} to get valid JSON
        const jsonContent = sourceCode.trim().substring(1, sourceCode.length - 1);
        const sourceJson = JSON.parse(jsonContent);
        
        if (sourceJson.language === 'Solidity' && sourceJson.sources) {
          console.log('Successfully parsed source data with multiple files');
          return Object.entries(sourceJson.sources).map(([filePath, fileData]) => {
            return {
              name: path.basename(filePath),
              path: filePath,
              content: fileData.content 
            };
          });
        }
      } catch (error) {
        console.warn('Failed to parse special JSON format:', error);
      }
    }
    
    // Check if sourceCode is in standard JSON format (single braces)
    if (sourceCode.startsWith('{') && sourceCode.endsWith('}')) {
      try {
        const sourceJson = JSON.parse(sourceCode);
        
        // Handle different source JSON formats
        if (sourceJson.sources) {
          // Standard JSON input format
          return Object.entries(sourceJson.sources).map(([filePath, content]) => {
            return {
              name: path.basename(filePath),
              path: filePath,
              content: content.content
            };
          });
        } else if (sourceJson.language === "Solidity" && sourceJson.sources) { 
          // Format used in Arbiscan
          return Object.entries(sourceJson.sources).map(([filePath, content]) => {
            return {
              name: path.basename(filePath),
              path: filePath,
              content: content.content || content
            };
          });
        } else {
          // Some contracts use a different format
          return Object.entries(sourceJson).map(([filePath, content]) => {
            return {
              name: path.basename(filePath),
              path: filePath,
              content: typeof content === 'string' ? content : content.content
            };
          });
        }
      } catch (error) {
        console.warn('Failed to parse source as standard JSON, treating as single file:', error);
        // Fall back to treating as a single file
      }
    }
    
    // Single file contract
    return [{
      name: `${contractName}.sol`,
      path: `${contractName}.sol`,
      content: sourceCode
    }];
  } catch (error) {
    console.error('Error parsing source files:', error);
    throw error;
  }
}

function determineSavePath(filePath) {
  // Extract the relative path based on the original source structure
  let targetPath;
  
  // OpenZeppelin pattern recognition
  if (filePath.startsWith('@openzeppelin/')) {
    // Extract the path after @openzeppelin/contracts or @openzeppelin/contracts-upgradeable
    const match = filePath.match(/@openzeppelin\/contracts(?:-upgradeable)?\/(.*)$/);
    if (match && match[1]) {
      // Create mapping from OpenZeppelin paths to our src structure
      const relativePath = match[1];
      targetPath = path.join(srcDir, relativePath);
    } else {
      // Default fallback for OpenZeppelin files
      targetPath = path.join(srcDir, path.basename(filePath));
    }
  } 
  // Handle Solarity files
  else if (filePath.startsWith('@solarity/')) {
    const match = filePath.match(/@solarity\/solidity-lib\/(.*)$/);
    if (match && match[1]) {
      targetPath = path.join(srcDir, match[1]);
    } else {
      targetPath = path.join(srcDir, path.basename(filePath));
    }
  }
  // Handle contracts/ directory (project specific files)
  else if (filePath.startsWith('contracts/')) {
    // Map contracts/ to src/
    const relativePath = filePath.substring('contracts/'.length);
    targetPath = path.join(srcDir, relativePath);
  }
  // Fallback for any other files
  else {
    targetPath = path.join(srcDir, path.basename(filePath));
  }

  return targetPath;
}

async function saveContractFiles(files) {
  try {
    const savedFiles = [];
    
    // Save each file to the appropriate directory structure
    for (const file of files) {
      const savePath = determineSavePath(file.path);
      const saveDir = path.dirname(savePath);
      
      // Ensure directory exists
      await fs.ensureDir(saveDir);
      
      console.log(`Saving file: ${savePath}`);
      await fs.writeFile(savePath, file.content);
      savedFiles.push(savePath);
    }
    
    console.log(`Saved ${files.length} contract files`);
    return savedFiles;
  } catch (error) {
    console.error('Error saving contract files:', error);
    throw error;
  }
}

async function fetchContractCode(networkType = 'mainnet') {
  try {
    // Read config file
    const config = await fs.readJson(configPath);
    
    // Check if the network configuration exists
    if (!config[networkType]) {
      throw new Error(`Network type "${networkType}" configuration not found in config.json`);
    }
    
    // Get the implementation address from config
    const implementationAddress = config[networkType].implementationAddress || CONTRACTS.BUILDERS;
    
    if (!implementationAddress) {
      throw new Error(`Implementation address not found in config.json for ${networkType} or predefined contracts`);
    }
    
    console.log(`Fetching contract source for ${networkType} implementation ${implementationAddress}...`);
    
    // Get contract source
    const contractData = await getContractSource(implementationAddress);
    
    console.log(`Contract Name: ${contractData.ContractName}`);
    
    // Parse source files
    const sourceFiles = await parseSourceFiles(contractData.SourceCode, contractData.ContractName);
    
    // Save contract files
    const savedFiles = await saveContractFiles(sourceFiles);
    
    console.log('Contract source code successfully fetched and saved');
    console.log('Files saved:');
    savedFiles.forEach(file => console.log(`- ${file}`));
    
    return true;
  } catch (error) {
    console.error('Error fetching contract code:', error);
    throw error;
  }
}

// Run the script if it's called directly
if (require.main === module) {
  // Check if network type is provided as an argument
  const networkType = process.argv[2] || 'mainnet';
  
  console.log(`Fetching contract code for ${networkType} network`);
  
  fetchContractCode(networkType)
    .catch(error => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = fetchContractCode; 