# Android release build (own signing key, no EAS)

## 1. Create the upload key (once)

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore C:/keys/nsplit-upload.jks -alias nsplit -keyalg RSA -keysize 2048 -validity 10000
```

Keep the `.jks` file and its passwords safe and **outside the repo**. Losing them means you cannot ship updates under the same key.

## 2. Tell Gradle about it

Add to `%USERPROFILE%\.gradle\gradle.properties` (not the project's):

```properties
NSPLIT_UPLOAD_STORE_FILE=C:/keys/nsplit-upload.jks
NSPLIT_UPLOAD_STORE_PASSWORD=your-store-password
NSPLIT_UPLOAD_KEY_ALIAS=nsplit
NSPLIT_UPLOAD_KEY_PASSWORD=your-key-password
```

`plugins/with-android-signing.js` wires this into `android/app/build.gradle` on every `expo prebuild`. Without these properties, release builds fall back to the debug key.

## 3. Build

```bash
npm run android:release   # APK: android/app/build/outputs/apk/release/
npm run android:bundle    # AAB for the Play Store
```

Or run `npx expo prebuild`, open `android/` in Android Studio and use Build > Generate Signed Bundle / APK.

## 4. Make /s/ links open the app (Android App Links)

Get the SHA-256 fingerprints of the keys that sign your builds:

```bash
keytool -list -v -keystore C:/keys/nsplit-upload.jks -alias nsplit
keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

On Vercel, set `ANDROID_SHA256_CERT_FINGERPRINTS` to both, comma-separated, and redeploy. Check
`https://nsplit.vercel.app/.well-known/assetlinks.json` shows them.

If the app is published on the Play Store with Play App Signing, also add the **app signing key** fingerprint from Play Console > Setup > App signing.

Install the new build, then tap a `https://nsplit.vercel.app/s/...` link: it opens in the app. To re-check verification on a device:

```bash
adb shell pm verify-app-links --re-verify com.varunvaatsalya.nsplit
adb shell pm get-app-links com.varunvaatsalya.nsplit
```
