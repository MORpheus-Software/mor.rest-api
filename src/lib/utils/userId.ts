/**
 * User ID normalization utilities
 * 
 * These functions ensure consistent user ID format across the application
 * to prevent mismatches between different parts of the codebase.
 */

/**
 * Validate that a string is a valid UUID format
 * 
 * @param uuid String to validate
 * @returns boolean indicating if the string is a valid UUID
 */
export function isValidUuid(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Normalize a user ID to ensure consistent format across the application
 * 
 * This function ensures all user IDs are valid UUIDs.
 * It doesn't attempt to fix or convert incorrect formats - it will throw
 * an error if the ID is not a valid UUID.
 * 
 * @param userId User ID to validate (must be a full UUID)
 * @returns The original UUID if valid
 * @throws Error if the user ID is not a valid UUID
 */
export function normalizeUserId(userId: string): string {
  // Validate that the userId is a properly formatted UUID
  if (!isValidUuid(userId)) {
    throw new Error(`Invalid user ID format: ${userId}. User IDs must be in full UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).`);
  }
  
  return userId;
} 