#!/bin/bash

# Setup iOS App Icon Variants for Dark and Tinted modes
# This script processes icon variants from source files and copies them to the Xcode asset catalog

set -e

ICONS_SOURCE="./assets/app-icons"
ASSET_CATALOG="./ios/NUSMaps/Images.xcassets/AppIcon.appiconset"

echo "🎨 Setting up iOS app icon variants..."

# Check if iOS folder exists
if [ ! -d "./ios" ]; then
  echo "❌ iOS folder not found. Run 'npx expo prebuild -p ios' first."
  exit 1
fi

# Check if asset catalog exists
if [ ! -d "$ASSET_CATALOG" ]; then
  echo "❌ Asset catalog not found. Creating it..."
  mkdir -p "$ASSET_CATALOG"
fi

# Process source files if they exist with original naming
if [ -f "$ICONS_SOURCE/Nus-maps-iOS-Default-1024x1024@1x.png" ]; then
  echo "📦 Processing source icon files..."
  cp "$ICONS_SOURCE/Nus-maps-iOS-Default-1024x1024@1x.png" "$ICONS_SOURCE/icon.png"
  cp "$ICONS_SOURCE/Nus-maps-iOS-Dark-1024x1024@1x.png" "$ICONS_SOURCE/icon-dark.png"
  cp "$ICONS_SOURCE/Nus-maps-iOS-ClearLight-1024x1024@1x.png" "$ICONS_SOURCE/icon-tinted.png"
  cp "$ICONS_SOURCE/Nus-maps-iOS-ClearDark-1024x1024@1x.png" "$ICONS_SOURCE/icon-tinted-dark.png"
fi

# Copy icons to asset catalog
echo "📦 Copying icon variants to Xcode asset catalog..."
cp "$ICONS_SOURCE/icon.png" "$ASSET_CATALOG/icon-1024.png"
cp "$ICONS_SOURCE/icon-dark.png" "$ASSET_CATALOG/icon-dark-1024.png"
cp "$ICONS_SOURCE/icon-tinted.png" "$ASSET_CATALOG/icon-tinted-1024.png"
cp "$ICONS_SOURCE/icon-tinted-dark.png" "$ASSET_CATALOG/icon-tinted-dark-1024.png"

# Create Contents.json with all variants
cat > "$ASSET_CATALOG/Contents.json" << 'EOF'
{
  "images" : [
    {
      "filename" : "icon-1024.png",
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    },
    {
      "appearances" : [
        {
          "appearance" : "luminosity",
          "value" : "dark"
        }
      ],
      "filename" : "icon-dark-1024.png",
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    },
    {
      "appearances" : [
        {
          "appearance" : "luminosity",
          "value" : "tinted"
        }
      ],
      "filename" : "icon-tinted-1024.png",
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    },
    {
      "appearances" : [
        {
          "appearance" : "luminosity",
          "value" : "dark"
        },
        {
          "appearance" : "luminosity",
          "value" : "tinted"
        }
      ],
      "filename" : "icon-tinted-dark-1024.png",
      "idiom" : "universal",
      "platform" : "ios",
      "size" : "1024x1024"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  },
  "properties" : {
    "pre-rendered" : true
  }
}
EOF

echo "✅ iOS app icon variants configured successfully!"
echo ""
echo "📝 Important Requirements:"
echo "   - Tinted icons MUST be grayscale (system will apply color)"
echo "   - Dark icons SHOULD have transparent backgrounds"
echo "   - All icons should be 1024x1024 pixels"
echo ""
echo "⚠️  CRITICAL: app-icon-badge plugin can overwrite these variants!"
echo "   The plugin is now disabled for production builds in app.config.ts"
echo ""
echo "Next steps for production build:"
echo "1. Backup this Contents.json:"
echo "   cp $ASSET_CATALOG/Contents.json $ASSET_CATALOG/Contents.json.backup"
echo "2. Run: pnpm run prebuild:production"
echo "3. Restore if needed: cp $ASSET_CATALOG/Contents.json.backup $ASSET_CATALOG/Contents.json"
echo "4. Build: pnpm eas build -p ios --profile production"
