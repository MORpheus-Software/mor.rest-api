import { ethers } from 'ethers';

// Assuming we have the ABI for the staking contract
const stakingABI = [
  // Add the actual ABI here once we have it
  "function stake(uint256 amount) public",
  "function unstake(uint256 amount) public",
  "function getStakedBalance(address account) public view returns (uint256)",
  "function getTotalStaked() public view returns (uint256)"
];

class StakingClient {
  private contract: ethers.Contract;

  constructor(provider: ethers.providers.Provider, contractAddress: string) {
    this.contract = new ethers.Contract(contractAddress, stakingABI, provider);
  }

  async stake(amount: number, signer: ethers.Signer) {
    const connectedContract = this.contract.connect(signer);
    return await connectedContract.stake(amount);
  }

  async unstake(amount: number, signer: ethers.Signer) {
    const connectedContract = this.contract.connect(signer);
    return await connectedContract.unstake(amount);
  }

  async getStakedBalance(account: string) {
    return await this.contract.getStakedBalance(account);
  }

  async getTotalStaked() {
    return await this.contract.getTotalStaked();
  }
}

export default StakingClient; 