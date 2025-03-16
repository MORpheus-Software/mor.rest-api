import { ethers } from "ethers";
import { StakingClient } from "./StakingClient";

// Setup provider and signer
const provider = ethers.getDefaultProvider("mainnet"); // Adjust the network as needed

// Replace YOUR_PRIVATE_KEY with your actual private key for testing purposes
const walletPrivateKey = "YOUR_PRIVATE_KEY";
const wallet = new ethers.Wallet(walletPrivateKey, provider);

const stakingClient = new StakingClient(provider, wallet);

async function main() {
  try {
    const stakedAmount = await stakingClient.getStakedAmount(wallet.address);
    console.log("Staked amount:", stakedAmount.toString());

    // Uncomment the following lines to perform staking operations
    // const stakeTx = await stakingClient.stake("0.1");
    // console.log("Stake transaction confirmed:", stakeTx);

    // const unstakeTx = await stakingClient.unstake("0.1");
    // console.log("Unstake transaction confirmed:", unstakeTx);

    // const claimTx = await stakingClient.claimReward();
    // console.log("Claim Reward transaction confirmed:", claimTx);
  } catch (error) {
    console.error("Error with staking operations:", error);
  }
}

main(); 