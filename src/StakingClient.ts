import { ethers } from "ethers";

const STAKING_CONTRACT_ADDRESS = import.meta.env.VITE_STAKING_CONTRACT_ADDRESS || "0x7396F26DdEE748D3cE166852Ef56E24cdA25CBD4";
const STAKING_CONTRACT_ABI = [
    "function stake(uint256 amount) external",
    "function unstake(uint256 amount) external",
    "function getStakedAmount(address account) external view returns (uint256)",
    "function claimReward() external",
    "function stakedBalance(address account) external view returns (uint256)"
];

export class StakingClient {
    provider: ethers.JsonRpcProvider;
    signer: ethers.Signer;
    contract: ethers.Contract;

    constructor(provider: ethers.JsonRpcProvider, signer: ethers.Signer) {
        this.provider = provider;
        this.signer = signer;
        this.contract = new ethers.Contract(STAKING_CONTRACT_ADDRESS, STAKING_CONTRACT_ABI, signer);
    }

    async stake(amount: string) {
        // Create contract with signer
        try {
            const tx = await this.contract.stake(ethers.parseEther(amount));
            return tx.wait();
        } catch (error) {
            console.error("Error in stake:", error);
            throw error;
        }
    }

    async unstake(amount: string) {
        try {
            const tx = await this.contract.unstake(ethers.parseEther(amount));
            return tx.wait();
        } catch (error) {
            console.error("Error in unstake:", error);
            throw error;
        }
    }

    async getStakedAmount(address: string) {
        try {
            const amount = await this.contract.getStakedAmount(address);
            return ethers.formatEther(amount);
        } catch (error) {
            console.error("Error in getStakedAmount:", error);
            return "0";
        }
    }

    async getStakedBalance(address: string) {
        try {
            const amount = await this.contract.stakedBalance(address);
            return ethers.formatEther(amount);
        } catch (error) {
            console.error("Error in getStakedBalance:", error);
            return "0";
        }
    }

    async claimReward() {
        try {
            const tx = await this.contract.claimReward();
            return tx.wait();
        } catch (error) {
            console.error("Error in claimReward:", error);
            throw error;
        }
    }
} 