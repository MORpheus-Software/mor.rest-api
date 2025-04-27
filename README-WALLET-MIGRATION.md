# Wallet Association Migration Guide

## Background

We identified an issue in our application where wallet associations in Redis were inconsistently stored with different formats of user IDs:

1. **Full UUID format**: `b31d67a9-2613-4d30-844c-34e0cbfb9776` (used by the main application)
2. **Shortened format**: `87fceff2` (used by test scripts and debug endpoints)

This inconsistency caused users who connected their wallets through test scripts or debug endpoints to lose their wallet association when logging in through the main application, as the main application uses full UUIDs.

## The Fix

We've implemented a solution that ensures consistent user ID format across the application:

1. Created a user ID normalization utility (`src/lib/utils/userId.ts`)
2. Updated wallet association functions to use normalized IDs
3. Added migration code for existing associations
4. Fixed debug endpoints to use normalized IDs

## Migration Steps

1. **Run the migration script** to convert existing shortened IDs to full UUIDs:

```bash
node scripts/migrate-wallet-associations.js
```

2. **Verify migration success** by checking Redis:

```bash
# Check if any user:wallet:* keys still use shortened IDs (should be none)
redis-cli KEYS "user:wallet:*" | grep -v "-"
```

## Technical Details

### User ID Normalization

The `normalizeUserId` function in `src/lib/utils/userId.ts` ensures that all user IDs follow the full UUID format. It includes a mapping of known shortened IDs to their full UUID equivalents for backward compatibility.

### Wallet Association Functions

We've updated the following functions to use normalized user IDs:

1. `associateUserWithWallet` in `src/server/setupRedis.ts`
2. `clearUserWalletAssociation` in `src/server/setupRedis.ts`
3. `getUserWalletAddress` in `src/lib/api/staking-middleware.ts`

### Handling Legacy Code

The updated `getUserWalletAddress` function includes fallback logic to look for wallet associations with non-normalized IDs and automatically migrate them when found.

## Future Development Guidelines

To prevent similar issues in the future:

1. **Always use full UUIDs** for user IDs throughout the application
2. Use the `normalizeUserId` function when handling user IDs in any context
3. Avoid hardcoding shortened user IDs in test scripts or debug endpoints
4. If you need to add a new mapping for a shortened ID, update `src/lib/utils/userId.ts`

## Known Limitations

1. The migration only works for known ID mappings defined in the code
2. Debug endpoints that use hardcoded shortened IDs will now use the normalized versions

## Help and Support

If you encounter any issues with the wallet association fix, please contact the development team. 