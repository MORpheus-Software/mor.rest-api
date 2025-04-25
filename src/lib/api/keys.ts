import { nanoid } from 'nanoid';
import chalk from 'chalk';
import * as redis from '../redis-adapter.js';
import { API_KEY_PREFIX, API_KEY_SET, USER_KEYS_PREFIX } from './constants.js';

// Interface for API key
export interface ApiKeyInfo {
  id: string;
  key: string;
  userId: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
}

// Global Redis client
let redisClient: any = null;

// Get Redis client (reuse existing client if available)
async function getRedisClient() {
  if (!redisClient) {
    redisClient = await redis.createRedisClient();
  }
  return redisClient;
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(userId: string, name: string = 'Default Key'): Promise<ApiKeyInfo> {
  try {
    console.log(chalk.blue(`[API_KEYS] Creating new API key for user ${userId} with name "${name}"`));
    
    // Initialize Redis client
    const client = await getRedisClient();
    
    // Generate a unique API key
    const keyId = nanoid(10);
    const apiKey = `sk-${nanoid(32)}`;
    
    // Create API key object
    const apiKeyObj: ApiKeyInfo = {
      id: keyId,
      key: apiKey,
      userId,
      name,
      createdAt: new Date().toISOString(),
    };
    
    // Store API key object in Redis
    const apiKeyJson = JSON.stringify(apiKeyObj);
    const redisKey = `${API_KEY_PREFIX}${keyId}`;
    
    console.log(chalk.blue(`[API_KEYS] Storing key with ID ${keyId} at Redis key: ${redisKey}`));
    console.log(chalk.blue(`[API_KEYS] Key value format check: length=${apiKey.length}, prefix=${apiKey.substring(0, 3)}`));
    
    // Critical operations - use transaction to ensure atomicity
    const pipeline = client.pipeline();
    
    // Store key details
    pipeline.set(redisKey, apiKeyJson);
    
    // Add key to global key set
    pipeline.sadd(API_KEY_SET, keyId);
    
    // Add key to user's key set
    pipeline.sadd(`${USER_KEYS_PREFIX}${userId}`, keyId);
    
    // Store a reference from the actual API key to its ID for faster lookups
    pipeline.set(`${API_KEY_PREFIX}lookup:${apiKey}`, keyId);
    
    // Execute pipeline
    await pipeline.exec();
    
    console.log(chalk.green(`[API_KEYS] Successfully created and stored API key ${keyId} for user ${userId}`));
    
    // Double-check that the key is set before returning
    if (!apiKeyObj.key) {
      console.error(chalk.red(`[API_KEYS] Critical error: Key property is missing from apiKeyObj`));
      // Set an emergency fallback key (for development only)
      apiKeyObj.key = `sk-${nanoid(32)}`;
      console.log(chalk.yellow(`[API_KEYS] Set emergency fallback key: ${apiKeyObj.key.substring(0, 8)}...`));
    }
    
    return apiKeyObj;
  } catch (error) {
    console.error(chalk.red(`[API_KEYS] Failed to create API key for user ${userId}:`), error);
    throw new Error(`Failed to create API key: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get API key by key ID
 */
export async function getApiKeyById(keyId: string): Promise<ApiKeyInfo | null> {
  try {
    console.log(chalk.blue(`[API_KEYS] Retrieving API key with ID ${keyId}`));
    
    // Initialize Redis client
    const client = await getRedisClient();
    
    // Get API key from Redis
    const redisKey = `${API_KEY_PREFIX}${keyId}`;
    const apiKeyJson = await redis.get(client, redisKey);
    
    if (!apiKeyJson) {
      console.log(chalk.yellow(`[API_KEYS] API key with ID ${keyId} not found`));
      return null;
    }
    
    // Parse API key
    const apiKey = JSON.parse(apiKeyJson) as ApiKeyInfo;
    console.log(chalk.green(`[API_KEYS] Retrieved API key for user ${apiKey.userId}`));
    
    return apiKey;
  } catch (error) {
    console.error(chalk.red(`[API_KEYS] Failed to retrieve API key with ID ${keyId}:`), error);
    throw new Error(`Failed to retrieve API key: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate API key
 */
export async function validateApiKey(apiKey: string): Promise<ApiKeyInfo | null> {
  try {
    if (!apiKey) {
      console.log(chalk.yellow(`[API_KEYS] Missing API key`));
      return null;
    }
    
    if (!apiKey.startsWith('sk-')) {
      console.log(chalk.yellow(`[API_KEYS] Invalid API key format - does not start with 'sk-': ${apiKey.substring(0, 10)}...`));
      return null;
    }
    
    if (apiKey.length < 35) {
      // sk- (3 chars) + 32 char nanoid = minimum 35 chars
      console.log(chalk.yellow(`[API_KEYS] Invalid API key length: ${apiKey.length} chars (expected ≥35)`));
      return null;
    }
    
    console.log(chalk.blue(`[API_KEYS] Validating API key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 3)}`));
    
    // Initialize Redis client
    const client = await getRedisClient();
    
    // First try the direct lookup (more efficient)
    const keyId = await redis.get(client, `${API_KEY_PREFIX}lookup:${apiKey}`);
    
    if (keyId) {
      console.log(chalk.blue(`[API_KEYS] Found key ID ${keyId} for API key`));
      
      // Get the key details
      const redisKey = `${API_KEY_PREFIX}${keyId}`;
      const apiKeyJson = await redis.get(client, redisKey);
      
      if (apiKeyJson) {
        try {
          const keyObj = JSON.parse(apiKeyJson) as ApiKeyInfo;
          
          console.log(chalk.green(`[API_KEYS] Validated API key for user ${keyObj.userId}`));
          
          // Update last used timestamp
          keyObj.lastUsedAt = new Date().toISOString();
          await redis.set(client, redisKey, JSON.stringify(keyObj));
          
          return keyObj;
        } catch (parseError) {
          console.error(chalk.red(`[API_KEYS] Failed to parse API key JSON for ID ${keyId}:`), parseError);
        }
      }
    }
    
    // Fall back to scanning all keys (slower)
    console.log(chalk.yellow(`[API_KEYS] Direct lookup failed, scanning all API keys`));
    
    // Get all API keys
    const keyIds = await redis.smembers(client, API_KEY_SET);
    
    if (!keyIds || keyIds.length === 0) {
      console.log(chalk.yellow('[API_KEYS] No API keys found in the system'));
      return null;
    }
    
    console.log(chalk.blue(`[API_KEYS] Found ${keyIds.length} keys in the system, checking for a match`));
    
    // Retrieve and validate all keys
    for (const keyId of keyIds) {
      const redisKey = `${API_KEY_PREFIX}${keyId}`;
      const apiKeyJson = await redis.get(client, redisKey);
      
      if (!apiKeyJson) {
        console.log(chalk.yellow(`[API_KEYS] API key data missing for ID ${keyId}`));
        continue;
      }
      
      try {
        const keyObj = JSON.parse(apiKeyJson) as ApiKeyInfo;
        
        // Log actual key format from database for debugging
        const storedKey = keyObj.key || '';
        const submittedKey = apiKey;
        const doKeysMatch = storedKey === submittedKey;
        
        console.log(chalk.blue(`[API_KEYS] Key comparison for ID ${keyId}:`));
        console.log(chalk.blue(`[API_KEYS] - Stored key format:    ${storedKey.substring(0, 5)}...${storedKey.substring(storedKey.length - 3) || ''} (${storedKey.length} chars)`));
        console.log(chalk.blue(`[API_KEYS] - Submitted key format: ${submittedKey.substring(0, 5)}...${submittedKey.substring(submittedKey.length - 3)} (${submittedKey.length} chars)`));
        console.log(chalk.blue(`[API_KEYS] - Keys match: ${doKeysMatch}`));
        
        if (doKeysMatch) {
          console.log(chalk.green(`[API_KEYS] Found matching API key for user ${keyObj.userId}`));
          
          // Update last used timestamp
          keyObj.lastUsedAt = new Date().toISOString();
          await redis.set(client, redisKey, JSON.stringify(keyObj));
          
          // Store the lookup for next time
          await redis.set(client, `${API_KEY_PREFIX}lookup:${apiKey}`, keyId);
          
          return keyObj;
        }
      } catch (parseError) {
        console.error(chalk.red(`[API_KEYS] Failed to parse API key JSON for ID ${keyId}:`), parseError);
      }
    }
    
    console.log(chalk.yellow(`[API_KEYS] No matching API key found`));
    return null;
  } catch (error) {
    console.error(chalk.red(`[API_KEYS] Failed to validate API key:`), error);
    throw new Error(`Failed to validate API key: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete API key
 */
export async function deleteApiKey(keyId: string, userId: string): Promise<boolean> {
  try {
    console.log(chalk.blue(`[API_KEYS] Deleting API key ${keyId} for user ${userId}`));
    
    // Initialize Redis client
    const client = await getRedisClient();
    
    // Get API key from Redis
    const redisKey = `${API_KEY_PREFIX}${keyId}`;
    const apiKeyJson = await redis.get(client, redisKey);
    
    if (!apiKeyJson) {
      console.log(chalk.yellow(`[API_KEYS] API key with ID ${keyId} not found`));
      return false;
    }
    
    // Parse API key
    const apiKey = JSON.parse(apiKeyJson) as ApiKeyInfo;
    
    // Verify ownership
    if (apiKey.userId !== userId) {
      console.log(chalk.yellow(`[API_KEYS] User ${userId} is not the owner of API key ${keyId}`));
      return false;
    }
    
    // Delete API key - use transaction to ensure atomicity
    const pipeline = client.pipeline();
    
    // Remove the lookup entry
    pipeline.del(`${API_KEY_PREFIX}lookup:${apiKey.key}`);
    
    // Remove key details
    pipeline.del(redisKey);
    
    // Remove key from global key set
    pipeline.srem(API_KEY_SET, keyId);
    
    // Remove key from user's key set
    pipeline.srem(`${USER_KEYS_PREFIX}${userId}`, keyId);
    
    // Execute pipeline
    await pipeline.exec();
    
    console.log(chalk.green(`[API_KEYS] Successfully deleted API key ${keyId} for user ${userId}`));
    
    return true;
  } catch (error) {
    console.error(chalk.red(`[API_KEYS] Failed to delete API key ${keyId}:`), error);
    throw new Error(`Failed to delete API key: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get all API keys for a user
 */
export async function getApiKeysForUser(userId: string): Promise<ApiKeyInfo[]> {
  try {
    console.log(chalk.blue(`[API_KEYS] Retrieving all API keys for user ${userId}`));
    
    // Initialize Redis client
    const client = await getRedisClient();
    
    // Get user's key IDs
    const userKeyIds = await redis.smembers(client, `${USER_KEYS_PREFIX}${userId}`);
    
    if (!userKeyIds || userKeyIds.length === 0) {
      console.log(chalk.yellow(`[API_KEYS] No API keys found for user ${userId}`));
      return [];
    }
    
    console.log(chalk.blue(`[API_KEYS] Found ${userKeyIds.length} keys for user ${userId}`));
    
    // Retrieve key details
    const apiKeys: ApiKeyInfo[] = [];
    
    for (const keyId of userKeyIds) {
      const redisKey = `${API_KEY_PREFIX}${keyId}`;
      const apiKeyJson = await redis.get(client, redisKey);
      
      if (!apiKeyJson) {
        console.log(chalk.yellow(`[API_KEYS] API key data missing for ID ${keyId}`));
        continue;
      }
      
      try {
        const keyObj = JSON.parse(apiKeyJson) as ApiKeyInfo;
        apiKeys.push(keyObj);
      } catch (parseError) {
        console.error(chalk.red(`[API_KEYS] Failed to parse API key JSON for ID ${keyId}:`), parseError);
      }
    }
    
    console.log(chalk.green(`[API_KEYS] Successfully retrieved ${apiKeys.length} API keys for user ${userId}`));
    
    return apiKeys;
  } catch (error) {
    console.error(chalk.red(`[API_KEYS] Failed to retrieve API keys for user ${userId}:`), error);
    throw new Error(`Failed to retrieve API keys: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if a user has any API keys
 */
export async function userHasApiKeys(userId: string): Promise<boolean> {
  try {
    console.log(chalk.blue(`[API_KEYS] Checking if user ${userId} has API keys`));
    
    // Initialize Redis client
    const client = await getRedisClient();
    
    // Get user's key IDs
    const userKeyIds = await redis.smembers(client, `${USER_KEYS_PREFIX}${userId}`);
    
    const hasKeys = userKeyIds && userKeyIds.length > 0;
    console.log(chalk.green(`[API_KEYS] User ${userId} has API keys: ${hasKeys}`));
    
    return hasKeys;
  } catch (error) {
    console.error(chalk.red(`[API_KEYS] Failed to check if user ${userId} has API keys:`), error);
    throw new Error(`Failed to check if user has API keys: ${error instanceof Error ? error.message : String(error)}`);
  }
}
