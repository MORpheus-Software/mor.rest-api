# UUID Standards for User Identification

## Overview

This document outlines the standards for using UUIDs (Universally Unique Identifiers) throughout the codebase to ensure consistent user identification across all systems and components.

## Requirements

1. **Always use full UUID format** for all user identifiers:
   - Format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (e.g., `abf631bc-4a56-4870-a6e8-90761d51f116`)
   - Never use shortened formats (e.g., `87fceff2`) in new code

2. **Do not create custom ID formats** or abbreviations:
   - Avoid creating new shortened ID formats
   - Do not truncate UUIDs for display purposes without clearly indicating they are truncated

3. **Use UUIDs directly in all systems**:
   - Database keys and references
   - API endpoints
   - Function parameters
   - User interfaces (with appropriate formatting)

## Background

Our application previously used inconsistent ID formats across different components:

1. **Full UUID format** (`abf631bc-4a56-4870-a6e8-90761d51f116`) in the main application
2. **Shortened format** (`87fceff2`) in test scripts and debug endpoints

This inconsistency led to problems:
- Failed wallet associations when users logged in through different systems
- Difficulty tracking users across different parts of the application
- Increased complexity with normalization logic

## Implementation Guidelines

### Database Keys

When creating Redis keys that include user IDs:

```javascript
// CORRECT
const key = `user:wallet:${userId}`; // Where userId is a full UUID

// INCORRECT
const key = `user:wallet:${userId.substring(0, 8)}`;
```

### API Endpoints

When defining API routes or handlers:

```javascript
// CORRECT
app.get('/api/users/:userId', (req, res) => {
  const userId = req.params.userId; // Full UUID
  // ...
});

// INCORRECT
function getUserByShortId(shortId) {
  // Never create functions that expect shortened IDs
}
```

### Testing

For test scripts and debugging:

```javascript
// CORRECT
const testUserId = 'abf631bc-4a56-4870-a6e8-90761d51f116'; // Full UUID for test user

// INCORRECT
const testUserId = '87fceff2'; // Shortened ID
```

## Legacy Code and Migration

We've implemented a one-time migration to convert all shortened IDs to full UUIDs in the database. 

The `normalizeUserId` function in `src/lib/utils/userId.ts` exists for backward compatibility but should eventually be phased out:

```typescript
// This function should be considered deprecated for new code
export function normalizeUserId(userId: string): string {
  // ... implementation ...
}
```

## Display Considerations

When displaying UUIDs in the UI, you may format them for readability:

```javascript
// For display purposes only
function formatUserIdForDisplay(userId) {
  return userId.substring(0, 8) + '...'; // "abf631bc..."
}
```

However, always store and transmit the full UUID in all application logic.

## Additional Resources

- [RFC 4122: UUID Specification](https://tools.ietf.org/html/rfc4122)
- [Wallet Association Migration Guide](../README-WALLET-MIGRATION.md) 