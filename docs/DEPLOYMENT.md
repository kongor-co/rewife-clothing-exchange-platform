# Deployment

Development uses the Firebase Emulator Suite with the `demo-rewife` project. No production resource is required for normal coding or tests.

## Release prerequisites

- Node.js 22
- JDK 21 for emulator-backed rule tests
- A Firebase CLI login with access to `ordinal-bucksaw-512007-p8`
- A clean, committed Git working tree
- Approved privacy, terms, and imprint text before external testing

## Preflight

Run from the repository root in PowerShell:

```powershell
npm.cmd install
npm.cmd run check
npm.cmd test
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
npm.cmd run test:rules
npm.cmd run build
Select-String -Path web\dist\assets\*.js -Pattern 'demo-key'
```

The final command must produce no output. The complete exchange smoke test can also be run against the local suite with `npm.cmd run test:smoke` while the emulators are running.

## Backend release

Publish Authentication configuration, Firestore rules and indexes, Storage rules, and Cloud Functions before exposing the web client:

```powershell
npx.cmd -y firebase-tools@latest use ordinal-bucksaw-512007-p8
npx.cmd -y firebase-tools@latest deploy --only "auth,firestore,storage,functions" --project ordinal-bucksaw-512007-p8
```

## Hosting preview

Create a temporary public preview that uses the production backend:

```powershell
npx.cmd -y firebase-tools@latest hosting:channel:deploy pilot --expires 7d --project ordinal-bucksaw-512007-p8
```

Complete the two-user pilot flow on the returned preview URL before publishing the live channel.

## Live Hosting release

```powershell
npx.cmd -y firebase-tools@latest deploy --only hosting --project ordinal-bucksaw-512007-p8
```

The live URL is `https://ordinal-bucksaw-512007-p8.web.app`.

Never deploy from an unreviewed working tree. Never commit private credentials. Hosting releases can be rolled back from the Firebase console, while source changes should be restored through Git.
