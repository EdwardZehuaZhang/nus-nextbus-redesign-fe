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
import { useThemeConfig } from '@/lib/use-theme-config';

// Ensure WebSocket uses secure protocol (wss) when the page is served over HTTPS.
// This prevents SecurityError: "An insecure WebSocket connection may not be initiated from a page loaded over HTTPS.".
if (typeof window !== 'undefined' && typeof (window as any).WebSocket !== 'undefined') {
  try {
    const { protocol, host } = window.location || { protocol: '', host: '' };
    const isHttps = protocol === 'https:';
    const NativeWebSocket = (window as any).WebSocket;

    // Create a wrapper constructor that normalizes different URL forms to ws/wss
    const SecureWebSocket = function (this: any, url: string | URL, protocols?: string | string[]) {
      let finalUrl = typeof url === 'string' ? url : url.toString();

      // If it already uses ws:// and we're on HTTPS, upgrade to wss://
      if (/^ws:\/\//i.test(finalUrl) && isHttps) {
        finalUrl = finalUrl.replace(/^ws:\/\//i, 'wss://');
      }

      // If the URL is http(s):// convert to ws(s)://
      if (/^https?:\/\//i.test(finalUrl)) {
        finalUrl = finalUrl.replace(/^https?:\/\//i, isHttps ? 'wss://' : 'ws://');
      }

      // Protocol-relative URL: //host/path
      if (/^\/\//.test(finalUrl)) {
        finalUrl = (isHttps ? 'wss:' : 'ws:') + finalUrl;
      }

      // Absolute path or relative path starting with '/'
      if (/^\//.test(finalUrl)) {
        finalUrl = (isHttps ? 'wss://' : 'ws://') + host + finalUrl;
      }

      // Fallback: if no ws/wss protocol present, assume host relative
      if (!/^wss?:\/\//i.test(finalUrl)) {
        finalUrl = (isHttps ? 'wss://' : 'ws://') + host + '/' + finalUrl.replace(/^\//, '');
      }

      // @ts-ignore
      return new NativeWebSocket(finalUrl, protocols);
    } as unknown as typeof WebSocket;

    // Copy static properties
    Object.keys(NativeWebSocket).forEach((key) => {
      try {
        // @ts-ignore
        (SecureWebSocket as any)[key] = (NativeWebSocket as any)[key];
      } catch (e) {
        // ignore
      }
    });

    // Preserve prototype so instanceof checks still work
    SecureWebSocket.prototype = NativeWebSocket.prototype;

    // Replace global WebSocket with the secure wrapper
    // @ts-ignore
    (window as any).WebSocket = SecureWebSocket;
  } catch (err) {
    // ignore failures in environments where window.location is restricted
    // eslint-disable-next-line no-console
    console.warn('Failed to patch WebSocket for secure contexts', err);
  }
}

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
  return (
    <Providers>
      <Stack>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
    </Providers>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  const theme = useThemeConfig();
  return (
    <GestureHandlerRootView
      style={styles.container}
      className={theme.dark ? `dark` : undefined}
    >
      <KeyboardProvider>
        <ThemeProvider value={theme}>
          <APIProvider>
            <BottomSheetModalProvider>
              {children}
              <FlashMessage position="top" />
            </BottomSheetModalProvider>
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
