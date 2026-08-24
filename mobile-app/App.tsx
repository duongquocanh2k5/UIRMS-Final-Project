/**
 * Main App Component
 * Entry point for UIRMS Mobile App
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

// Giữ màn hình chào không bị tắt tự động quá sớm
SplashScreen.preventAutoHideAsync().catch(() => { });

export default function App() {
  useEffect(() => {
    // Ẩn màn hình chào đi sau khi app đã load xong components cơ bản
    const hideSplash = async () => {
      await SplashScreen.hideAsync();
    };
    hideSplash();

    if (typeof document !== 'undefined') {
      document.title = 'UIRMS Mobile App';
    }
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer documentTitle={{ enabled: true, formatter: (options) => `UIRMS - ${options?.route?.name || 'Home'}` }}>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );

}