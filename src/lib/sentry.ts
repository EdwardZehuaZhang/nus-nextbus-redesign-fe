import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://384812f105c4a5f3bfcc829c35933009@o4510941200449536.ingest.us.sentry.io/4510941206872064',
  enabled: !__DEV__,
  debug: false,
  tracesSampleRate: 0.2,
  sendDefaultPii: true,
  enableLogs: true,
  integrations: [Sentry.feedbackIntegration()],
});

export const captureException = (error: unknown) => {
  Sentry.captureException(error);
};

export const captureMessage = (message: string) => {
  Sentry.captureMessage(message);
};
