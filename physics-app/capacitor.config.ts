import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.physics.learn',
  appName: '物理学习',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
  android: {
    buildOptions: {
      // CI 使用 runner 自带的 Gradle 8.5；本地用 wrapper 也兼容 AGP 8.1
      gradleDistributionType: 'local',
    },
  },
};

export default config;
