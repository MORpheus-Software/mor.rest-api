import { useState, useEffect } from 'react';
import axios from 'axios';

// Base API URL 
const API_BASE_URL = '/api/v1/staking';

// Stake status types
export type StakeStatus = 'LOCKED' | 'UNLOCKED';

export interface StakeStatusData {
  userAddress: string;
  poolId: string;
  status: StakeStatus;
  isLocked: boolean;
}

export interface PoolStakeStatus {
  poolId: string;
  status: StakeStatus;
  isLocked: boolean;
}

export interface UserStakeStatusData {
  userAddress: string;
  pools: PoolStakeStatus[];
}

/**
 * Hook to fetch stake status for a specific user and pool
 * @param userAddress User's blockchain address
 * @param poolId Pool ID
 * @returns Object containing loading state, error state, and stake status data
 */
export function useStakeStatus(userAddress: string | null, poolId: string | null) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<StakeStatusData | null>(null);
  
  useEffect(() => {
    // Don't fetch if address or poolId is not available
    if (!userAddress || !poolId) {
      return;
    }
    
    const fetchStakeStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`${API_BASE_URL}/status/${userAddress}/${poolId}`);
        
        if (response.data.success) {
          setData(response.data.data);
        } else {
          throw new Error(response.data.error || 'Failed to fetch stake status');
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('An error occurred'));
        console.error('Error fetching stake status:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStakeStatus();
  }, [userAddress, poolId]);
  
  return { loading, error, data };
}

/**
 * Hook to fetch all available pools
 * @returns Object containing loading state, error state, and pools data
 */
export function useAllPools() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<string[]>([]);
  
  useEffect(() => {
    const fetchPools = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`${API_BASE_URL}/pools`);
        
        if (response.data.success) {
          setData(response.data.data.pools);
        } else {
          throw new Error(response.data.error || 'Failed to fetch pools');
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('An error occurred'));
        console.error('Error fetching pools:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPools();
  }, []);
  
  return { loading, error, data };
}

/**
 * Hook to fetch stake status for all pools for a specific user
 * @param userAddress User's blockchain address
 * @returns Object containing loading state, error state, and user stake status data
 */
export function useUserStakeStatus(userAddress: string | null) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<UserStakeStatusData | null>(null);
  
  useEffect(() => {
    // Don't fetch if address is not available
    if (!userAddress) {
      return;
    }
    
    const fetchUserStakeStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`${API_BASE_URL}/user/${userAddress}`);
        
        if (response.data.success) {
          setData(response.data.data);
        } else {
          throw new Error(response.data.error || 'Failed to fetch user stake status');
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('An error occurred'));
        console.error('Error fetching user stake status:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserStakeStatus();
  }, [userAddress]);
  
  return { loading, error, data };
} 