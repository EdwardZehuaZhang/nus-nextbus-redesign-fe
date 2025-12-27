import Constants from 'expo-constants';
import * as Sentry from 'sentry-expo';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? Constants.expoConfig?.extra?.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    enableInExpoDevelopment: false,
    debug: false,
    tracesSampleRate: 0.2,
  });
}

// Safely export Sentry functions with fallbacks for platforms where Sentry.Native is undefined (e.g., web)
export const captureException = Sentry.Native?.captureException || ((error: any) => {
  if (__DEV__) {
    console.error('[Sentry] captureException called but Sentry.Native is not available:', error);
  }
});

export const captureMessage = Sentry.Native?.captureMessage || ((message: string) => {
  if (__DEV__) {
    console.warn('[Sentry] captureMessage called but Sentry.Native is not available:', message);
  }
});
