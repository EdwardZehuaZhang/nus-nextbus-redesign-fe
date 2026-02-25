import * as Sentry from '@sentry/react-native';
import { useNavigationContainerRef } from 'expo-router';
import { useEffect } from 'react';

const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

Sentry.init({
  dsn: 'https://384812f105c4a5f3bfcc829c35933009@o4510941200449536.ingest.us.sentry.io/4510941206872064',
  enabled: !__DEV__,
  debug: false,
  tracesSampleRate: 0.2,
  sendDefaultPii: true,
  enableLogs: true,
  integrations: [navigationIntegration],
  // Enable native crash handling
  enableNativeCrashHandling: true,
  enableAutoSessionTracking: true,
});

/**
 * Hook to register the navigation container ref with Sentry.
 * Call this inside the root layout component.
 */
export const useSentryNavigationConfig = () => {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    if (navigationRef) {
      navigationIntegration.registerNavigationContainer(navigationRef);
    }
  }, [navigationRef]);
};

export const captureException = (error: unknown) => {
  Sentry.captureException(error);
};

export const captureMessage = (message: string) => {
  Sentry.captureMessage(message);
};
