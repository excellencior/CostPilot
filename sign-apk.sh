#!/bin/bash

# Configuration
ANDROID_SDK_PATH="/home/apurboturjo/Android/Sdk"
KEYSTORE_FILE="release-key.jks"
ALIAS_NAME="costpilot"
BUILD_OUTPUT_DIR="android/app/build/outputs/apk/release"
UNSIGNED_APK="$BUILD_OUTPUT_DIR/app-release-unsigned.apk"
ALIGNED_APK="$BUILD_OUTPUT_DIR/app-release-aligned.apk"
FINAL_APK="costpilot-release-signed.apk"

echo "--- CostPilot Build & Sign Tool ---"

# 1. Setup Java 11+ (Required by modern Gradle)
# Check for Java 21 in common paths
JAVA_21_PATH="/usr/local/jdk21"
if [ -d "$JAVA_21_PATH" ]; then
    export JAVA_HOME="$JAVA_21_PATH"
    export PATH="$JAVA_HOME/bin:$PATH"
    echo "Using Java 21 from $JAVA_21_PATH"
fi

# 2. Setup Android SDK
if [ ! -d "$ANDROID_SDK_PATH" ] && [ -d "../AndroidSdk" ]; then
     ANDROID_SDK_PATH="$(realpath ../AndroidSdk)"
fi

if [ ! -d "$ANDROID_SDK_PATH" ]; then
    echo "Warning: Android SDK not found at $ANDROID_SDK_PATH"
    echo "Please edit the script to point to your Android SDK location."
else
    export ANDROID_HOME="$ANDROID_SDK_PATH"
    # Create local.properties if it doesn't exist
    if [ ! -f "android/local.properties" ]; then
        echo "sdk.dir=$ANDROID_SDK_PATH" > android/local.properties
        echo "Created android/local.properties"
    fi
fi

# 3. Check Java Version
JAVA_VER_FULL=$(java -version 2>&1 | head -n 1)
if [[ "$JAVA_VER_FULL" == *"1.8"* ]]; then
    echo "Error: Your system is still using Java 8. Android build tools require Java 11 or higher."
    echo "Current version: $JAVA_VER_FULL"
    exit 1
fi
echo "Java Version: $JAVA_VER_FULL"

# Setup Node.js (via NVM)
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
    nvm use 20
fi

# 3. Build the project
echo "Starting production build..."
npm run build
if [ $? -ne 0 ]; then
    echo "Web build failed."
    exit 1
fi

echo "Syncing with Capacitor..."
npx cap sync android
if [ $? -ne 0 ]; then
    echo "Capacitor sync failed."
    exit 1
fi

echo "Building Android release APK..."
# Force remove any splash screens that might have slipped in
find android/app/src/main/res -name "splash.png" -delete
cd android
./gradlew assembleRelease
cd ..

# 4. Find the unsigned APK
if [ ! -f "$UNSIGNED_APK" ] && [ -f "$BUILD_OUTPUT_DIR/app-release.apk" ]; then
    UNSIGNED_APK="$BUILD_OUTPUT_DIR/app-release.apk"
fi

if [ ! -f "$UNSIGNED_APK" ]; then
    echo "Error: Release APK not found at $UNSIGNED_APK"
    exit 1
fi

# 5. Keystore Management
if [ ! -f "$KEYSTORE_FILE" ]; then
    echo "Keystore '$KEYSTORE_FILE' not found. Generating a new one (non-interactive)..."
    keytool -genkey -v -keystore "$KEYSTORE_FILE" -alias "$ALIAS_NAME" -keyalg RSA -keysize 2048 -validity 10000 \
      -dname "CN=CostPilot, OU=CostPilot, O=CostPilot, L=City, ST=State, C=US" \
      -storepass "password123" -keypass "password123"
    if [ $? -ne 0 ]; then
        echo "Failed to generate keystore."
        exit 1
    fi
fi

# 6. Alignment
echo "Aligning APK..."
ZIPALIGN=$(find "$ANDROID_SDK_PATH/build-tools" -name zipalign | sort -r | head -n 1)
if [ -z "$ZIPALIGN" ]; then
    ZIPALIGN=$(which zipalign)
fi

if [ -z "$ZIPALIGN" ]; then
    echo "Error: 'zipalign' not found in $ANDROID_SDK_PATH/build-tools or PATH."
    exit 1
fi

"$ZIPALIGN" -f -v 4 "$UNSIGNED_APK" "$ALIGNED_APK"

# 7. Signing
echo "Signing APK..."
APKSIGNER=$(find "$ANDROID_SDK_PATH/build-tools" -name apksigner | sort -r | head -n 1)
if [ -z "$APKSIGNER" ]; then
    APKSIGNER=$(which apksigner)
fi

if [ -z "$APKSIGNER" ]; then
    echo "Error: 'apksigner' not found in $ANDROID_SDK_PATH/build-tools or PATH."
    exit 1
fi

RELEASE_DIR="android/release"
mkdir -p "$RELEASE_DIR"

"$APKSIGNER" sign --ks "$KEYSTORE_FILE" --ks-pass "pass:password123" --out "$FINAL_APK" "$ALIGNED_APK"

if [ $? -eq 0 ]; then
    mv "$FINAL_APK" "$RELEASE_DIR/$FINAL_APK"
    echo "------------------------------------------------"
    echo "SUCCESS: Signed APK created and moved to: $RELEASE_DIR/$FINAL_APK"
    echo "------------------------------------------------"
    rm "$ALIGNED_APK"
    rm -f "$FINAL_APK.idsig"
else
    echo "Error: Signing failed."
    exit 1
fi
