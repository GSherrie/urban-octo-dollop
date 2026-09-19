# SherPay → TestFlight / App Store (iOS) & Play Store (Android)

This folder is a complete **Capacitor 7** native project wrapping the SherPay web app (`www/`).
The iOS Xcode project and Android Gradle project are pre-generated and pre-branded
(app icon + splash generated from the SherPay logo). Bundle id: `com.sherpay.app`.

## Requirements

| | iOS / TestFlight | Android |
|---|---|---|
| Computer | **macOS** with Xcode 15+ | any OS with Android Studio |
| Account | Apple Developer ($99/yr) for TestFlight & Store. *Free* Apple ID works for 7-day on-device testing | Google Play Developer ($25, one-time) for Play Store; APK needs no account |
| Other | Node 18+ | Node 18+, JDK 17 (bundled with Android Studio) |

## Build once

```bash
unzip SherPay-iOS-Android-build.zip && cd SherPay-iOS-Android-build
npm install
npx cap sync          # copies www/ into both native projects
```

## Update the web app later

Replace the contents of `www/` with a fresh build (the `dist/` folder from the web repo,
or `SherPay-mobile.html`'s sibling files), then:

```bash
npx cap sync
```

## iOS → TestFlight (on your Mac)

### Fast path — scripted (recommended)
```bash
TEAM_ID=XXXXXXXXXX ./scripts/release-ios.sh                    # archive + export .ipa
TEAM_ID=... API_KEY=... API_ISSUER=... ./scripts/release-ios.sh  # + headless upload to TestFlight
```
(`TEAM_ID`: Xcode → Settings → Accounts → your team. `API_KEY`/`API_ISSUER`: App Store Connect →
Users and Access → Integrations → API key. Without them the script stops at a ready `.ipa`.)

### GUI path — step by step
1. `npx cap open ios` — Xcode opens `ios/App/App.xcworkspace`.
2. Select the **App** target → *Signing & Capabilities* → choose your **Team** (your Apple Developer account).
   Keep bundle id `com.sherpay.app` or change it to one you own (must be unique).
3. Bump *Version* / *Build* in the General tab per release.
4. Menu **Product → Archive** (wait for it to finish; Generic device is fine).
5. Organizer window opens → **Distribute App → App Store Connect → Upload**.
   - Export compliance: the app uses only standard HTTPS → select *exempt*.
   - No special entitlements needed (data is local WebView storage).
6. [App Store Connect](https://appstoreconnect.apple.com) → create the app record once
   (name "SherPay", bundle id from step 2). After processing (10–30 min) the build appears
   under **TestFlight**.
7. Add yourself/internal testers by email → on the iPhone install the **TestFlight** app,
   accept the invite → SherPay installs like a native app.
8. Public link: TestFlight → *Enable public link* → share anywhere (this is your "download on iPhone" URL).

> No Mac? A cloud Mac (MacStadium, AWS EC2 Mac, GitHub Actions macOS runners) can run steps 4–5
> headlessly with `xcodebuild -workspace ios/App/App.xcworkspace -scheme App -archivePath ... archive`
> followed by `xcodebuild -exportArchive` and `xcrun altool --upload-app`.

## Android → APK / Play Store (any OS)

1. `npx cap open android` (or open the `android/` folder in Android Studio).
2. **Build → Build Bundle(s)/APK(s) → Build APK(s)** → share the APK directly (sideload), or
3. **Build → Generate Signed Bundle / APK → Android App Bundle** with your keystore →
   upload the `.aab` in [Play Console](https://play.console.com).

## Why the app behaves natively

Capacitor serves `www/` from a local WKWebView/WebView at a `https://`-scheme origin, so
localStorage persistence, the print/PDF flow and all UI work offline with no network calls.
PWA service worker is intentionally unused inside the native shell (the bundle *is* the offline copy).
