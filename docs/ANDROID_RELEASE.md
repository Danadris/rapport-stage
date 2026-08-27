# Android Release

The Android app is built locally with Capacitor. Reports, backups and the optional Gemini API key stay on the user's device.

## Debug APK

```bash
npm install
npm run cap:sync
JAVA_HOME=/usr/lib/jvm/java-21-openjdk npm run android:apk
```

Output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Release Signing

Create a private keystore outside version control:

```bash
cd android
keytool -genkeypair -v -keystore release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias rapportstage
```

Create `android/key.properties` locally:

```properties
storeFile=release-key.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=rapportstage
keyPassword=YOUR_KEY_PASSWORD
```

`release-key.jks`, `*.keystore` and `key.properties` are ignored by git.

## Release Builds

APK:

```bash
npm run cap:sync
JAVA_HOME=/usr/lib/jvm/java-21-openjdk npm run android:release-apk
```

AAB for app stores:

```bash
npm run cap:sync
JAVA_HOME=/usr/lib/jvm/java-21-openjdk npm run android:release-aab
```

Outputs:

```text
android/app/build/outputs/apk/release/
android/app/build/outputs/bundle/release/
```

Before publishing, change `appId` / `applicationId` to an identifier you own.
