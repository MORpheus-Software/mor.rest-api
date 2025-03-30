import { ethers } from "ethers";
import { StakingClient } from "./StakingClient";

// Demo class that simulates staking functionality without blockchain connection
export class DemoStakingClient {
  // In-memory storage for demo purposes
  private stakedAmounts: Map<string, number> = new Map();
  private defaultAddress = "0xdemoAddress";
  
  async stake(amount: string, address?: string) {
    const userAddress = address || this.defaultAddress;
    const currentAmount = this.stakedAmounts.get(userAddress) || 0;
    const amountToAdd = parseFloat(amount);
    this.stakedAmounts.set(userAddress, currentAmount + amountToAdd);
    
    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      hash: `demo-tx-${Date.now()}`,
      wait: async () => ({ status: 1 })
    };
  }
  
  async unstake(amount: string, address?: string) {
    const userAddress = address || this.defaultAddress;
    const currentAmount = this.stakedAmounts.get(userAddress) || 0;
    const amountToRemove = parseFloat(amount);
    
    if (currentAmount < amountToRemove) {
      throw new Error("Insufficient staked amount");
    }
    
    this.stakedAmounts.set(userAddress, currentAmount - amountToRemove);
    
    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      hash: `demo-tx-${Date.now()}`,
      wait: async () => ({ status: 1 })
    };
  }
  
  async getStakedAmount(address?: string) {
    const userAddress = address || this.defaultAddress;
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return (this.stakedAmounts.get(userAddress) || 0).toString();
  }
  
  async getStakedBalance(address?: string) {
    // Alias for getStakedAmount to match the real client interface
    return this.getStakedAmount(address);
  }
  
  async claimReward() {
    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      hash: `demo-tx-${Date.now()}`,
      wait: async () => ({ status: 1 })
    };
  }
}

// Demo usage - this function can be used for testing in a Node.js environment
export async function testDemo() {
  const demoClient = new DemoStakingClient();
  const address = "0xdemoAddress";
  
  console.log("Initial staked amount:", await demoClient.getStakedAmount(address));
  
  console.log("Staking 100 tokens...");
  await demoClient.stake("100", address);
  
  console.log("New staked amount:", await demoClient.getStakedAmount(address));
  
  console.log("Unstaking 50 tokens...");
  await demoClient.unstake("50", address);
  
  console.log("Final staked amount:", await demoClient.getStakedAmount(address));
  
  console.log("Claiming rewards...");
  await demoClient.claimReward();
  console.log("Rewards claimed");
} 