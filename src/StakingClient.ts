import { ethers, Provider, Signer } from "ethers";

const STAKING_CONTRACT_ADDRESS = "0xYourStakingContractAddressHere";
const STAKING_CONTRACT_ABI = [
    // Replace with the actual staking contract ABI
    "function stake(uint256 amount) external",
    "function unstake(uint256 amount) external",
    "function getStakedAmount(address account) external view returns (uint256)",
    "function claimReward() external"
];

export class StakingClient {
    provider: Provider;
    signer: Signer;
    contract: ethers.Contract;

    constructor(provider: Provider, signer: Signer) {
        this.provider = provider;
        this.signer = signer;
        this.contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, signer);
    }

    async stake(amount: string) {
        const tx = await this.contract.stake(ethers.parseEther(amount));
        return tx.wait();
    }

    async unstake(amount: string) {
        const tx = await this.contract.unstake(ethers.parseEther(amount));
        return tx.wait();
    }

    async getStakedAmount(address: string) {
        return this.contract.getStakedAmount(address);
    }

    async claimReward() {
        const tx = await this.contract.claimReward();
        return tx.wait();
    }
} 