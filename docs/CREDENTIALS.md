# Credentials and configuration

No private key is required in this repository for local development or manual Firebase deployment.

## Safe to commit

- `web/.env.production` contains the public Firebase web configuration.
- `web/.env.example` documents the same public client configuration.
- `.firebaserc` contains Firebase project aliases.
- `firebase.json` contains deployment and emulator configuration.

These files identify the Firebase project. They do not grant administrative access by themselves.

## Never commit

- Service-account JSON files
- Application Default Credentials files
- Firebase CLI login tokens
- OAuth authorization codes
- App Check debug tokens
- Private keys, certificates, passwords, or recovery codes
- Local environment files such as `web/.env.local`

Firebase CLI and Google Cloud CLI credentials remain in the signed-in Windows user profile. GitHub Desktop manages GitHub authentication separately. If this computer is replaced, sign in to those tools again instead of backing up or copying their tokens.

Cloud Functions run with Google-managed credentials after deployment. The application does not need a downloaded service-account key.

If automated deployment is added later, use a dedicated GitHub environment and short-lived cloud authentication. Do not add a service-account key to the repository.
