# Smart Contract Utilities

This directory contains utility scripts for working with Ethereum smart contracts.

## Setup

Install dependencies:

```bash
npm install
```

Copy the example environment file and update it with your values:

```bash
cp .env.example .env
```

Edit the `.env` file and add your deployment wallet's private key and Arbiscan API key.

## Configuration

The `config.json` file contains the proxy contract address and the current implementation address.

```json
{
  "proxyAddress": "0xC0eD68f163d44B6e9985F0041fDf6f67c6BCFF3f",
  "implementationAddress": "0x...",
  "arbiscanApiKey": "YOUR_API_KEY"
}
```

## Scripts

### Update Implementation

This script checks the implementation address for a proxy contract and updates the configuration file if it has changed.

```bash
npm run update-implementation
```

### Fetch Contracts

This script fetches the Solidity source code for the implementation contract and saves it to the `src` directory.

```bash
npm run fetch-contracts
```

## Deployment

### Compile Contracts

Compile the contracts with Hardhat:

```bash
npm run compile
```

### Deploy to Testnet

Deploy the Builders contract to Arbitrum Goerli testnet:

```bash
npm run deploy:testnet
```

### Deploy to Mainnet

Deploy the Builders contract to Arbitrum One mainnet:

```bash
npm run deploy:mainnet
```

### Verify Contract on Testnet

Verify the contract on Arbiscan (testnet):

```bash
npm run verify:testnet <contract-address>
```

### Verify Contract on Mainnet

Verify the contract on Arbiscan (mainnet):

```bash
npm run verify:mainnet <contract-address>
```

## Notes

- The scripts use the Arbiscan API to fetch contract source code. If you encounter rate limiting issues, you can update the `arbiscanApiKey` in `config.json` with your own API key from [Arbiscan](https://arbiscan.io/apis).
- The implementation address is found by checking the ERC1967 implementation slot in the proxy contract's storage.
- The `src` directory will contain the Solidity source files for the implementation contract. 