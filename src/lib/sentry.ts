import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? Constants.expoConfig?.extra?.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    debug: __DEV__,
    tracesSampleRate: 0.2,
    enabled: !__DEV__,
  });
}

export const captureException = (error: unknown) => {
  Sentry.captureException(error);
};

export const captureMessage = (message: string) => {
  Sentry.captureMessage(message);
};
