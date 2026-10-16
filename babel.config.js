module.exports = function (api) {
  api.cache(true);
  return {
    // NativeWind v4: it is a preset (not a plugin) and needs the jsxImportSource.
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
