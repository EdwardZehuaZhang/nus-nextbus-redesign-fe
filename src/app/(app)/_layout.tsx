/* eslint-disable react/no-unstable-nested-components */
import { Link, Redirect, SplashScreen, Stack } from 'expo-router';
import React, { useCallback, useEffect } from 'react';

import { Pressable, Text } from '@/components/ui';
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
  if (status === 'signOut') {
    return <Redirect href="/login" />;
  }
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
        name="feed"
        options={{
          title: 'Feed',
          headerRight: () => <CreateNewPostLink />,
        }}
      />
      <Stack.Screen
        name="style"
        options={{
          title: 'Style',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerShown: false,
        }}
      />
    </Stack>
  );
}

const CreateNewPostLink = () => {
  return (
    <Link href="/feed/add-post" asChild>
      <Pressable>
        <Text className="px-3 text-primary-300">Create</Text>
      </Pressable>
    </Link>
  );
};
