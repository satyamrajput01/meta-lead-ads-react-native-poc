import { Platform } from 'react-native';

/**
 * Mobile Environment Configuration
 *
 * Networking Rules for React Native:
 * 1. iOS Simulator: Uses `http://localhost:3000` directly.
 * 2. Android Emulator: `localhost` points to the emulator itself! Use `http://10.0.2.2:3000` to reach host machine.
 * 3. Physical Devices (iOS / Android): You MUST use your local LAN IP (e.g., `http://192.168.1.100:3000`)
 *    or your public HTTPS ngrok tunnel URL (e.g., `https://xxxx.ngrok-free.app`).
 */

// Replace this with your computer's LAN IP or ngrok tunnel when testing on a physical phone:
const DEV_LAN_OR_NGROK_URL = '';

const getBaseUrl = (): string => {
  if (DEV_LAN_OR_NGROK_URL) {
    return DEV_LAN_OR_NGROK_URL;
  }

  if (Platform.OS === 'android') {
    // Android emulator special alias for host machine
    return 'http://10.0.2.2:3000';
  }

  // iOS Simulator & Web
  return 'http://localhost:3000';
};

export const API_BASE_URL = getBaseUrl();
export const SOCKET_URL = getBaseUrl();
