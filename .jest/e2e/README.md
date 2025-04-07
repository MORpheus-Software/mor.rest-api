# End-to-End (E2E) Tests

This directory contains documentation for running end-to-end tests for the stake authorization middleware.

## Prerequisites

To run these tests, you'll need:

1. A running local API server (`npm run server:dev`)
2. A Redis instance (`redis-server` or Docker)
3. A private key with testnet ETH and MOR tokens

## Configuration

The tests use environment variables defined in `.env.test`. Before running the tests:

1. Copy the example environment if you haven't already:
   ```bash
   cp .env.test.example .env.test
   ```

2. Update the following values in `.env.test`:
   ```
   TESTNET_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
   TEST_PRIVATE_KEY=YOUR_PRIVATE_KEY_WITH_TESTNET_TOKENS
   ```

## Running the Tests

Run the E2E tests with:

```bash
npm run test:e2e:with-env
```

This command loads environment variables from `.env.test` and runs the tests using Jest.

## Test Coverage

The E2E tests verify:

1. Blockchain data priority over database
2. Response time optimization with grace periods
3. Database synchronization with blockchain
4. Performance under slow blockchain conditions

## Troubleshooting

If tests are being skipped with a message about missing configuration, ensure:

1. Your `.env.test` file has `TEST_PRIVATE_KEY` set
2. The API server is running and accessible at `http://localhost:4000/api/v1`
3. Your testnet wallet has sufficient ETH and MOR tokens

If you encounter other issues, check the console output for specific error messages. 