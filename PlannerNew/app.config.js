// app.config.js
export default {
  expo: {
    name: 'MyPlanner',
    slug: 'myplanner',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.yourcompany.myplanner'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      package: 'com.yourcompany.myplanner',
      versionCode: 1,
      permissions: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_EXTERNAL_STORAGE'
      ]
    },
    web: {
      favicon: './assets/favicon.png'
    },
    plugins: [
      [
        'expo-sqlite',
        {
          androidDatabaseImplementation: 2
        }
      ]
    ],
    extra: {
      eas: {
        projectId: '2f46b593-7e02-4c79-a6d3-ad6033360c49'
      }
    },
    owner: 'fckthssht',
    runtimeVersion: {
      policy: 'appVersion'
    }
  }
};