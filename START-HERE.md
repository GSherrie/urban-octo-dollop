# SherPay — Complete Project

Invoicing, receipts & payments app · branded with the SherPay logo · production: **https://sherpay.vercel.app**

## What's inside

| Folder | Contents |
|---|---|
| `web/` | The web app source (dependency-free, no build step): `index.html`, `styles.css`, `js/` (store, ui, views), `assets/` (logo + PWA icons), `manifest.json`, `sw.js` (offline service worker), `scripts/` (builders), `README.md` (full feature/architecture docs) |
| `native/` | Complete Capacitor 7 native project (iOS Xcode + Android Gradle, branded icons/splash, bundle id `com.sherpay.app`) with the web app synced into `www/`. See `native/README-TESTFLIGHT.md` and `native/README-HOSTING.md` |
| `builds/` | Ready-to-use artifacts: `SherPay-mobile.html` (entire app in ONE offline file), `SherPay-web-dist.zip` (drag-&-drop deploy bundle for Netlify/Vercel/any host), `SherPay-iOS-Android-build.zip` (standalone native project) |
| `tests/` | QA suite: `test-suite.js` (50-assertion functional sweep), `test-ui.js` (interaction clicks), `test-mobile.js` (single-file boot), `smoke.js` (route render). `npm install` in this folder first (jsdom etc.) |

## Run it locally (5 seconds)

```bash
cd web && python3 -m http.server 8000     # or: npx serve .
# open http://localhost:8000
```

Or zero-server: double-click `builds/SherPay-mobile.html` — the whole app runs offline from that one file.

## Develop & debug in VS Code

Open this folder in VS Code — everything is pre-configured (`.vscode/`), and the full guide is in **`DEVELOPMENT.md`**.

```bash
cd tests && npm install        # one-time: test dependencies only
```

- **Terminal ▸ Run Task… ▸ Start dev server (live reload)** → http://localhost:8000, auto-refreshes on every save.
- **F5 ▸ Debug SherPay in Chrome** → breakpoints directly in `web/js/*.js` (server starts automatically).
- Tasks also include: Run QA suite, Run all tests, Build single-file app, Sync native www, Deploy to Vercel.

## Put it on GitHub (optional, recommended)

There is **no GitHub repo yet** — this zip IS the project. To create one (so you can clone/push from any machine):

1. On https://github.com/new create an **empty** repository named `sherpay` (no README, no .gitignore — this folder already has one).
2. On your Mac, from the unzipped folder:

```bash
cd ~/Desktop/SherPay-complete     # adjust to wherever you unzipped
git init -b main
git add -A
git commit -m "SherPay initial import"
git remote add origin https://github.com/YOUR-USERNAME/sherpay.git
git push -u origin main
```

3. From then on, on any machine:

```bash
cd ~/Desktop
git clone https://github.com/YOUR-USERNAME/sherpay.git
cd sherpay && code .
```

## Ship it

- **Web (live at https://sherpay.vercel.app):** to push updates, use VS Code task **`Deploy to Vercel (update live app)`** after the one-time **`Link Vercel project (one-time)`** task — or connect your GitHub repo in the Vercel dashboard (Settings ▸ Git, Root Directory = `web`) so every `git push` redeploys automatically. Full walkthrough: `DEVELOPMENT.md` ▸ "Publishing updates". Alternative host: drag `builds/SherPay-web-dist.zip` onto https://app.netlify.com/drop.
- **iOS/TestFlight:** on a Mac with an Apple Developer account:
  `cd native && npm install && TEAM_ID=XXXX ./scripts/release-ios.sh` → signed .ipa + optional direct TestFlight upload.
- **Android:** `cd native && npm install && npx cap open android` → signed APK/AAB from Android Studio.

## Refresh builds after editing source

```bash
cd web
node scripts/build-mobile.js          # rebuild builds/SherPay-mobile.html equivalent
node scripts/sync-www.js ../native/www && (cd ../native && npx cap sync)   # native shell
```

## Quality status

50/50 functional QA · 21/21 interaction tests · 12/12 routes · PWA installable · offline-capable ·
mobile-first with safe-area insets, touch-assist & desktop drag-scroll · WCAG-minded focus states.
