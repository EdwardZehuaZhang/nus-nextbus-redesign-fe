/* eslint-env node */

const path = require('path');

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Fix for phosphor-react-native
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'jsx', 'js', 'ts', 'tsx', 'json'];

// Ensure .native.tsx files are prioritized over .web.tsx on iOS
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Ensure Metro can resolve dependencies in a monorepo/pnpm setup
config.resolver.nodeModulesPaths = [
	path.resolve(__dirname, 'node_modules'),
	path.resolve(__dirname, '..', 'node_modules'),
];

module.exports = withNativeWind(config, { input: './global.css' });
