#!/bin/bash
set -e

VERSION="${1:?Usage: ./release.sh <version> (e.g. v1.0.0)}"
APK_PATH="android/release/costpilot.apk"

if [ ! -f "$APK_PATH" ]; then
  echo "Error: APK not found at $APK_PATH"
  echo "Build the APK first, then place it at the expected path."
  exit 1
fi

echo "Creating release $VERSION with $APK_PATH..."

gh release create "$VERSION" "$APK_PATH" \
  --title "CostPilot $VERSION" \
  --notes "## CostPilot $VERSION

### Download
Download **costpilot.apk** below to install on your Android device.

### What's Inside
- High-performance dashboard with interactive financial charts
- Dual-mode history: transaction list and calendar view
- Optional cloud sync powered by Supabase
- Local-first architecture with zero-latency performance
- Professional PDF and CSV export
- Full dark mode with adaptive theming
- Experimental Gemini AI integration for smart categorization

### Installation
1. Download the APK file from the assets below
2. Open it on your Android device
3. If prompted, enable \"Install from unknown sources\" in your device settings

> **Security Note:** This app is built and signed locally and is not yet listed on Google Play. Your device may display a security warning during installation (such as a Google Play Protect alert). This is standard behavior for apps distributed outside the Play Store and does not indicate any security risk. Google Play registration is planned for a future release."

echo "Release $VERSION created successfully."
echo "View it at: https://github.com/excellencior/cost-pilot/releases/tag/$VERSION"
