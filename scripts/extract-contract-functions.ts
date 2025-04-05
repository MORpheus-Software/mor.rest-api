import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

const TESTNET_RPC_URL = process.env.TESTNET_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc';
const TESTNET_BUILDERS_CONTRACT = process.env.VITE_TESTNET_BUILDERS_CONTRACT_ADDRESS || '0x649B24D0b6F5A4c3852fD4C0dD91308902E5fe8a';
const TESTNET_STAKING_CONTRACT = process.env.VITE_TESTNET_STAKING_CONTRACT_ADDRESS || '0xC0eD68f163d44B6e9985F0041fDf6f67c6BCFF3f';

// Standard ERC20 function selectors
const KNOWN_SIGNATURES: { [key: string]: string } = {
  '0x06fdde03': 'name()',
  '0x95d89b41': 'symbol()',
  '0x313ce567': 'decimals()',
  '0x18160ddd': 'totalSupply()',
  '0x70a08231': 'balanceOf(address)',
  '0xdd62ed3e': 'allowance(address,address)',
  '0x095ea7b3': 'approve(address,uint256)',
  '0xa9059cbb': 'transfer(address,uint256)',
  '0x23b872dd': 'transferFrom(address,address,uint256)',
  '0x3644e515': 'DOMAIN_SEPARATOR()',
  '0x7ecebe00': 'nonces(address)',
  '0xd505accf': 'permit(address,address,uint256,uint256,uint8,bytes32,bytes32)',
  // Common admin functions
  '0x8da5cb5b': 'owner()',
  '0x715018a6': 'renounceOwnership()',
  '0xf2fde38b': 'transferOwnership(address)',
  '0x5c975abb': 'paused()',
  '0x8456cb59': 'pause()',
  '0x3f4ba83a': 'unpause()',
  // Common Builders/Staking related functions
  '0xa694fc3a': 'stake(uint256)',
  '0x2e1a7d4d': 'withdraw(uint256)',
  '0x3ccfd60b': 'withdraw()'
};

async function extractFunctions(address: string, name: string) {
  try {
    console.log(`Analyzing ${name} contract at address: ${address}`);
    const provider = new ethers.JsonRpcProvider(TESTNET_RPC_URL);
    
    // Check if address has code
    const code = await provider.getCode(address);
    
    if (code === '0x') {
      console.log(`❌ ${name} contract does NOT exist at ${address} (No code found)`);
      return null;
    } else {
      console.log(`✅ ${name} contract EXISTS at ${address}`);
      console.log(`Code length: ${code.length / 2 - 1} bytes`);
      
      // Extract function selectors
      const selectors = extractSelectors(code);
      console.log(`Extracted ${selectors.length} function selectors`);
      
      // Identify known functions
      const identifiedFunctions = identifyFunctions(selectors);
      
      // Log the results
      console.log('\nIdentified Functions:');
      for (const [selector, signature] of Object.entries(identifiedFunctions)) {
        console.log(`${selector}: ${signature}`);
      }
      
      console.log('\nUnidentified Selectors:');
      for (const selector of selectors) {
        if (!identifiedFunctions[selector]) {
          console.log(selector);
        }
      }
      
      // Save results to file
      const outputDir = './tmp';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const outputFile = `${outputDir}/${name.toLowerCase()}_functions.json`;
      const output = {
        address,
        codeLength: code.length / 2 - 1,
        selectors,
        identifiedFunctions
      };
      
      fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
      console.log(`\nResults saved to ${outputFile}`);
      
      return {
        selectors,
        identifiedFunctions
      };
    }
  } catch (error) {
    console.error(`Error analyzing ${name} contract:`, error);
    return null;
  }
}

function extractSelectors(bytecode: string): string[] {
  // Function selectors are 4 bytes (8 hex chars)
  // They typically appear in the code after PUSH4 opcode (0x63)
  const selectors = new Set<string>();
  
  // Trim the 0x prefix if present
  bytecode = bytecode.startsWith('0x') ? bytecode.substring(2) : bytecode;
  
  // Look for PUSH4 opcode (0x63) followed by 4 bytes
  for (let i = 0; i < bytecode.length - 10; i += 2) {
    const opcode = bytecode.substring(i, i + 2);
    if (opcode === '63') { // PUSH4 opcode
      const selector = '0x' + bytecode.substring(i + 2, i + 10);
      selectors.add(selector);
    }
  }
  
  return Array.from(selectors);
}

function identifyFunctions(selectors: string[]): { [key: string]: string } {
  const identified: { [key: string]: string } = {};
  
  for (const selector of selectors) {
    if (KNOWN_SIGNATURES[selector]) {
      identified[selector] = KNOWN_SIGNATURES[selector];
    }
  }
  
  return identified;
}

async function generateABI(contract: string) {
  const result = await extractFunctions(contract, 'Builders');
  if (!result) return null;
  
  const { selectors, identifiedFunctions } = result;
  
  // Generate a simple ABI for the identified functions
  const abi: any[] = [];
  
  // Add identified functions to ABI
  for (const [selector, signature] of Object.entries(identifiedFunctions)) {
    // Parse the signature
    let name = signature;
    let inputs: any[] = [];
    
    if (signature.includes('(')) {
      name = signature.substring(0, signature.indexOf('('));
      const paramsStr = signature.substring(signature.indexOf('(') + 1, signature.indexOf(')'));
      
      if (paramsStr) {
        const params = paramsStr.split(',');
        inputs = params.map((param, i) => {
          return {
            name: `param${i}`,
            type: param.trim()
          };
        });
      }
    }
    
    // Guess if the function is a view based on common patterns
    const isView = name.startsWith('get') || 
                   name === 'name' || 
                   name === 'symbol' || 
                   name === 'decimals' || 
                   name === 'totalSupply' || 
                   name === 'balanceOf' || 
                   name === 'allowance' ||
                   name === 'owner' ||
                   name === 'paused';
    
    abi.push({
      type: 'function',
      name,
      inputs,
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: isView ? 'view' : 'nonpayable'
    });
  }
  
  // Add unidentified selectors with placeholder functions
  for (const selector of selectors) {
    if (!identifiedFunctions[selector]) {
      abi.push({
        type: 'function',
        name: `unknown_${selector.substring(2)}`,
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'nonpayable'
      });
    }
  }
  
  // Save the ABI to a file
  const outputDir = './tmp';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputFile = `${outputDir}/generated_abi.json`;
  fs.writeFileSync(outputFile, JSON.stringify(abi, null, 2));
  console.log(`\nGenerated ABI saved to ${outputFile}`);
  
  return abi;
}

async function main() {
  console.log('Analyzing contracts on Arbitrum Sepolia testnet...');
  console.log(`Using RPC URL: ${TESTNET_RPC_URL}`);
  
  // Extract and analyze functions
  await extractFunctions(TESTNET_BUILDERS_CONTRACT, 'Builders');
  console.log('\n---------------------------------------------------\n');
  await extractFunctions(TESTNET_STAKING_CONTRACT, 'Staking');
  
  // Generate ABI for the Builders contract
  console.log('\n---------------------------------------------------\n');
  console.log('Generating ABI for Builders contract...');
  await generateABI(TESTNET_BUILDERS_CONTRACT);
}

main().catch(error => {
  console.error('Error in main execution:', error);
  process.exit(1);
}); 