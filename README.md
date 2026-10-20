# Rewife MVP

Rewife is a small clothing exchange platform for a ten-user pilot. The first version uses a React single-page application with Firebase Authentication, Firestore, Cloud Storage, Cloud Functions, and Firebase Hosting.

## Prerequisites

- Node.js 22
- npm 10 or newer
- JDK 21 or newer for the Firebase emulators
- Firebase CLI, invoked through `npx` by the project scripts

The production Firebase project is `ordinal-bucksaw-512007-p8`. Local development always uses the isolated `demo-rewife` project.

## First setup

```powershell
npm.cmd install
```

The tracked production environment file contains the public Firebase web configuration for the existing app. These values identify the app and are not service-account secrets. Local development automatically uses the isolated emulator project.

## Local development

Start Firebase emulators in one terminal:

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
npm.cmd run emulators
```

Start Vite in another terminal:

```powershell
npm.cmd run dev
```

Open `http://localhost:5173`. The client automatically connects to the local Auth, Firestore, Functions, and Storage emulators while running in development mode.

## Verification

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run test:rules
npm.cmd run test:smoke
npm.cmd run build
```

Run `npm.cmd run test:smoke` while the complete emulator suite is running.

## Pilot flow

1. Create an account with email and password.
2. Use the link produced by the Auth emulator to verify the email.
3. Finish onboarding and receive the welcome coin balance.
4. Upload and publish an item.
5. Use a second account to claim the item.
6. Accept the request as the owner.
7. Confirm receipt as the claimer.

Production deployment is intentionally manual for the first pilot. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the preflight and deployment sequence.

Credential handling is documented in [docs/CREDENTIALS.md](docs/CREDENTIALS.md).

## Important boundaries

- Browser clients cannot write directly to Firestore.
- All state transitions and coin changes go through callable Cloud Functions.
- Item images are owner-scoped and validated by Storage rules.
- Contact details become available only after an exchange is accepted.
- Legal pages are visible placeholders and require approved text before external testing.
