import type { ExpoConfig } from 'expo/config';

// Everything visible on the device (name, package id, permission prompts)
// is deliberately neutral. The real purpose of the app never appears here.
const CAMERA_TEXT = 'Aparat służy do robienia zdjęć w aplikacji.';
const MIC_TEXT = 'Mikrofon służy do nagrywania notatek głosowych w aplikacji.';
const PHOTOS_TEXT = 'Dostęp do zdjęć pozwala dodać wybrane zdjęcie do notatki.';

const config: ExpoConfig = {
  name: 'Przybornik',
  slug: 'przybornik',
  scheme: 'przybornik',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/covers/przepisy.png',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'pl.przybornik.app',
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription: CAMERA_TEXT,
      NSMicrophoneUsageDescription: MIC_TEXT,
      NSPhotoLibraryUsageDescription: PHOTOS_TEXT,
    },
  },
  android: {
    package: 'pl.przybornik.app',
    allowBackup: false,
    adaptiveIcon: {
      foregroundImage: './assets/covers/przepisy-fg.png',
      backgroundImage: './assets/covers/przepisy-bg.png',
    },
    permissions: ['android.permission.CAMERA', 'android.permission.RECORD_AUDIO', 'android.permission.VIBRATE'],
    blockedPermissions: [
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.READ_CONTACTS',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-camera', { cameraPermission: CAMERA_TEXT, microphonePermission: MIC_TEXT, recordAudioAndroid: true }],
    ['expo-audio', { microphonePermission: MIC_TEXT }],
    ['expo-image-picker', { photosPermission: PHOTOS_TEXT, cameraPermission: CAMERA_TEXT }],
    'expo-sharing',
    './plugins/with-cover-aliases',
  ],
};

export default config;
