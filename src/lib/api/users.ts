import { v4 as uuidv4 } from 'uuid';
import { set, get, del, exists, sadd, srem, smembers } from '../redis-adapter.js';
import { USER_PREFIX, USER_EMAIL_INDEX, ALL_USERS_SET } from './constants.ts';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string; // Store password hash, not the actual password
  createdAt: string;
  updatedAt?: string;
  avatar?: string | null;
}

/**
 * Create a new user in the database
 */
export async function createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  // Generate a unique user ID
  const userId = uuidv4();
  const now = new Date().toISOString();
  
  // Create user object
  const user: User = {
    id: userId,
    ...userData,
    createdAt: now
  };
  
  // Store user data by ID
  await set(`${USER_PREFIX}${userId}`, JSON.stringify(user));
  
  // Add user ID to the index by email for lookup
  await set(`${USER_EMAIL_INDEX}${user.email.toLowerCase()}`, userId);
  
  // Add user to the set of all users
  await sadd(ALL_USERS_SET, userId);
  
  console.log(`[USERS] Created user: ${userId} (${user.email})`);
  
  return user;
}

/**
 * Get a user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const userData = await get(`${USER_PREFIX}${userId}`);
  
  if (!userData) {
    console.log(`[USERS] User not found: ${userId}`);
    return null;
  }
  
  try {
    const user = JSON.parse(userData) as User;
    return user;
  } catch (error) {
    console.error(`[USERS] Error parsing user data for ${userId}:`, error);
    return null;
  }
}

/**
 * Get a user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const userId = await get(`${USER_EMAIL_INDEX}${email.toLowerCase()}`);
  
  if (!userId) {
    console.log(`[USERS] No user found with email: ${email}`);
    return null;
  }
  
  return getUserById(userId);
}

/**
 * Update a user's information
 */
export async function updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
  const existingUser = await getUserById(userId);
  
  if (!existingUser) {
    console.log(`[USERS] Cannot update non-existent user: ${userId}`);
    return null;
  }
  
  const updatedUser: User = {
    ...existingUser,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  // If email is being updated, update the email index
  if (updates.email && updates.email !== existingUser.email) {
    // Remove old email index
    await del(`${USER_EMAIL_INDEX}${existingUser.email.toLowerCase()}`);
    
    // Add new email index
    await set(`${USER_EMAIL_INDEX}${updates.email.toLowerCase()}`, userId);
  }
  
  // Update user data
  await set(`${USER_PREFIX}${userId}`, JSON.stringify(updatedUser));
  
  console.log(`[USERS] Updated user: ${userId}`);
  
  return updatedUser;
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string): Promise<boolean> {
  const user = await getUserById(userId);
  
  if (!user) {
    console.log(`[USERS] Cannot delete non-existent user: ${userId}`);
    return false;
  }
  
  // Remove user from email index
  await del(`${USER_EMAIL_INDEX}${user.email.toLowerCase()}`);
  
  // Remove user data
  await del(`${USER_PREFIX}${userId}`);
  
  // Remove user from all users set
  await srem(ALL_USERS_SET, userId);
  
  console.log(`[USERS] Deleted user: ${userId}`);
  
  return true;
}

/**
 * Authenticate a user with email and password
 * In a real app, this would validate password hashes
 */
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  // For demo purposes, we're using a simple authentication process
  // In a production app, you would:
  // 1. Get the user by email
  // 2. Hash the provided password with the same algorithm used during registration
  // 3. Compare the hashes to validate
  
  const user = await getUserByEmail(email);
  
  if (!user) {
    console.log(`[USERS] Authentication failed: User not found for email ${email}`);
    return null;
  }
  
  // In a real app, compare password hashes
  // For demo, we'll accept any password
  
  console.log(`[USERS] User authenticated: ${user.id} (${user.email})`);
  
  return user;
}

/**
 * Get all users (with pagination)
 */
export async function getAllUsers(limit: number = 100, offset: number = 0): Promise<User[]> {
  try {
    const userIds = await smembers(ALL_USERS_SET);
    const paginatedIds = userIds.slice(offset, offset + limit);
    
    const users: User[] = [];
    for (const userId of paginatedIds) {
      const user = await getUserById(userId);
      if (user) {
        users.push(user);
      }
    }
    
    console.log(`[USERS] Retrieved ${users.length} users`);
    
    return users;
  } catch (error) {
    console.error('[USERS] Error retrieving all users:', error);
    return [];
  }
} 