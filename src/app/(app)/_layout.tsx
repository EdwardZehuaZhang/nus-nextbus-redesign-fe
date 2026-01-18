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
