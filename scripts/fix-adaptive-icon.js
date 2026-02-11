#!/usr/bin/env node

/**
 * Fixes Android adaptive icon cropping issue
 * 
 * Android adaptive icons have a safe zone that is much smaller than the full icon.
 * This script creates a proper adaptive icon with the main content centered
 * and properly padded to avoid cropping.
 * 
 * The safe zone is approximately 66/108 = 61% of the icon size.
 * We'll scale the icon to 60% and center it on a transparent 1024x1024 canvas.
 */

const fs = require('fs');
const path = require('path');

let sharp;

try {
  sharp = require('sharp');
} catch (err) {
  console.error('❌ Error: sharp is not installed');
  console.error('Please run: pnpm add -D sharp');
  process.exit(1);
}

async function fixAdaptiveIcon(scalePercent = 0.7) {
  const iconPath = path.join(__dirname, '../assets/andriod-icon.png');
  const adaptiveIconPath = path.join(__dirname, '../assets/adaptive-icon.png');

  console.log('🔧 Fixing Android adaptive icon...');
  console.log(`📥 Reading icon from: ${iconPath}`);
  console.log(`📐 Scale factor: ${(scalePercent * 100).toFixed(0)}%`);

  if (!fs.existsSync(iconPath)) {
    console.error(`❌ Error: Icon not found at ${iconPath}`);
    process.exit(1);
  }

  try {
    // Scale the icon to the specified percentage of 1024px
    const scaledSize = Math.floor(1024 * scalePercent);
    const padding = (1024 - scaledSize) / 2;

    console.log(`📐 Icon size: 1024x1024`);
    console.log(`📐 Content size: ${scaledSize}x${scaledSize} (${(scalePercent * 100).toFixed(0)}% of full size)`);
    console.log(`📐 Padding: ${Math.round(padding)}px on each side`);

    // Create the adaptive icon with proper padding
    const adaptiveIcon = await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      }
    })
      .composite([
        {
          input: await sharp(iconPath)
            .resize(scaledSize, scaledSize, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toBuffer(),
          top: Math.round(padding),
          left: Math.round(padding)
        }
      ])
      .png()
      .toBuffer();

    // Write the new adaptive icon
    fs.writeFileSync(adaptiveIconPath, adaptiveIcon);

    console.log(`✅ Adaptive icon created successfully!`);
    console.log(`📥 Output: ${adaptiveIconPath}`);
    console.log('');
    console.log('📱 Next steps:');
    console.log('1. Run: pnpm eas build -p android --profile adhoc');
    console.log('2. Check that the icon is no longer cropped');
    console.log('');
    console.log('💡 To preview with different scale factors:');
    console.log('   node scripts/fix-adaptive-icon.js --scale 0.65');
    console.log('   node scripts/fix-adaptive-icon.js --scale 0.75');
    console.log('');
    console.log('💡 To open the preview in Finder:');
    console.log(`   open ${path.dirname(adaptiveIconPath)}`);

  } catch (error) {
    console.error('❌ Error creating adaptive icon:', error);
    process.exit(1);
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
let scalePercent = 0.7;

if (args.length > 0) {
  if (args[0] === '--scale' && args[1]) {
    scalePercent = parseFloat(args[1]);
    if (isNaN(scalePercent) || scalePercent <= 0 || scalePercent > 1) {
      console.error('❌ Error: Scale must be a number between 0 and 1 (e.g., 0.7)');
      process.exit(1);
    }
  } else if (args[0] === '--help') {
    console.log('Usage: node fix-adaptive-icon.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --scale <value>   Scale factor (0.5-0.9, default 0.7)');
    console.log('  --help            Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node fix-adaptive-icon.js');
    console.log('  node fix-adaptive-icon.js --scale 0.65');
    console.log('  node fix-adaptive-icon.js --scale 0.75');
    process.exit(0);
  }
}

// Run the fix
fixAdaptiveIcon(scalePercent);
