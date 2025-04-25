// Script to directly associate a wallet with the test2 user
import Redis from 'ioredis';

// Redis client setup
const redisClient = new Redis('redis://localhost:6379');

async function associateWallet() {
  try {
    // Use the full UUID directly instead of the shortened format
    const userId = 'abf631bc-4a56-4870-a6e8-90761d51f116'; // test2 user - full UUID
    const walletAddress = '0x1234567890123456789012345678901234567890'.toLowerCase();
    
    console.log(`Associating user ${userId} with wallet ${walletAddress}`);
    
    // Store the association both ways
    // 1. User to wallet (one-to-one)
    await redisClient.set(`user:wallet:${userId}`, walletAddress);
    
    // 2. Wallet to users (one-to-many using a Redis set)
    await redisClient.sadd(`wallet:users:${walletAddress}`, userId);
    
    // Verify the association
    const storedWalletAddress = await redisClient.get(`user:wallet:${userId}`);
    const walletUsers = await redisClient.smembers(`wallet:users:${walletAddress}`);
    
    console.log('Association results:');
    console.log('User wallet:', storedWalletAddress);
    console.log('Wallet users:', walletUsers);
    console.log('Success:', storedWalletAddress === walletAddress && walletUsers.includes(userId));
    
    await redisClient.quit();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    await redisClient.quit();
    process.exit(1);
  }
}

// Run the script
associateWallet(); 