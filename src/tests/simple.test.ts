import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { BuildersClient } from '../staking/BuildersClient';

// Load environment variables
dotenv.config();

describe('Simple client initialization tests', () => {
  test('should create BuildersClient without errors', () => {
    // Use a simple provider
    const provider = new ethers.JsonRpcProvider('https://sepolia-rollup.arbitrum.io/rpc');
    const wallet = ethers.Wallet.createRandom();
    const signer = wallet.connect(provider);
    
    // Initialize the client
    const buildersClient = new BuildersClient(
      provider,
      signer,
      '0x649B24D0b6F5A4c3852fD4C0dD91308902E5fe8a',
      '0x34a285A1B1C166420Df5b6630132542923B5b27E'
    );
    
    // Verify it was created correctly
    expect(buildersClient).toBeDefined();
    expect(buildersClient.getNetworkType()).toBe('testnet');
  });
}); 