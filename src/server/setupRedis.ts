
import { createClient } from 'redis';
import * as Redis from 'ioredis';
import chalk from 'chalk';

export async function checkRedisConnection(): Promise<boolean> {
  try {
    // Check if Upstash credentials are provided
    const upstashDomain = process.env.UPSTASH_REST_API_DOMAIN;
    const upstashToken = process.env.UPSTASH_REST_API_TOKEN;
    const useUpstash = upstashDomain && upstashToken;
    
    if (useUpstash) {
      console.log(chalk.blue(`[REDIS] Checking connection to Upstash Redis at ${upstashDomain}`));
      
      try {
        // Connect to Upstash Redis
        const upstashUrl = `rediss://default:${upstashToken}@${upstashDomain}:6379`;
        const client = new Redis.default(upstashUrl);
        
        // Test connection by setting and getting a key
        await client.set('test-connection', 'success');
        const testResult = await client.get('test-connection');
        
        if (testResult === 'success') {
          console.log(chalk.green('[REDIS] ✓ Successfully connected to Upstash Redis'));
          
          // Cleanup test key
          await client.del('test-connection');
          
          // Disconnect from test client
          await client.quit();
          
          return true;
        } else {
          console.error(chalk.red('[REDIS] × Upstash test operation failed'));
          await client.quit();
          return false;
        }
      } catch (error) {
        console.error(chalk.red(`[REDIS] Upstash connection test failed: ${error instanceof Error ? error.message : String(error)}`));
        return false;
      }
    } else {
      // Try local Redis
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      console.log(chalk.blue(`[REDIS] Checking connection to local Redis at ${redisUrl}`));
      
      // Try to connect with a timeout
      const connectWithTimeout = async () => {
        try {
          // Create a temporary client just for testing connectivity
          const client = createClient({ 
            url: redisUrl,
            socket: {
              connectTimeout: 3000, // 3 seconds timeout
              reconnectStrategy: false // Don't reconnect automatically
            }
          });
          
          // Add error handler
          client.on('error', (err) => {
            console.error(chalk.red(`[REDIS] Connection error: ${err.message}`));
          });
          
          // Attempt to connect with timeout
          await Promise.race([
            client.connect(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 3000))
          ]);
          
          // Test connection by setting and getting a key
          await client.set('test-connection', 'success');
          const testResult = await client.get('test-connection');
          
          if (testResult === 'success') {
            console.log(chalk.green('[REDIS] ✓ Successfully connected to Redis'));
            
            // Cleanup test key
            await client.del('test-connection');
            
            // Disconnect from test client
            await client.disconnect();
            
            return true;
          } else {
            console.error(chalk.red('[REDIS] × Test operation failed'));
            await client.disconnect();
            return false;
          }
        } catch (error) {
          console.error(chalk.red(`[REDIS] Connection test failed: ${error instanceof Error ? error.message : String(error)}`));
          return false;
        }
      };
      
      // Test the connection
      return await connectWithTimeout();
    }
  } catch (error) {
    console.error(chalk.red(`[REDIS] Connection setup failed: ${error instanceof Error ? error.message : String(error)}`));
    
    // Show helpful message for setting up Redis
    console.log(chalk.yellow('\n================================'));
    console.log(chalk.yellow('Redis Connection Failed - Continuing Without Redis'));
    console.log(chalk.yellow('================================'));
    console.log(chalk.white('\nTo use the application with Redis, you need to:'));
    console.log(chalk.white('\n1. Install Redis:'));
    console.log(chalk.gray('   • macOS: brew install redis'));
    console.log(chalk.gray('   • Ubuntu: sudo apt install redis-server'));
    console.log(chalk.gray('   • Windows: https://redis.io/download'));
    
    console.log(chalk.white('\n2. Start Redis server:'));
    console.log(chalk.gray('   • macOS/Linux: redis-server'));
    console.log(chalk.gray('   • Windows: start the Redis service'));
    
    console.log(chalk.white('\n3. Alternative: Use Docker:'));
    console.log(chalk.gray('   docker run -d -p 6379:6379 --name redis redis:alpine'));
    
    console.log(chalk.yellow('\nThe application will fall back to in-memory storage for now.\n'));
    
    return false;
  }
}
