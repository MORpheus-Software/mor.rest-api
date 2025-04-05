# MOR Subnet Registration Scripts

This directory contains scripts for interacting with the MOR subnet contracts.

## Register Test Subnet

The `register-test-subnet.ts` script allows you to register a new subnet on the Arbitrum Sepolia testnet for testing purposes.

### Prerequisites

- Node.js 16+ and npm/yarn installed
- TypeScript installed
- Ethereum wallet with private key
- Testnet MOR tokens (you need these to pay for gas fees)

### Setup

1. Create a `.env` file in the root directory with your private key:
   ```
   PRIVATE_KEY=your_private_key_here
   ```

2. Install dependencies:
   ```bash
   npm install ethers dotenv
   ```

### Running the Script

1. Run the script using the npm command:
   ```bash
   npm run register:testnet-subnet
   ```

2. Follow the interactive prompts to enter your subnet details:
   - Name and description for your subnet
   - Admin address (which will receive rewards)
   - Start time (when the subnet becomes active)
   - Lock settings for deposits and rewards
   - Minimum deposit amount

## Stake to a Subnet

The `stake-to-subnet.ts` script allows you to stake MOR tokens to an existing subnet on the Arbitrum Sepolia testnet.

### Running the Script

1. Run the script using the npm command:
   ```bash
   npm run stake:testnet-subnet
   ```

2. Follow the interactive prompts:
   - Enter the subnet ID (bytes32 hash)
   - Enter the amount of MOR tokens to stake

The script will:
1. Verify the subnet exists
2. Check your MOR token balance
3. Approve tokens for staking if necessary
4. Stake the tokens to the subnet

### Obtaining Testnet MOR Tokens

To get testnet MOR tokens:
1. Join the MOR Discord community: https://discord.gg/morpheus
2. Request testnet tokens in the #testnet-faucet channel
3. Alternatively, use the testnet faucet at https://faucet.mor.org

### Contract Addresses (Arbitrum Sepolia Testnet)

- Test MOR Token: `0x34a285A1B1C166420Df5b6630132542923B5b27E`
- Builders Contract: `0x649B24D0b6F5A4c3852fD4C0dD91308902E5fe8a`

### Troubleshooting

- If you encounter connection issues, the script will attempt to use multiple RPC URLs for Arbitrum Sepolia.
- Ensure you have enough ETH on Arbitrum Sepolia for gas fees.
- Make sure your private key is correct and the associated wallet has MOR tokens.
- If verification fails, you can manually check your subnet on the dashboard. 