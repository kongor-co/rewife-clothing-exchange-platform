# MVP test plan

The first release is tested against the Firebase Emulator Suite using fictitious users and garments.

## Automated checks in this repository

- TypeScript compilation for the web and Functions packages.
- Unit tests for input validation, size options, navigation paths, and exchange activity rules.
- Firestore Rules tests for anonymous, unverified, owner, participant, and unrelated-user reads, plus denial of browser writes.
- Storage Rules tests for image ownership, active membership, MIME type, fixed photo slots, and cross-user denial.
- A full emulator smoke test for idempotent onboarding, draft publication, self-claim denial, idempotent claims, contact gating, acceptance, idempotent completion, balance transfer, and Hosting output.

## Release checks still requiring coverage

- Concurrent claims for one garment and simultaneous claims against one available coin.
- Claimant cancellation and contributor rejection with balance restoration.
- Dispute reporting, administrator resolution, and ledger reconciliation.
- Manual keyboard, mobile, offline, and retry-state verification in supported browsers.

## Required manual flow

1. Create and verify two emulator users.
2. Complete onboarding for both users.
3. Create and publish a garment with an image.
4. Claim it from the second account.
5. Accept the exchange and reveal contacts.
6. Confirm receipt and verify both balances.
7. Repeat with rejection and dispute flows.
