// Script to migrate API key user IDs from shortened to full UUIDs
import Redis from 'ioredis';
import chalk from 'chalk';

// Redis client setup
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Legacy mapping of shortened IDs to full UUIDs
// This is the same mapping used in userId.ts for consistency
const ID_MAPPING = {
  '87fceff2': 'abf631bc-4a56-4870-a6e8-90761d51f116', // test2 user
  'abf631bc': 'abf631bc-4a56-4870-a6e8-90761d51f116', // test2 user truncated
  'b31d67a9': 'b31d67a9-2613-4d30-844c-34e0cbfb9776', // user truncated 
  '8543eb17': '8543eb17-06c1-40e0-87dc-ba65786eea59', // user truncated
  '20ba5139': '20ba5139-ec6e-4335-b47a-9f22836924e7', // user truncated
  'f93a96a7': 'f93a96a7-1c41-4ec1-86e1-380f9f5e0813', // user truncated
};

/**
 * Migrate API key user IDs from shortened IDs to full UUIDs
 */
async function migrateApiKeyUserIds() {
  try {
    console.log(chalk.blue('Starting API key user ID migration...'));
    
    // 1. Find all existing api:keys:user:* keys
    const apiKeyUserKeys = await redisClient.keys('api:keys:user:*');
    console.log(chalk.blue(`Found ${apiKeyUserKeys.length} API key user ID associations`));
    
    // Counter for successful migrations
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // 2. Process each key
    for (const key of apiKeyUserKeys) {
      try {
        // Extract the user ID from the key
        const userId = key.replace('api:keys:user:', '');
        
        // Skip if already a full UUID (contains hyphens)
        if (userId.includes('-')) {
          console.log(chalk.green(`User ID ${userId} is already in full UUID format. Skipping.`));
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
        
        // Get the API keys associated with this user
        const apiKeys = await redisClient.smembers(key);
        if (apiKeys.length === 0) {
          console.warn(chalk.yellow(`No API keys found for user ${userId}. Skipping.`));
          skippedCount++;
          continue;
        }
        
        console.log(chalk.blue(`Migrating user ${userId} to ${fullUuid} with ${apiKeys.length} API keys`));
        
        // Create a new key with the full UUID
        const newKey = `api:keys:user:${fullUuid}`;
        
        // Check if the key with full UUID already exists
        const existingKeys = await redisClient.exists(newKey);
        if (existingKeys === 1) {
          // Add all keys from the old set to the new one
          console.log(chalk.yellow(`Key ${newKey} already exists. Adding keys to existing set.`));
          for (const apiKey of apiKeys) {
            await redisClient.sadd(newKey, apiKey);
          }
        } else {
          // For each API key, add to a set with the full UUID
          for (const apiKey of apiKeys) {
            await redisClient.sadd(newKey, apiKey);
          }
        }
        
        // Remove the old key with shortened ID
        await redisClient.del(key);
        
        console.log(chalk.green(`Successfully migrated user ${userId} to ${fullUuid} with ${apiKeys.length} API keys`));
        migratedCount++;
      } catch (error) {
        console.error(chalk.red(`Error migrating API key user ID for key ${key}:`, error));
        errorCount++;
      }
    }
    
    // Summary
    console.log(chalk.blue(`Migration complete!`));
    console.log(chalk.blue(`Total keys: ${apiKeyUserKeys.length}`));
    console.log(chalk.green(`Successfully migrated: ${migratedCount}`));
    console.log(chalk.yellow(`Skipped: ${skippedCount}`));
    console.log(chalk.red(`Errors: ${errorCount}`));
    
    // Post-migration verification
    if (migratedCount > 0) {
      console.log(chalk.blue(`Verifying migration results...`));
      
      // Check for any remaining shortened IDs
      const remainingShortIds = await redisClient.keys('api:keys:user:*');
      const nonUuidKeys = remainingShortIds.filter(key => !key.replace('api:keys:user:', '').includes('-'));
      
      if (nonUuidKeys.length > 0) {
        console.warn(chalk.yellow(`WARNING: Found ${nonUuidKeys.length} keys still using shortened IDs:`));
        console.warn(chalk.yellow(nonUuidKeys.join(', ')));
        console.warn(chalk.yellow(`You may need to manually migrate these keys.`));
      } else {
        console.log(chalk.green(`Verification successful! All API key user IDs now use full UUIDs.`));
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
migrateApiKeyUserIds(); 