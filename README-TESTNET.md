# MOR Testnet Support

This document outlines the testnet support added to the MOR staking application.

## Overview

The application now supports two networks:
- **Mainnet**: Arbitrum One (Chain ID: 0xa4b1)
- **Testnet**: Arbitrum Sepolia (Chain ID: 0x66eee)

When a user connects their wallet to the Arbitrum Sepolia testnet, the application will automatically:
1. Display "TESTNET" in the UI
2. Use the testnet contract addresses
3. Point blockchain explorer links to Sepolia Arbiscan

## Contract Addresses

### Mainnet (Arbitrum One)
- MOR Token: `0x1c9491865a1de77c5b6e19d2e6a5f1d7a6f2b25f`
- Staking Contract: `0xC0eD68f163d44B6e9985F0041fDf6f67c6BCFF3f`

### Testnet (Arbitrum Sepolia)
- Test MOR Token: `0x34a285A1B1C166420Df5b6630132542923B5b27E`
- Builders Contract: `0x649B24D0b6F5A4c3852fD4C0dD91308902E5fe8a`

## Testing Tools

Two scripts have been added to help with testnet development:

### 1. Register Testnet Subnet

This script allows you to register a new subnet on the Arbitrum Sepolia testnet.

```bash
npm run register:testnet-subnet
```

### 2. Stake to Testnet Subnet

This script allows you to stake MOR tokens to an existing subnet on Arbitrum Sepolia.

```bash
npm run stake:testnet-subnet
```

## Testing Instructions

1. **Setup your environment**:
   - Copy `.env.example` to `.env`
   - If using scripts, add your private key to the `.env` file

2. **Connect to Arbitrum Sepolia**:
   - Add the Arbitrum Sepolia network to your wallet if not already added:
     - Network Name: Arbitrum Sepolia
     - RPC URL: https://sepolia-rollup.arbitrum.io/rpc
     - Chain ID: 421614 (0x66eee in hex)
     - Currency Symbol: SepoliaETH
     - Block Explorer URL: https://sepolia.arbiscan.io

3. **Get testnet tokens**:
   - Request Sepolia ETH from: https://www.alchemy.com/faucets/arbitrum-sepolia
   - Join the MOR Discord for testnet MOR tokens: https://discord.gg/morpheus

4. **Test the application**:
   - Start the application: `npm run dev`
   - Connect your wallet to Arbitrum Sepolia
   - The app should display "TESTNET" in the staking page
   - Test staking and unstaking with testnet tokens

## Implementation Details

The following changes were made to support testnet functionality:

1. Updated `src/pages/Staking.tsx` to:
   - Detect the current network
   - Use different contract addresses based on network
   - Update UI to show "TESTNET" when on testnet

2. Modified `src/services/ethService.ts` to:
   - Define contract addresses for both networks
   - Add a function to get addresses for the current network
   - Update all blockchain interaction functions to use the correct addresses

3. Added scripts for testnet subnet management:
   - `scripts/register-test-subnet.ts`: Register a new subnet
   - `scripts/stake-to-subnet.ts`: Stake to an existing subnet 