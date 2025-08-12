import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Ascend',
  slug: 'ascend',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#1F2937'
  },
  updates: {
    fallbackToCacheTimeout: 0
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.ascend.app'
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1F2937'
    },
    package: 'com.ascend.app'
  },
  web: {
    favicon: './assets/favicon.png'
  },
  extra: {
    eas: {
      projectId: 'your-project-id'
    }
  },
  plugins: [
    'expo-font'
  ]
};

export default config;