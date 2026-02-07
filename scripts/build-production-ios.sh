#!/bin/bash

# Production iOS Build Script with Icon Variant Preservation
# This script ensures custom app icon variants (dark/tinted) survive the build process

set -e

ASSET_CATALOG="./ios/NUSMaps/Images.xcassets/AppIcon.appiconset"
BACKUP_FILE="$ASSET_CATALOG/Contents.json.backup"

echo "🚀 Starting production iOS build with icon variant preservation..."

# Step 1: Setup icons if not already done
if [ ! -f "$ASSET_CATALOG/icon-tinted-1024.png" ]; then
  echo "📦 Setting up iOS icons first..."
  ./scripts/setup-ios-icons.sh
fi

# Step 2: Backup the Contents.json with appearance variants
if [ -f "$ASSET_CATALOG/Contents.json" ]; then
  echo "💾 Backing up Contents.json with appearance variants..."
  cp "$ASSET_CATALOG/Contents.json" "$BACKUP_FILE"
else
  echo "⚠️  Warning: Contents.json not found. Run ./scripts/setup-ios-icons.sh first"
  exit 1
fi

# Step 3: Run prebuild (app-icon-badge is disabled for production in app.config.ts)
echo "🔨 Running Expo prebuild for production..."
pnpm run prebuild:production

# Step 4: Verify Contents.json wasn't overwritten
echo "🔍 Verifying icon variants in Contents.json..."
if grep -q '"appearance".*"luminosity"' "$ASSET_CATALOG/Contents.json"; then
  echo "✅ Icon variants preserved!"
else
  echo "⚠️  Contents.json was overwritten. Restoring backup..."
  cp "$BACKUP_FILE" "$ASSET_CATALOG/Contents.json"
  echo "✅ Backup restored!"
fi

# Step 5: Show the final configuration
echo ""
echo "📋 Final Contents.json structure:"
echo "---"
cat "$ASSET_CATALOG/Contents.json" | grep -A 5 "appearances" | head -20
echo "---"

echo ""
echo "✅ Setup complete! Now run:"
echo "   pnpm eas build -p ios --profile production"
echo ""
echo "🎨 Your app will have:"
echo "   - Default icon (light mode)"
echo "   - Dark icon (dark mode)"
echo "   - Tinted icon (Spotlight, Control Center)"
