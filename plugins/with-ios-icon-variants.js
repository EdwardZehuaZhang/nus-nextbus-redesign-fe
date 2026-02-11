const { withInfoPlist, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withIosIconVariants(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;

    // Get the asset catalog path
    const assetCatalogPath = path.join(
      config.modRequest.projectRoot,
      'ios',
      'NUSMaps',
      'Images.xcassets',
      'AppIcon.appiconset'
    );

    // Ensure the directory exists
    if (!fs.existsSync(assetCatalogPath)) {
      console.warn(`Asset catalog not found at ${assetCatalogPath}`);
      return config;
    }

    // Copy icon files to the asset catalog
    const iconsDir = path.join(config.modRequest.projectRoot, 'assets', 'app-icons');

    try {
      const iconFiles = {
        'icon.png': 'App-Icon-1024x1024@1x.png',
        'icon-dark.png': 'App-Icon-dark-1024x1024@1x.png',
        'icon-tinted.png': 'App-Icon-tinted-1024x1024@1x.png',
        'icon-tinted-dark.png': 'App-Icon-tinted-dark-1024x1024@1x.png',
      };

      Object.entries(iconFiles).forEach(([sourceFile, targetFile]) => {
        const sourcePath = path.join(iconsDir, sourceFile);
        const targetPath = path.join(assetCatalogPath, targetFile);

        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, targetPath);
          console.log(`✅ Copied ${sourceFile} → ${targetFile}`);
        } else {
          console.warn(`⚠️  Icon file not found: ${sourcePath}`);
        }
      });

      // Generate Contents.json with icon variants
      const contentsJson = {
        images: [
          {
            filename: 'App-Icon-1024x1024@1x.png',
            idiom: 'universal',
            platform: 'ios',
            size: '1024x1024',
          },
          {
            appearances: [
              {
                appearance: 'luminosity',
                value: 'dark',
              },
            ],
            filename: 'App-Icon-dark-1024x1024@1x.png',
            idiom: 'universal',
            platform: 'ios',
            size: '1024x1024',
          },
          {
            appearances: [
              {
                appearance: 'luminosity',
                value: 'tinted',
              },
            ],
            filename: 'App-Icon-tinted-1024x1024@1x.png',
            idiom: 'universal',
            platform: 'ios',
            size: '1024x1024',
          },
          {
            appearances: [
              {
                appearance: 'luminosity',
                value: 'dark',
              },
              {
                appearance: 'luminosity',
                value: 'tinted',
              },
            ],
            filename: 'App-Icon-tinted-dark-1024x1024@1x.png',
            idiom: 'universal',
            platform: 'ios',
            size: '1024x1024',
          },
        ],
        info: {
          author: 'expo',
          version: 1,
        },
        properties: {
          'pre-rendered': true,
        },
      };

      const contentsPath = path.join(assetCatalogPath, 'Contents.json');
      fs.writeFileSync(contentsPath, JSON.stringify(contentsJson, null, 2));
      console.log('✅ Generated Contents.json with icon variants');
    } catch (error) {
      console.error('❌ Error setting up iOS icon variants:', error);
    }

    return config;
  });
};
