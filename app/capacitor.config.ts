import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mambobot.admin',
  appName: 'mamboBot Admin',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0b0f19'
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      style: 'dark'
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0b0f19'
    }
  }
};

export default config;
