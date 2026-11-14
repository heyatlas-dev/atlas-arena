import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.atlas.arena',
  appName: 'ATLAS Arena',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    },
    StatusBar: {
      backgroundColor: '#1e1f22',
      style: 'DARK',
      overlaysWebView: false
    }
  }
};

export default config;
