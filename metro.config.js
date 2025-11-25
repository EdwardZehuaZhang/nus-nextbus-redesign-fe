/* eslint-env node */

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Fix for phosphor-react-native
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'jsx', 'js', 'ts', 'tsx', 'json'];

// Ensure .native.tsx files are prioritized over .web.tsx on iOS
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = withNativeWind(config, { input: './global.css' });
