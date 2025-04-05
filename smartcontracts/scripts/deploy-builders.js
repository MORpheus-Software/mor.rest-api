// Script to deploy Builders.sol contract to testnet using hardhat
const hre = require("hardhat");
const fs = require('fs-extra');
const path = require('path');

// Path to configuration file
const configPath = path.join(__dirname, '../config.json');

// Get deployment parameters from environment or use defaults
const DEPOSIT_TOKEN_ADDRESS = process.env.DEPOSIT_TOKEN_ADDRESS || "0x34a285A1B1C166420Df5b6630132542923B5b27E";
const EDIT_POOL_DEADLINE = parseInt(process.env.EDIT_POOL_DEADLINE || "604800"); // 7 days in seconds
const MINIMAL_WITHDRAW_LOCK_PERIOD = parseInt(process.env.MINIMAL_WITHDRAW_LOCK_PERIOD || "172800"); // 2 days in seconds
const BASE_FEE = process.env.BASE_FEE || "50"; // 0.5% default fee (in basis points)

async function main() {
  console.log("Deploying Builders ecosystem contracts...");
  
  try {
    // Load configuration
    const config = await fs.readJson(configPath);
    
    // Get the signers
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);
    
    // Get the balance of the deployer
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`Deployer balance: ${hre.ethers.formatEther(balance)} ETH`);
    
    // Check if the deposit token exists
    try {
      // Use a generic ERC20 ABI
      const erc20Abi = [
        "function symbol() view returns (string)",
        "function balanceOf(address) view returns (uint256)"
      ];
      const token = new hre.ethers.Contract(DEPOSIT_TOKEN_ADDRESS, erc20Abi, deployer);
      const symbol = await token.symbol();
      console.log(`Deposit token symbol: ${symbol}`);
    } catch (error) {
      console.warn(`Could not verify deposit token: ${error.message}`);
    }

    console.log("\n1. Deploying FeeConfig contract...");
    const FeeConfigFactory = await hre.ethers.getContractFactory("FeeConfig");
    const feeConfigProxy = await hre.upgrades.deployProxy(
      FeeConfigFactory,
      [
        deployer.address, // Treasury address - initial treasury is the deployer
        BASE_FEE // Base fee (in basis points)
      ],
      {
        kind: "uups",
        initializer: "FeeConfig_init",
        gasLimit: 3000000
      }
    );
    await feeConfigProxy.waitForDeployment();
    const feeConfigAddress = await feeConfigProxy.getAddress();
    console.log(`FeeConfig proxy deployed to: ${feeConfigAddress}`);
    const feeConfigImplAddress = await hre.upgrades.erc1967.getImplementationAddress(feeConfigAddress);
    console.log(`FeeConfig implementation deployed to: ${feeConfigImplAddress}`);

    console.log("\n2. Deploying BuildersTreasury contract...");
    const BuildersTreasuryFactory = await hre.ethers.getContractFactory("BuildersTreasury");
    const buildersTreasuryProxy = await hre.upgrades.deployProxy(
      BuildersTreasuryFactory,
      [
        DEPOSIT_TOKEN_ADDRESS // Using the same token for rewards and deposits
      ],
      {
        kind: "uups",
        initializer: "BuildersTreasury_init",
        gasLimit: 3000000
      }
    );
    await buildersTreasuryProxy.waitForDeployment();
    const buildersTreasuryAddress = await buildersTreasuryProxy.getAddress();
    console.log(`BuildersTreasury proxy deployed to: ${buildersTreasuryAddress}`);
    const buildersTreasuryImplAddress = await hre.upgrades.erc1967.getImplementationAddress(buildersTreasuryAddress);
    console.log(`BuildersTreasury implementation deployed to: ${buildersTreasuryImplAddress}`);

    console.log("\n3. Deploying Builders contract...");
    console.log("--------------------------------------------");
    console.log(`Deposit Token Address: ${DEPOSIT_TOKEN_ADDRESS}`);
    console.log(`Fee Config Address: ${feeConfigAddress}`);
    console.log(`Builders Treasury Address: ${buildersTreasuryAddress}`);
    console.log(`Edit Pool Deadline: ${EDIT_POOL_DEADLINE} seconds`);
    console.log(`Minimal Withdraw Lock Period: ${MINIMAL_WITHDRAW_LOCK_PERIOD} seconds`);
    console.log("--------------------------------------------");
    
    // Compile the contract
    console.log("Compiling Builders contract...");
    const BuildersFactory = await hre.ethers.getContractFactory("Builders");
    
    // Deploy as a UUPS proxy
    console.log("Deploying proxy...");
    try {
      const buildersProxy = await hre.upgrades.deployProxy(
        BuildersFactory,
        [
          // These are the parameters for the Builders_init function
          DEPOSIT_TOKEN_ADDRESS,
          feeConfigAddress,
          buildersTreasuryAddress,
          EDIT_POOL_DEADLINE,
          MINIMAL_WITHDRAW_LOCK_PERIOD
        ],
        {
          kind: "uups", // Specify UUPS proxy pattern
          initializer: "Builders_init", // Specify the initializer function name
          gasLimit: 5000000 // Set a higher gas limit to ensure deployment succeeds
        }
      );
      
      // Wait for deployment to complete
      await buildersProxy.waitForDeployment();
      
      // Get the proxy address
      const buildersProxyAddress = await buildersProxy.getAddress();
      console.log(`Builders proxy deployed to ${buildersProxyAddress}`);
      
      // Get the implementation address
      const buildersImplAddress = await hre.upgrades.erc1967.getImplementationAddress(buildersProxyAddress);
      console.log(`Builders implementation deployed to ${buildersImplAddress}`);

      // Configure the BuildersTreasury to recognize the Builders contract
      console.log("\n4. Setting Builders address in BuildersTreasury...");
      const buildersTreasury = await hre.ethers.getContractAt("BuildersTreasury", buildersTreasuryAddress);
      const setBuildersTx = await buildersTreasury.setBuilders(buildersProxyAddress);
      await setBuildersTx.wait();
      console.log("BuildersTreasury configured successfully");
      
      // Update the config.json file with the new addresses
      const networkType = hre.network.name === 'arbitrum' ? 'mainnet' : 'testnet';
      console.log(`Updating config for ${networkType} network`);

      // Ensure the network section exists in config
      if (!config[networkType]) {
        config[networkType] = {};
      }

      // Update the network-specific config
      config[networkType].buildersProxyAddress = buildersProxyAddress;
      config[networkType].buildersImplAddress = buildersImplAddress;
      config[networkType].feeConfigAddress = feeConfigAddress;
      config[networkType].buildersTreasuryAddress = buildersTreasuryAddress;
      await fs.writeJson(configPath, config, { spaces: 2 });
      console.log(`Config updated with new contract addresses for ${networkType}`);
      
      // Verification instructions
      const network = hre.network.name;
      console.log(`\nTo verify the implementation contracts on ${network}:`);
      console.log(`npx hardhat verify --network ${network} ${feeConfigImplAddress}`);
      console.log(`npx hardhat verify --network ${network} ${buildersTreasuryImplAddress}`);
      console.log(`npx hardhat verify --network ${network} ${buildersImplAddress}`);
      
      return {
        buildersProxyAddress,
        buildersImplAddress,
        feeConfigAddress,
        buildersTreasuryAddress
      };
    } catch (error) {
      console.error("Error during proxy deployment:", error);
      // Try to get more detailed error information
      if (error.data) {
        console.error("Error data:", error.data);
      }
      if (error.error && error.error.message) {
        console.error("Error message:", error.error.message);
      }
      if (error.code) {
        console.error("Error code:", error.code);
      }
      throw error;
    }
  } catch (error) {
    console.error("Error deploying contracts:", error);
    throw error;  // Rethrow to be caught by the catch block below
  }
}

// Execute the deployment
main().then((deployedAddresses) => {
  console.log("\nDeployment completed successfully!");
  console.log(`FeeConfig Address: ${deployedAddresses.feeConfigAddress}`);
  console.log(`BuildersTreasury Address: ${deployedAddresses.buildersTreasuryAddress}`);
  console.log(`Builders Proxy Address: ${deployedAddresses.buildersProxyAddress}`);
  console.log(`Builders Implementation Address: ${deployedAddresses.buildersImplAddress}`);
  process.exit(0);
}).catch(error => {
  console.error("Deployment failed:", error);
  process.exit(1);
}); 