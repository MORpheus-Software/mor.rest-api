import { createClient } from 'redis';
import readline from 'readline';
import { ethers } from 'ethers';
import chalk from 'chalk';

// Config
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const USER_STAKE_PREFIX = 'stake:amount:';
const STAKE_TTL = 3600; // 1 hour

// Create Redis client
async function getRedisClient() {
  const client = createClient({
    url: REDIS_URL
  });
  
  await client.connect();
  return client;
}

// Get user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  try {
    console.log(chalk.blue('===== Stake Status Update Tool ====='));
    
    // Get wallet address
    const walletAddress = await new Promise<string>(resolve => {
      rl.question('Enter wallet address: ', (answer) => {
        resolve(answer.trim().toLowerCase());
      });
    });
    
    // Validate wallet address
    if (!ethers.isAddress(walletAddress)) {
      console.error(chalk.red('Invalid wallet address'));
      rl.close();
      return;
    }
    
    // Get pool ID
    const poolId = await new Promise<string>(resolve => {
      rl.question('Enter pool ID (default is mor.rest): ', (answer) => {
        if (!answer.trim()) {
          resolve(ethers.id("mor.rest"));
        } else {
          resolve(answer.trim());
        }
      });
    });
    
    // Get staking status
    const hasStake = await new Promise<boolean>(resolve => {
      rl.question('Does user have minimum stake? (y/n): ', (answer) => {
        resolve(answer.trim().toLowerCase() === 'y');
      });
    });
    
    // Connect to Redis
    console.log(chalk.blue('\nConnecting to Redis...'));
    const client = await getRedisClient();
    
    // Update stake status in Redis
    const cacheKey = `${USER_STAKE_PREFIX}${walletAddress}:${poolId}`;
    await client.set(cacheKey, hasStake ? 'true' : 'false', { EX: STAKE_TTL });
    
    // Add pool to the set of all pools
    await client.sAdd('stake:pools', poolId);
    
    console.log(chalk.green('\nStake status updated successfully!'));
    console.log(chalk.blue(`Wallet: ${walletAddress}`));
    console.log(chalk.blue(`Pool: ${poolId}`));
    console.log(chalk.blue(`Has minimum stake: ${hasStake ? 'Yes' : 'No'}`));
    console.log(chalk.blue(`Cache expires in: ${STAKE_TTL} seconds`));
    
    // Disconnect from Redis
    await client.quit();
    rl.close();
  } catch (error) {
    console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
    rl.close();
  }
}

main(); 