#!/bin/bash

echo "🚀 Preparing KPSS Takip for Play Store Release"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cd android
./gradlew clean
cd ..

# Remove any development files
echo "📁 Removing development files..."
rm -rf node_modules/.cache
rm -rf android/app/build

# Build optimized release APK
echo "🔨 Building optimized release APK..."
cd android
./gradlew assembleRelease
cd ..

# Check if APK was created
if [ -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
    echo "✅ APK built successfully!"
    echo "📱 APK location: android/app/build/outputs/apk/release/app-release.apk"
    echo ""
    echo "📋 Next steps for Play Store:"
    echo "1. Generate release keystore if not done already"
    echo "2. Sign the APK with your release key"
    echo "3. Upload to Google Play Console"
    echo ""
    echo "🔑 To generate release keystore:"
    echo "keytool -genkeypair -v -storetype PKCS12 -keystore kpsstakip-release-key.keystore -alias kpsstakip-key-alias -keyalg RSA -keysize 2048 -validity 10000"
else
    echo "❌ APK build failed!"
    exit 1
fi