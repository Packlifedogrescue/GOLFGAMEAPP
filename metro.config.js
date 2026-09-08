// Metro configuration for Expo.
// The game engine ships as a single bundled HTML file (assets/game.html) that
// the native app loads into a WebView, so register `html` as an asset type.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("html");

module.exports = config;
