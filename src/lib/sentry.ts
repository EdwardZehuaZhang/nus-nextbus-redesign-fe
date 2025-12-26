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

export const captureException = Sentry.Native.captureException;
export const captureMessage = Sentry.Native.captureMessage;
