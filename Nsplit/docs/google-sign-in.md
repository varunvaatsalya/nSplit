# Google sign-in setup

Web and app both get a Google **ID token** and send it to `POST /api/auth/google`.
The server checks it against Google's public keys and logs the person in. If an
account with the same (Google-verified) email already exists, Google is linked
to it, so nobody ends up with two accounts.

No client **secret** is used anywhere: this flow only needs client **ids**.

## 1. Google Cloud project

1. Open <https://console.cloud.google.com/> and create a project (e.g. `nSplit`).
2. **APIs & Services → OAuth consent screen** (now called "Google Auth Platform"):
   - User type: **External**
   - App name `nSplit`, support email, developer email
   - Scopes: the defaults (`openid`, `email`, `profile`) are enough
   - While in **Testing**, only the test users you add can sign in. Click
     **Publish app** when you're ready for everyone (no review is needed for
     these basic scopes).

## 2. OAuth clients to create

**APIs & Services → Credentials → Create credentials → OAuth client ID**

| Client type | Used by | What to fill in |
|---|---|---|
| **Web application** | Web button, and the app (as `webClientId`) | Authorized JavaScript origins: `https://nsplit.vercel.app`, `http://localhost:3000`. Redirect URIs: none needed. |
| **Android** (debug) | App builds signed with the debug key | Package `com.varunvaatsalya.nsplit` + debug SHA-1 |
| **Android** (release) | App builds signed with your upload key | Same package + release SHA-1 |
| **Android** (Play) | Installs from Google Play | Same package + Play "App signing key" SHA-1 (Play Console → Test and release → App integrity) |
| **iOS** (optional) | iOS builds | Bundle id of the iOS app |

The Android clients are never put in code. Google matches them by package name +
SHA-1 of the signing certificate. If the SHA-1 is missing, the app shows
"Google sign-in is not set up for this version of the app yet."

### Getting the SHA-1s

Debug key (after `npx expo prebuild`):

```sh
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Release / upload key (the keystore from `android-release.md`):

```sh
keytool -list -v -keystore path/to/nsplit-upload.keystore -alias <your alias>
```

Copy the `SHA1:` line.

## 3. Environment variables

**Vercel (web project settings → Environment Variables)** and `web/.env`:

```
GOOGLE_WEB_CLIENT_ID=<web client id>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<same web client id>
GOOGLE_IOS_CLIENT_ID=<ios client id, only if you ship iOS>
```

Redeploy after adding them (`NEXT_PUBLIC_` values are baked in at build time).

**App (`Nsplit/.env`)**:

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web client id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<ios client id, only for iOS>
```

Then rebuild the native app (`npx expo prebuild` + Android Studio build).
`EXPO_PUBLIC_` values are read when the JS bundle is built.

## Notes

- **Expo Go can't run Google sign-in** (it needs native code). The button is
  hidden there; use a development or release build to test it.
- On the web, Google only allows `localhost` and real domains as origins, so
  testing from a LAN IP like `http://10.x.x.x:3000` won't show the button working.
- If neither client id is set, the Google buttons simply don't appear and
  `/api/auth/google` returns an error, so nothing breaks before setup.
