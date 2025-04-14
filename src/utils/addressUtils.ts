/**
 * Ethereum address utilities for validation and formatting
 */

import { ethers } from 'ethers';

/**
 * Converts a lowercase Ethereum address to its checksum representation
 * @param address An Ethereum address (can be case-insensitive)
 * @returns The checksummed Ethereum address
 * @throws If the address is invalid
 */
export function getChecksumAddress(address: string): string {
  try {
    if (!address) {
      throw new Error("Address cannot be empty");
    }
    
    // Ensure address has 0x prefix
    if (!address.startsWith('0x')) {
      address = '0x' + address;
    }
    
    // Apply checksum using ethers.js
    return ethers.utils.getAddress(address);
  } catch (error) {
    console.error(`Invalid Ethereum address: ${address}`);
    throw error;
  }
}

/**
 * Checks if a string is a valid Ethereum address
 * @param address The address to check
 * @returns True if the address is valid, false otherwise
 */
export function isValidAddress(address: string): boolean {
  try {
    getChecksumAddress(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns a shortened version of an Ethereum address for display purposes
 * @param address The full Ethereum address
 * @param prefixLength Number of characters to show at the beginning (default: 6)
 * @param suffixLength Number of characters to show at the end (default: 4)
 * @returns The shortened address (e.g., "0x1234...5678")
 */
export function shortenAddress(address: string, prefixLength = 6, suffixLength = 4): string {
  try {
    const checksumAddress = getChecksumAddress(address);
    return `${checksumAddress.substring(0, prefixLength)}...${checksumAddress.substring(checksumAddress.length - suffixLength)}`;
  } catch {
    return 'Invalid Address';
  }
}

/**
 * Compares two Ethereum addresses for equality (case-insensitive)
 * @param address1 First address
 * @param address2 Second address
 * @returns True if the addresses are the same (regardless of case), false otherwise
 */
export function addressesEqual(address1: string, address2: string): boolean {
  try {
    return getChecksumAddress(address1) === getChecksumAddress(address2);
  } catch {
    return false;
  }
} 