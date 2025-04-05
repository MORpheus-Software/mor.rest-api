require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: {
    version: "0.8.21",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Arbitrum Sepolia (testnet)
    arbitrumSepolia: {
      url: process.env.TESTNET_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 421614,
    },
    // Arbitrum Goerli (deprecated testnet)
    arbitrumGoerli: {
      url: "https://goerli-rollup.arbitrum.io/rpc",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 421613,
    },
    // Arbitrum One (mainnet)
    arbitrumOne: {
      url: process.env.ARBITRUM_MAINNET_RPC_URL || "https://arb1.arbitrum.io/rpc",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 42161,
    },
    // Local Hardhat network
    hardhat: {
      forking: {
        url: process.env.TESTNET_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
        blockNumber: 1085000, // Use a specific block number for consistent testing
      },
    },
  },
  etherscan: {
    apiKey: {
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || "",
      arbitrumGoerli: process.env.ARBISCAN_API_KEY || "",
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
      {
        network: "arbitrumGoerli",
        chainId: 421613,
        urls: {
          apiURL: "https://api-goerli.arbiscan.io/api",
          browserURL: "https://goerli.arbiscan.io/",
        },
      },
    ],
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
}; 