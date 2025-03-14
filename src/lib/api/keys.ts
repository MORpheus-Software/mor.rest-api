
import { v4 as uuidv4 } from 'uuid';
import { createRedisClient } from '../redis-adapter.js';
import { API_KEY_PREFIX, USER_KEYS_PREFIX } from './constants.js';

// Redis client
let redisClient: any = null;

// Initialize Redis client
async function getRedisClient() {
  if (!redisClient) {
    redisClient = await createRedisClient();
  }
  return redisClient;
}

export interface ApiKeyInfo {
  key: string;
  userId: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
}

/**
 * Check if any API keys exist in the system
 */
export async function hasAnyApiKeys(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    
    // Check if there are any keys with the API_KEY_PREFIX
    const apiKeys = await client.keys(`${API_KEY_PREFIX}*`);
    
    // Filter out key metadata (entries with :info suffix)
    const actualKeys = apiKeys.filter((key: string) => !key.endsWith(':info'));
    console.log('[API-KEYS] Found existing keys:', actualKeys.length > 0);
    
    return actualKeys.length > 0;
  } catch (error) {
    console.error('[API-KEYS] Error checking if any keys exist:', error);
    // In case of Redis error, always return false to allow creating the first key
    return false;
  }
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(userId: string, name: string): Promise<ApiKeyInfo> {
  // Generate a new unique API key with 'sk-' prefix
  const key = `sk-${uuidv4().replace(/-/g, '')}`;
  const now = new Date().toISOString();
  
  // API key info
  const keyInfo: ApiKeyInfo = {
    key,
    userId,
    name,
    createdAt: now
  };
  
  const client = await getRedisClient();
  
  // Store the API key in Redis
  // 1. Map the API key to the user ID
  await client.set(`${API_KEY_PREFIX}${key}`, userId);
  
  // 2. Add the API key to the user's set of keys
  await client.sadd(`${USER_KEYS_PREFIX}${userId}`, key);
  
  // 3. Store the key metadata
  await client.set(`${API_KEY_PREFIX}${key}:info`, JSON.stringify(keyInfo));
  
  console.log(`[API-KEYS] Created API key: ${key.substring(0, 8)}... for user: ${userId}`);
  
  return keyInfo;
}

/**
 * Get all API keys for a user
 */
export async function getUserApiKeys(userId: string): Promise<ApiKeyInfo[]> {
  const client = await getRedisClient();
  
  // Get the set of API keys for the user
  const userKeys = await client.smembers(`${USER_KEYS_PREFIX}${userId}`);
  
  // Get the info for each key
  const keyInfos: ApiKeyInfo[] = [];
  
  for (const key of userKeys) {
    const infoJson = await client.get(`${API_KEY_PREFIX}${key}:info`);
    
    if (infoJson) {
      try {
        const info = JSON.parse(infoJson) as ApiKeyInfo;
        keyInfos.push(info);
      } catch (error) {
        console.error(`[API-KEYS] Error parsing key info for ${key}:`, error);
      }
    }
  }
  
  console.log(`[API-KEYS] Retrieved ${keyInfos.length} keys for user: ${userId}`);
  
  return keyInfos;
}

/**
 * Update the last used timestamp for an API key
 */
export async function updateKeyLastUsed(key: string): Promise<void> {
  const client = await getRedisClient();
  
  // Get the info for the key
  const infoJson = await client.get(`${API_KEY_PREFIX}${key}:info`);
  
  if (infoJson) {
    try {
      const info = JSON.parse(infoJson) as ApiKeyInfo;
      
      // Update the last used timestamp
      info.lastUsedAt = new Date().toISOString();
      
      // Save the updated info
      await client.set(`${API_KEY_PREFIX}${key}:info`, JSON.stringify(info));
      
      console.log(`[API-KEYS] Updated last used timestamp for key: ${key.substring(0, 8)}...`);
    } catch (error) {
      console.error(`[API-KEYS] Error updating last used timestamp for ${key}:`, error);
    }
  }
}

/**
 * Delete an API key
 */
export async function deleteApiKey(key: string): Promise<boolean> {
  const client = await getRedisClient();
  
  // Get the user ID for the key
  const userId = await client.get(`${API_KEY_PREFIX}${key}`);
  
  if (!userId) {
    console.log(`[API-KEYS] Key not found: ${key.substring(0, 8)}...`);
    return false;
  }
  
  // Delete the key from Redis
  // 1. Delete the mapping from key to user ID
  await client.del(`${API_KEY_PREFIX}${key}`);
  
  // 2. Remove the key from the user's set of keys
  await client.srem(`${USER_KEYS_PREFIX}${userId}`, key);
  
  // 3. Delete the key metadata
  await client.del(`${API_KEY_PREFIX}${key}:info`);
  
  console.log(`[API-KEYS] Deleted key: ${key.substring(0, 8)}... for user: ${userId}`);
  
  return true;
}

/**
 * Validate an API key
 */
export async function validateApiKey(key: string): Promise<string | null> {
  const client = await getRedisClient();
  
  // Get the user ID for the key
  const userId = await client.get(`${API_KEY_PREFIX}${key}`);
  
  if (!userId) {
    console.log(`[API-KEYS] Invalid key: ${key.substring(0, 8)}...`);
    return null;
  }
  
  // Update the last used timestamp
  await updateKeyLastUsed(key);
  
  console.log(`[API-KEYS] Validated key: ${key.substring(0, 8)}... for user: ${userId}`);
  
  return userId;
}
