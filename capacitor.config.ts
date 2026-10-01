import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Provisional id: it becomes permanent on the first Google Play upload (see issue #16 for the final name).
  appId: 'com.alessiogarifo.mixsplash',
  appName: 'Mix & Splash',
  webDir: 'dist',
  android: { backgroundColor: '#FFF6E9' },
};

export default config;
