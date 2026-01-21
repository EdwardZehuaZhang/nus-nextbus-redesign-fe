// Import  global CSS file
import '../../global.css';

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { StyleSheet } from 'react-native';
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { APIProvider } from '@/api';
import { hydrateAuth, loadSelectedTheme } from '@/lib';
import { FavoritesProvider } from '@/lib/contexts/favorites-context';
import '@/lib/sentry';
import { useThemeConfig } from '@/lib/use-theme-config';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(app)',
};

hydrateAuth();
loadSelectedTheme();
// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 500,
  fade: true,
});

export default function RootLayout() {
  const theme = useThemeConfig();
  
  return (
    <GestureHandlerRootView
      style={styles.container}
      className={theme.dark ? `dark` : undefined}
    >
      <KeyboardProvider>
        <ThemeProvider value={theme}>
          <APIProvider>
            <FavoritesProvider>
              <BottomSheetModalProvider>
                <Stack screenOptions={{ headerBackTitle: 'Back' }}>
                  <Stack.Screen name="(app)" options={{ headerShown: false }} />
                  <Stack.Screen name="demo" options={{ headerShown: false }} />
                  <Stack.Screen name="investor" options={{ headerShown: false }} />
                  {/* Explicitly configure Privacy & Terms headers */}
                  <Stack.Screen name="privacy" options={{ headerTitle: '' }} />
                  <Stack.Screen name="terms" options={{ headerTitle: '' }} />
                </Stack>
                <FlashMessage position="top" />
              </BottomSheetModalProvider>
            </FavoritesProvider>
          </APIProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
