const { getDefaultConfig } = require('@expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const defaultConfig = getDefaultConfig(projectRoot);

// Ensure Metro resolves .cjs files which some Firebase packages use.
defaultConfig.resolver.sourceExts = defaultConfig.resolver.sourceExts || [];
if (!defaultConfig.resolver.sourceExts.includes('cjs')) {
  defaultConfig.resolver.sourceExts.push('cjs');
}

module.exports = defaultConfig;
