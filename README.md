# MorSaaS: Morpheus Network Staking Integration

A SaaS platform built on Morpheus Subnets, allowing users to stake MOR tokens into subnets and earn rewards. This project integrates with the Morpheus Builders Contract on Arbitrum Sepolia testnet.

## Features

- Create and manage Morpheus Subnets
- Stake MOR tokens into subnets
- Track staking balances and rewards
- Demo mode for testing without real blockchain transactions

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- MetaMask or another Web3 wallet

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/morsaas.git
   cd morsaas
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create `.env` file from the example
   ```bash
   cp .env.example .env
   ```

4. Set your private key in the `.env` file (only needed for scripts that interact with the blockchain)
   ```
   PRIVATE_KEY=your_private_key_here
   ```

5. Start the development server
   ```bash
   npm run dev
   ```

## Demo Mode

The application includes a demo mode that simulates blockchain interactions without sending actual transactions. This is useful for testing the UI and user flow without spending real tokens.

To enable demo mode:
- Set `DEMO_MODE=true` in your `.env` file for scripts
- Toggle the "Demo Mode" switch in the UI when using the application

## Subnet Registration

To register a new subnet on the Arbitrum Sepolia testnet:

1. Update the `config/registration-config.json` file with your subnet details
2. Run the registration script:
   ```bash
   npm run register:testnet-subnet
   ```

### Configuration Options

The `config/registration-config.json` file supports the following options:

```json
{
  "subnetName": "Your Subnet Name",
  "subnetDescription": "Description of your subnet",
  "adminAddress": "0xYourAdminAddress",
  "startTime": 1743657004,
  "minDeposit": "10",
  "depositsLocked": false,
  "builderRewardsStaked": true,
  "skipPrompts": true,
  "makeInitialDeposit": true
}
```

## Staking

The staking component (`src/components/Staking.tsx`) provides a user interface for:

- Viewing available subnets
- Selecting a subnet to interact with
- Staking MOR tokens into a subnet
- Unstaking MOR tokens from a subnet
- Viewing staking balances

## Building For Production

To build the application for production:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Contract Addresses

### Arbitrum Sepolia Testnet
- MOR Token: `0x34a285A1B1C166420Df5b6630132542923B5b27E`
- Builders Contract: `0x649B24D0b6F5A4c3852fD4C0dD91308902E5fe8a`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Resources

- [Morpheus Network Documentation](https://docs.mor.org)
- [Morpheus Builders Contract Documentation](https://github.com/MorpheusAIs/SmartContracts/blob/main/docs/Builders%20Contract%20Testnet%20Guide.md)
- [Arbitrum Sepolia Explorer](https://sepolia.arbiscan.io/)
