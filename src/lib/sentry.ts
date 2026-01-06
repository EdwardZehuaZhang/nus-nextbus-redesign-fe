import Constants from 'expo-constants';

// Safely import Sentry only if available
let Sentry: any = null;
try {
  Sentry = require('sentry-expo');
} catch (error) {
  console.warn('[Sentry] Failed to import sentry-expo:', error);
}

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? Constants.expoConfig?.extra?.SENTRY_DSN;

if (dsn && Sentry) {
  try {
    Sentry.init({
      dsn,
      enableInExpoDevelopment: false,
      debug: false,
      tracesSampleRate: 0.2,
    });
  } catch (error) {
    console.warn('[Sentry] Failed to initialize Sentry:', error);
  }
}

// Safely export Sentry functions with fallbacks
export const captureException = (error: any) => {
  if (Sentry?.Native?.captureException) {
    Sentry.Native.captureException(error);
  } else if (__DEV__) {
    console.error('[Sentry] captureException called but Sentry.Native is not available:', error);
  }
};

export const captureMessage = (message: string) => {
  if (Sentry?.Native?.captureMessage) {
    Sentry.Native.captureMessage(message);
  } else if (__DEV__) {
    console.warn('[Sentry] captureMessage called but Sentry.Native is not available:', message);
  }
};
