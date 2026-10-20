# Development decisions

## 2026-10-20: MVP implementation baseline

- Use one React, Vite, and TypeScript single-page application.
- Use one TypeScript Cloud Functions v2 package.
- Use Firebase callable functions for all domain writes.
- Let verified clients read only the minimum Firestore data needed by the UI.
- Use the `demo-rewife` project alias for all local emulator work.
- Use client-side catalog filtering for the first ten-user pilot. Fetch at most 50 recent available items.
- Use accessible system fonts and a small custom design system. Branding can be refined after the pilot.
- Store only public display names in Firestore. Retrieve exchange email addresses from Firebase Authentication through a protected callable function.
- Do not deploy automatically. Production releases remain an explicit administrator action.
