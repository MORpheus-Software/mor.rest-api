# BuildersClient E2E Testing

This document provides instructions for setting up and running End-to-End (E2E) tests for the BuildersClient integration with smart contracts on the testnet.

## Prerequisites

- Node.js 20.0.0 or higher
- Access to Arbitrum Sepolia testnet
- A wallet with some ETH for gas on Arbitrum Sepolia
- Some test MOR tokens on Arbitrum Sepolia

## Setup

1. **Create a `.env.integration` file**

   Create a file named `.env.integration` in the project root with the following content:

   ```
   # Required for E2E tests
   PRIVATE_KEY=your_private_key_here
   TESTNET_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
   
   # Contract addresses - using the latest testnet addresses
   VITE_TESTNET_BUILDERS_CONTRACT_ADDRESS=0x649B24D0b6F5A4c3852fD4C0dD91308902E5fe8a
   VITE_TESTNET_MOR_TOKEN_ADDRESS=0x34a285A1B1C166420Df5b6630132542923B5b27E
   ```

   Replace `your_private_key_here` with a private key for a wallet that:
   - Has some ETH for gas on Arbitrum Sepolia testnet
   - Has some test MOR tokens on Arbitrum Sepolia testnet

   > ⚠️ **SECURITY WARNING**: Never use a private key with real funds for testing, and never commit your `.env.integration` file to version control.

2. **Get testnet ETH and MOR tokens**

   To acquire testnet ETH:
   - Use the [Arbitrum Sepolia Faucet](https://www.coinbase.com/faucets/arbitrum-sepolia-faucet)
   
   To acquire testnet MOR tokens, you can:
   - Contact the MOR token team for testnet tokens
   - Request testnet tokens from the project team

## Running E2E Tests

Execute the E2E tests using:

```bash
npm run test:e2e
```

This will:
1. Load configuration from your `.env.integration` file
2. Run the BuildersClient integration tests against the testnet contracts
3. Provide detailed output about the test execution

## Test Coverage

The E2E tests verify the following functionality:

- ✅ Contract existence verification
- ✅ Network type detection
- ✅ Pool ID generation
- ✅ MOR token balance and allowance retrieval
- ✅ Builder pool creation
- ✅ Builder pool information retrieval
- ✅ Token approval
- ✅ Deposit into builder pool
- ✅ User data retrieval
- ✅ Withdrawal from builder pool
- ✅ Reward calculation and claiming
- ✅ Builder pool editing

## Troubleshooting

If your tests fail, check the following:

1. **RPC Connection Issues**
   - Verify your RPC URL is correct and the endpoint is accessible
   - Try using a different RPC provider if needed

2. **Insufficient Funds**
   - Ensure your wallet has enough ETH for gas
   - Ensure your wallet has enough test MOR tokens

3. **Contract Addresses**
   - Verify the contract addresses are correct and the contracts are deployed on the testnet

4. **Transaction Errors**
   - Check transaction error messages in the test output
   - Some operations may fail if you don't have the right permissions or if timing conditions are not met

5. **Pool Already Exists**
   - If you see "pool already exists" errors, this is normal if you've run the tests before with the same pool name

## Important Notes

- These tests interact with real smart contracts on the testnet and will submit real transactions
- Each transaction will cost testnet ETH for gas
- Some tests create pools with a unique name based on timestamp
- Tests are designed to be idempotent when possible, but may leave state changes on the testnet

---

For any questions or issues, please contact the development team. 