import { API_BASE_URL } from '@/lib/constants';
import { getAuthToken } from '@/lib/auth';

// Storage key for caching staking status
const STAKING_STATUS_KEY = 'staking:status';

/**
 * Get current user's staking status across all pools
 */
export async function getUserStakingStatus() {
  try {
    const token = getAuthToken();
    
    if (!token) {
      console.error('[STAKING_SERVICE] Authentication token not found');
      throw new Error('Authentication token not found');
    }
    
    console.log('[STAKING_SERVICE] Fetching staking status from API');
    const response = await fetch(`${API_BASE_URL}/api/v1/app/staking/check-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('[STAKING_SERVICE] API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to get staking status');
    }
    
    const data = await response.json();
    console.log('[STAKING_SERVICE] Received staking status:', data);
    
    // Cache the result
    localStorage.setItem(STAKING_STATUS_KEY, JSON.stringify(data));
    
    return data;
  } catch (error) {
    console.error('[STAKING_SERVICE] Error getting staking status:', error);
    
    // Try to get cached status if API call fails
    const cachedStatus = localStorage.getItem(STAKING_STATUS_KEY);
    if (cachedStatus) {
      console.log('[STAKING_SERVICE] Using cached staking status');
      return JSON.parse(cachedStatus);
    }
    
    throw error;
  }
}

/**
 * Check if user has minimum stake required to access features
 */
export async function hasMinimumStake() {
  try {
    // Get staking status from API
    const stakeStatus = await getUserStakingStatus();
    
    // Check if user has minimum stake in any pool
    const hasStake = stakeStatus.data?.pools?.some(pool => pool.hasMinimumStake === true) || false;
    console.log('[STAKING_SERVICE] User has minimum stake:', hasStake);
    return hasStake;
  } catch (error) {
    console.error('[STAKING_SERVICE] Error checking minimum stake:', error);
    // Default to false (no stake) for safety
    return false;
  }
} 