#!/bin/bash
# SherPay → App Store Connect / TestFlight, fully scripted (run on your Mac).
#
# Prereqs: Xcode 15+, Node 18+, Apple Developer account logged in (Xcode → Settings → Accounts),
#          App Store Connect API key (optional, for headless upload):
#          App Store Connect → Users and Access → Integrations → Create API Key (Admin/App Manager)
#
# Usage:
#   TEAM_ID=XXXXXXXXXX ./scripts/release-ios.sh                 # archive + export .ipa
#   TEAM_ID=... API_KEY=... API_ISSUER=... ./scripts/release-ios.sh   # also uploads to TestFlight
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ syncing web assets into native shell"
[ -d node_modules ] || npm install
npx cap sync ios

echo "→ archiving (automatic signing, team ${TEAM_ID:?set TEAM_ID env var})"
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -configuration Release -destination generic/platform=iOS \
  -archivePath build/App.xcarchive archive \
  -allowProvisioningUpdates DEVELOPMENT_TEAM="$TEAM_ID" | tail -3

echo "→ exporting .ipa"
xcodebuild -exportArchive -archivePath build/App.xcarchive \
  -exportPath build/out -exportOptionsPlist ExportOptions.plist \
  -allowProvisioningUpdates | tail -3

if [ -n "${API_KEY:-}" ] && [ -n "${API_ISSUER:-}" ]; then
  echo "→ uploading to App Store Connect / TestFlight"
  xcrun altool --upload-app --type ios --file build/out/App.ipa \
    --apiKey "$API_KEY" --apiIssuer "$API_ISSUER"
  echo "✓ uploaded — build appears in TestFlight in ~10-30 min"
else
  echo "✓ .ipa ready at build/out/App.ipa"
  echo "  upload via: Xcode Organizer → Distribute App, Transporter app, or rerun with API_KEY/API_ISSUER"
fi
