# Android App Bundle (AAB) Guide for KPSS Takip

## Why AAB instead of APK?

### AAB Advantages:
- **📱 Smaller Downloads**: Users download only what they need for their device
- **🎯 Dynamic Delivery**: Google Play generates optimized APKs for each device
- **🔄 Play Feature Delivery**: Enable modular features and on-demand downloads
- **📊 Better Analytics**: More detailed insights in Play Console
- **🚀 Required Format**: Google Play strongly recommends AAB for new apps

### Size Comparison:
- **APK**: Contains all resources for all devices (~50-100MB typical)
- **AAB**: Users download device-specific APK (~30-60% smaller)

## Build Commands

### Quick Commands:
```bash
# Build Release AAB (for Play Store)
npm run build-aab

# Build Debug AAB (for testing)
npm run build-debug-aab

# Build traditional APK (if needed)
npm run build-android

# Clean build cache
npm run clean-android
```

### Manual Gradle Commands:
```bash
# Release AAB
cd android && ./gradlew bundleRelease

# Debug AAB
cd android && ./gradlew bundleDebug

# Clean
cd android && ./gradlew clean
```

### Using the Build Script:
```bash
# Run the automated build script
./scripts/build-aab.sh
```

## File Locations

After building, find your files here:

### AAB Files:
- **Release AAB**: `android/app/build/outputs/bundle/release/app-release.aab`
- **Debug AAB**: `android/app/build/outputs/bundle/debug/app-debug.aab`

### APK Files (if built):
- **Release APK**: `android/app/build/outputs/apk/release/app-release.apk`
- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk`

## Testing AAB Files

### Install bundletool (Google's official tool):
```bash
# macOS with Homebrew
brew install bundletool

# Or download directly
# https://github.com/google/bundletool/releases
```

### Generate APKs from AAB for testing:
```bash
# Generate universal APK from AAB
bundletool build-apks --bundle=android/app/build/outputs/bundle/release/app-release.aab --output=test.apks

# Install on connected device
bundletool install-apks --apks=test.apks
```

### Test different device configurations:
```bash
# Generate APKs for specific device
bundletool build-apks \
  --bundle=android/app/build/outputs/bundle/release/app-release.aab \
  --output=device-specific.apks \
  --connected-device
```

## Play Store Submission

### Steps:
1. **Build Release AAB**: `npm run build-aab`
2. **Sign your AAB** (if not using Play App Signing)
3. **Upload to Play Console**
4. **Complete Store Listing**
5. **Submit for Review**

### Play App Signing (Recommended):
- Let Google manage your signing keys
- More secure and convenient
- Enable in Play Console → App integrity

### Manual Signing (if needed):
```bash
# Sign AAB with your keystore
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore your-release-key.keystore \
  android/app/build/outputs/bundle/release/app-release.aab \
  your-key-alias
```

## Optimization Features Enabled

Your `build.gradle` includes these AAB optimizations:

### Resource Optimization:
```gradle
shrinkResources true
minifyEnabled true
zipAlignEnabled true
crunchPngs false  // Let Play Store optimize PNGs
```

### Dynamic Delivery:
```gradle
bundle {
    language { enableSplit = true }  // Split by language
    density { enableSplit = true }   // Split by screen density
    abi { enableSplit = true }       // Split by CPU architecture
}
```

## Version Management

### Update versions for releases:
```gradle
// In android/app/build.gradle
defaultConfig {
    versionCode 2        // Increment for each release
    versionName "1.1.0"  // Semantic versioning
}
```

### Automated versioning (optional):
Add to `package.json` scripts:
```json
"version-bump": "npm version patch && sed -i '' 's/versionCode [0-9]*/versionCode '$(date +%s)'/' android/app/build.gradle"
```

## Troubleshooting

### Common Issues:

**Build fails with "bundletool not found"**:
- This is normal - bundletool is only needed for testing AAB files
- Your AAB is still generated successfully

**AAB file too large**:
- Enable ProGuard: `minifyEnabled true`
- Remove unused resources: `shrinkResources true`
- Check for unnecessary assets

**Upload failed to Play Console**:
- Ensure versionCode is higher than previous uploads
- Check that AAB is properly signed
- Verify all required permissions are declared

### Debug Information:
```bash
# Analyze AAB contents
bundletool dump manifest --bundle=app-release.aab

# Check AAB size breakdown
bundletool get-size total --bundle=app-release.aab
```

## Best Practices

1. **Always test AAB** before uploading to Play Store
2. **Use Play App Signing** for security and convenience
3. **Increment versionCode** for each release
4. **Test on multiple devices** using bundletool
5. **Monitor app size** in Play Console analytics
6. **Enable ProGuard** for production builds
7. **Keep backup** of your signing keys

## Resources

- [Google Play Console](https://play.google.com/console)
- [AAB Documentation](https://developer.android.com/guide/app-bundle)
- [Bundletool GitHub](https://github.com/google/bundletool)
- [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)