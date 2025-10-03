#!/bin/bash

# KPSS Takip - Android App Bundle (AAB) Build Script
# This script builds your app for Play Store submission

echo "🚀 Building KPSS Takip for Play Store submission..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Clean previous builds
echo -e "${BLUE}🧹 Cleaning previous builds...${NC}"
cd android && ./gradlew clean
cd ..

# Build the App Bundle
echo -e "${BLUE}📦 Building Release AAB...${NC}"
cd android && ./gradlew bundleRelease

# Check if build was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ AAB build successful!${NC}"
    echo -e "${YELLOW}📍 AAB Location: android/app/build/outputs/bundle/release/app-release.aab${NC}"
    
    # Show file size
    AAB_FILE="app/build/outputs/bundle/release/app-release.aab"
    if [ -f "$AAB_FILE" ]; then
        SIZE=$(ls -lh "$AAB_FILE" | awk '{print $5}')
        echo -e "${BLUE}📊 AAB Size: $SIZE${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Your app is ready for Play Store submission!${NC}"
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo "   1. Upload the AAB file to Google Play Console"
    echo "   2. Fill in store listing details"
    echo "   3. Set up pricing and distribution"
    echo "   4. Submit for review"
    echo ""
    echo -e "${BLUE}💡 Pro tip: Test your AAB using bundletool before submission${NC}"
else
    echo -e "${RED}❌ AAB build failed!${NC}"
    echo -e "${YELLOW}Please check the error messages above and try again.${NC}"
    exit 1
fi

cd ..