module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ["module:react-native-dotenv", {
        moduleName: "@env",
        path: ".env",
        example: ".env.example",
        blacklist: null,
        whitelist: null,
        safe: true,
        allowUndefined: false
      }]
    ]
  };
};