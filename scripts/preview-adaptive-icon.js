#!/usr/bin/env node

/**
 * Preview Android adaptive icon with different scale factors
 * 
 * Shows what the icon will look like in the Android adaptive icon mask
 * without needing to build the entire app.
 * 
 * The adaptive icon mask is a circle/rounded shape that only shows the center
 * portion of the icon. This tool creates a visual preview.
 */

const fs = require('fs');
const path = require('path');

let sharp;

try {
  sharp = require('sharp');
} catch (err) {
  console.error('❌ Error: sharp is not installed');
  process.exit(1);
}

async function previewAdaptiveIcon(scalePercent = 0.7) {
  const iconPath = path.join(__dirname, '../assets/andriod-icon.png');
  const outputDir = path.join(__dirname, '../.adaptive-icon-previews');
  const outputPath = path.join(outputDir, `adaptive-preview-${(scalePercent * 100).toFixed(0)}.png`);

  // Create preview directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('📱 Generating Android adaptive icon preview...');
  console.log(`📥 Icon: ${path.basename(iconPath)}`);
  console.log(`📐 Scale: ${(scalePercent * 100).toFixed(0)}%`);

  if (!fs.existsSync(iconPath)) {
    console.error(`❌ Error: Icon not found at ${iconPath}`);
    process.exit(1);
  }

  try {
    const scaledSize = Math.floor(1024 * scalePercent);
    const padding = (1024 - scaledSize) / 2;

    // Create the base adaptive icon with padding
    const adaptiveIcon = await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: { r: 46, g: 60, b: 75, alpha: 255 } // Android background color from app.config.ts
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

    // Also create a preview that shows the safe zone circle
    const circleRadius = Math.floor(1024 * 0.33); // Approximate safe zone
    const svg = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <image id="icon" href="data:image/png;base64,${adaptiveIcon.toString('base64')}" width="1024" height="1024"/>
        <mask id="safezone">
          <rect width="1024" height="1024" fill="white"/>
          <circle cx="512" cy="512" r="${circleRadius}" fill="black"/>
        </mask>
      </defs>
      <use href="#icon" mask="url(#safezone)"/>
      <circle cx="512" cy="512" r="${circleRadius}" fill="none" stroke="rgba(255,0,0,0.3)" stroke-width="2" stroke-dasharray="10,5"/>
    </svg>`;

    // Save the preview with safe zone overlay
    const previewWithZone = await sharp(Buffer.from(svg))
      .png()
      .toBuffer();

    fs.writeFileSync(outputPath, adaptiveIcon);

    console.log('');
    console.log(`✅ Preview saved!`);
    console.log(`📸 ${outputPath}`);
    console.log('');
    console.log('📐 Dimensions:');
    console.log(`   Content size: ${scaledSize}x${scaledSize}`);
    console.log(`   Padding: ${Math.round(padding)}px on each side`);
    console.log(`   Safe zone radius: ~${circleRadius}px (circle mask)`);
    console.log('');
    console.log('🎨 The icon will be displayed with:');
    console.log('   Background: #2E3C4B (from app.config.ts)');
    console.log('   Content: Centered within the safe zone');
    console.log('');
    console.log('💾 You can now compare different scale factors:');
    console.log('   node scripts/preview-adaptive-icon.js --scale 0.65');
    console.log('   node scripts/preview-adaptive-icon.js --scale 0.75');
    console.log('   node scripts/preview-adaptive-icon.js --scale 0.80');
    console.log('');
    console.log('📂 All previews are saved in: .adaptive-icon-previews/');
    console.log('   Open them side-by-side to compare!');
    console.log('');
    console.log('✨ Once you find the right scale, run:');
    console.log(`   node scripts/fix-adaptive-icon.js --scale ${scalePercent}`);

  } catch (error) {
    console.error('❌ Error creating preview:', error.message);
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
    console.log('Preview Android Adaptive Icon');
    console.log('');
    console.log('Usage: node preview-adaptive-icon.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --scale <value>   Scale factor (0.5-0.9, default 0.7)');
    console.log('  --help            Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/preview-adaptive-icon.js');
    console.log('  node scripts/preview-adaptive-icon.js --scale 0.65');
    console.log('  node scripts/preview-adaptive-icon.js --scale 0.75');
    console.log('  node scripts/preview-adaptive-icon.js --scale 0.80');
    console.log('');
    console.log('Previews are saved in .adaptive-icon-previews/ directory');
    process.exit(0);
  }
}

// Run the preview
previewAdaptiveIcon(scalePercent);
