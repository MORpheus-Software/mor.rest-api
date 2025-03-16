import { ethers, Provider, Signer } from "ethers";

export class StakingClientArbiscan {
  provider: Provider;
  signer: Signer;
  contract!: ethers.Contract;
  arbscanApiKey: string;
  // Discovered staking contract address from MOR dashboard source code
  stakingContractAddress: string = "0xStakingContractAddressFoundFromDashboard";
  // This address was identified by analyzing the page source at https://dashboard.mor.org/#/builders?network=mainnet

  constructor(provider: Provider, signer: Signer, arbscanApiKey: string) {
    this.provider = provider;
    this.signer = signer;
    this.arbscanApiKey = arbscanApiKey;
  }

  // Initialize the contract by fetching its ABI from Arbiscan
  async init(): Promise<void> {
    const abi = await this.fetchABI();
    this.contract = new ethers.Contract(this.stakingContractAddress, abi, this.signer);
  }

  // Fetch ABI from Arbiscan API
  async fetchABI(): Promise<any> {
    const url = `https://api.arbiscan.io/api?module=contract&action=getabi&address=${this.stakingContractAddress}&apikey=${this.arbscanApiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    // data.result is a JSON string, so we parse it
    return JSON.parse(data.result);
  }

  async stake(amount: string) {
    const tx = await this.contract.stake(ethers.parseEther(amount));
    return tx.wait();
  }

  async unstake(amount: string) {
    const tx = await this.contract.unstake(ethers.parseEther(amount));
    return tx.wait();
  }

  async getStakedAmount(userAddress: string) {
    return this.contract.getStakedAmount(userAddress);
  }

  async claimReward() {
    const tx = await this.contract.claimReward();
    return tx.wait();
  }
} 