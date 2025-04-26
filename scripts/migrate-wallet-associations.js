// Script to migrate wallet associations from shortened IDs to full UUIDs
import Redis from 'ioredis';
import chalk from 'chalk';

// Redis client setup
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Legacy mapping of shortened IDs to full UUIDs
// IMPORTANT: This is only for one-time migration of existing data
// All new code should use full UUIDs directly and not rely on this mapping
const ID_MAPPING = {
  '87fceff2': 'abf631bc-4a56-4870-a6e8-90761d51f116', // test2 user
};

/**
 * Migrate wallet associations from shortened IDs to full UUIDs
 * 
 * This is a one-time migration script to fix inconsistencies in the database.
 * After running this script, all wallet associations should use full UUIDs.
 * New code should always use full UUIDs directly and not rely on any shortened formats.
 */
async function migrateWalletAssociations() {
  try {
    console.log(chalk.blue('Starting wallet association migration...'));
    
    // 1. Find all existing user:wallet:* keys
    const userWalletKeys = await redisClient.keys('user:wallet:*');
    console.log(chalk.blue(`Found ${userWalletKeys.length} user wallet associations`));
    
    // Counter for successful migrations
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // 2. Process each key
    for (const key of userWalletKeys) {
      try {
        // Extract the user ID from the key
        const userId = key.replace('user:wallet:', '');
        
        // Skip if already a full UUID (contains hyphens)
        if (userId.includes('-')) {
          console.log(chalk.green(`User ID ${userId} is already in full UUID format. Skipping.`));
          skippedCount++;
          continue;
        }
        
        // Get the wallet address associated with this user
        const walletAddress = await redisClient.get(key);
        if (!walletAddress) {
          console.warn(chalk.yellow(`No wallet address found for user ${userId}. Skipping.`));
          skippedCount++;
          continue;
        }
        
        // Look up the full UUID from our mapping
        const fullUuid = ID_MAPPING[userId];
        if (!fullUuid) {
          console.warn(chalk.yellow(`No mapping found for shortened user ID ${userId}. Skipping.`));
          skippedCount++;
          continue;
        }
        
        console.log(chalk.blue(`Migrating user ${userId} to ${fullUuid} with wallet ${walletAddress}`));
        
        // 3. Create the new association with the full UUID
        // 3.1 User to wallet (one-to-one)
        await redisClient.set(`user:wallet:${fullUuid}`, walletAddress);
        
        // 3.2 Add the full UUID to the wallet's users set
        await redisClient.sadd(`wallet:users:${walletAddress}`, fullUuid);
        
        // 3.3 Remove the shortened ID from the wallet's users set
        await redisClient.srem(`wallet:users:${walletAddress}`, userId);
        
        // 3.4 Check if the shortened ID is the only member of the wallet's users set
        const remainingUsers = await redisClient.smembers(`wallet:users:${walletAddress}`);
        if (remainingUsers.length === 0) {
          console.log(chalk.yellow(`Removing empty wallet users set for ${walletAddress}`));
          await redisClient.del(`wallet:users:${walletAddress}`);
        }
        
        // 4. Remove the old association
        await redisClient.del(key);
        
        console.log(chalk.green(`Successfully migrated user ${userId} to ${fullUuid}`));
        migratedCount++;
      } catch (error) {
        console.error(chalk.red(`Error migrating wallet association for key ${key}:`, error));
        errorCount++;
      }
    }
    
    // Summary
    console.log(chalk.blue(`Migration complete!`));
    console.log(chalk.blue(`Total keys: ${userWalletKeys.length}`));
    console.log(chalk.green(`Successfully migrated: ${migratedCount}`));
    console.log(chalk.yellow(`Skipped: ${skippedCount}`));
    console.log(chalk.red(`Errors: ${errorCount}`));
    
    // Post-migration verification
    if (migratedCount > 0) {
      console.log(chalk.blue(`Verifying migration results...`));
      
      // Check for any remaining shortened IDs
      const remainingShortIds = await redisClient.keys('user:wallet:*');
      const nonUuidKeys = remainingShortIds.filter(key => !key.replace('user:wallet:', '').includes('-'));
      
      if (nonUuidKeys.length > 0) {
        console.warn(chalk.yellow(`WARNING: Found ${nonUuidKeys.length} keys still using shortened IDs:`));
        console.warn(chalk.yellow(nonUuidKeys.join(', ')));
        console.warn(chalk.yellow(`You may need to manually migrate these keys.`));
      } else {
        console.log(chalk.green(`Verification successful! All user wallet associations now use full UUIDs.`));
      }
    }
    
  } catch (error) {
    console.error(chalk.red('Error during migration:', error));
  } finally {
    // Clean up Redis connection
    await redisClient.quit();
    console.log(chalk.blue('Redis connection closed'));
  }
}

// Run the migration
migrateWalletAssociations(); 