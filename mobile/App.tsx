import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SocketProvider } from './src/context/SocketContext';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';

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