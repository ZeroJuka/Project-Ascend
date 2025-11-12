import 'dotenv/config'

export default {
  expo: {
    name: "ASCEND",
    slug: "ascend-financial-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.ascend.financial"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.ascend.financial"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-av",
        {
          "microphonePermission": "Allow ASCEND to access your microphone for voice transcription."
        }
      ]
    ],
    extra: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
      WHISPER_MODEL_URL: process.env.WHISPER_MODEL_URL,
      RECAPTCHA_SITE_KEY: process.env.RECAPTCHA_SITE_KEY,
      RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY,
      APP_NAME: process.env.APP_NAME || "ASCEND",
      APP_VERSION: process.env.APP_VERSION || "1.0.0"
    }
  }
}