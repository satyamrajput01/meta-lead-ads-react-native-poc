import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext.js';
import { SocketProvider } from './src/context/SocketContext.js';
import { AppNavigator } from './src/navigation/AppNavigator.js';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocketProvider>
          <StatusBar style="dark" />
          <AppNavigator />
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
