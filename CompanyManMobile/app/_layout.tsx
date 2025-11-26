import React, { useContext, useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider, DefaultTheme } from 'react-native-paper'; 
import { Platform } from 'react-native';
import { AuthProvider, AuthContext } from '@/components/authContext'; 
import { OrderProvider } from '@/components/OrderContext';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#306eff',
    surface: '#FFFFFF', 
    elevation: {
      ...DefaultTheme.colors.elevation,
      level1: '#FFFFFF',
      level2: '#FFFFFF',
    }
  },
};

function RootLayoutNav() {
  const auth = useContext(AuthContext);
  const router = useRouter();
  const segments = useSegments(); 

  // Register Service Worker
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }
  }, []);

  if (!auth) {
    return null; 
  }
  
  const { isAuthenticated, loading } = auth; 

  useEffect(() => {
    if (loading) {
      return; 
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      router.replace('/');
    } else if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
    
  }, [isAuthenticated, loading, segments, router]);

  if (loading) {
    return null; 
  }

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}> 
      <AuthProvider>
        <OrderProvider>
          <RootLayoutNav />
        </OrderProvider>
      </AuthProvider>
    </PaperProvider>
  );
}