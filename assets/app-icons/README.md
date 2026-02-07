# App Icon Assets

This folder contains the source icon files for the iOS app.

## Source Files (exported from design tool)

- `Nus-maps-iOS-Default-1024x1024@1x.png` - Default/Light mode icon
- `Nus-maps-iOS-Dark-1024x1024@1x.png` - Dark mode icon
- `Nus-maps-iOS-ClearLight-1024x1024@1x.png` - Tinted mode icon (light)
- `Nus-maps-iOS-ClearDark-1024x1024@1x.png` - Tinted mode icon (dark)

## Processed Files (used by app.config.ts)

- `icon.png` - Default app icon (1024x1024)
- `icon-dark.png` - Dark mode variant (1024x1024)
- `icon-tinted.png` - Tinted variant for light mode (1024x1024, must be grayscale)
- `icon-tinted-dark.png` - Tinted variant for dark mode (1024x1024, must be grayscale)

## Requirements

- All icons must be exactly 1024x1024 pixels
- PNG format with transparency
- Tinted variants MUST be grayscale (iOS applies color automatically)
- Dark variants should have transparent backgrounds

## Usage

Run the setup script to copy icons to the iOS asset catalog:

```bash
./scripts/setup-ios-icons.sh
```

Then build:

```bash
pnpm eas build -p ios --profile adhoc
```
