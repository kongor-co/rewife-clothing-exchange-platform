# MVP test plan

The first release is tested against the Firebase Emulator Suite using fictitious users and garments.

## Required automated checks

- TypeScript compilation for the web and Functions packages.
- Unit tests for input validation and domain state transitions.
- Firestore Rules tests for anonymous, unverified, owner, participant, and unrelated-user access.
- Storage Rules tests for image ownership, MIME type, size, and path restrictions.
- Transaction tests for onboarding, concurrent claims, cancellation, completion, and idempotent retries.

## Required manual flow

1. Create and verify two emulator users.
2. Complete onboarding for both users.
3. Create and publish a garment with an image.
4. Claim it from the second account.
5. Accept the exchange and reveal contacts.
6. Confirm receipt and verify both balances.
7. Repeat with rejection and dispute flows.
