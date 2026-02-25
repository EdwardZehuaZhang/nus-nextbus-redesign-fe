import { Redirect, SplashScreen, Stack } from 'expo-router';
import React, { useCallback, useEffect } from 'react';

import { useAuth, useIsFirstTime } from '@/lib';

export const unstable_settings = {
  initialRouteName: 'transit',
};

export default function TabLayout() {
  const status = useAuth.use.status();
  const [isFirstTime] = useIsFirstTime();
  const hideSplash = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);
  useEffect(() => {
    if (status !== 'idle') {
      setTimeout(() => {
        hideSplash();
      }, 1000);
    }
  }, [hideSplash, status]);

  // Comment out first time redirect - go directly to transit
  // if (isFirstTime) {
  //   return <Redirect href="/onboarding" />;
  // }
  // Comment out login redirect since auth is handled differently
  // if (status === 'signOut') {
  //   return <Redirect href="/login" />;
  // }
  return (
    <Stack>
      <Stack.Screen
        name="transit"
        options={{
          title: 'Transit',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="navigation"
        options={{
          title: 'Navigation',
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="turn-by-turn-navigation"
        options={{
          title: 'Turn by Turn Navigation',
          headerShown: false,
        }}
      />
    </Stack>
  );
}


import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://384812f105c4a5f3bfcc829c35933009@o4510941200449536.ingest.us.sentry.io/4510941206872064',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,
  integrations: [Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});