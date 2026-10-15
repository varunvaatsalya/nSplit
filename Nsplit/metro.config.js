const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// @nsplit/shared is a symlink to ../shared (outside this project), so Metro must watch it.
config.watchFolders = [...(config.watchFolders || []), path.resolve(__dirname, '../shared')];

config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

// Add .wasm files to asset extensions for expo-sqlite
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// Enable package exports resolution
config.resolver.unstable_enablePackageExports = true;

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });
