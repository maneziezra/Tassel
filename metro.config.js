// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Bundle the on-device disease model (assets/model/cropguard.tflite).
config.resolver.assetExts.push('tflite');

// Tailwind classes (className="...") via NativeWind v4.
module.exports = withNativeWind(config, { input: './global.css' });
