import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { useEffect } from 'react';
import { Alert, Linking, View } from 'react-native';
import RNRestart from 'react-native-restart';

import { captureException } from '@/lib/sentry';

const SUPPORT_EMAIL = 'edward.zehua.zhang@gmail.com';
const APP_NAME = 'NUS NextBus';

function buildBugReportMailto(error: Error): string {
  const deviceInfo = [
    `Device: ${Device.modelName ?? 'Unknown'}`,
    `OS: ${Device.osName ?? 'Unknown'} ${Device.osVersion ?? ''}`.trim(),
    `App Version: ${Application.nativeApplicationVersion ?? 'Unknown'} (build ${Application.nativeBuildVersion ?? '?'})`,
  ].join('\n');

  const subject = encodeURIComponent(`${APP_NAME} - Crash Report`);
  const body = encodeURIComponent(
    `Hi,\n\nI encountered a crash in ${APP_NAME}.\n\n` +
      `--- Error ---\n${error.message}\n\n` +
      `--- Stack Trace ---\n${error.stack ?? 'Not available'}\n\n` +
      `--- Device Info ---\n${deviceInfo}\n`
  );

  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

export function showCrashAlert(error: Error, onDismiss?: () => void) {
  captureException(error);

  Alert.alert(
    'Unexpected Error',
    `${APP_NAME} ran into an unexpected error. Would you like to send a bug report to the developer?`,
    [
      {
        text: 'Send Bug Report',
        onPress: () => {
          Linking.openURL(buildBugReportMailto(error)).finally(() => {
            RNRestart.restart();
          });
        },
      },
      {
        text: 'Restart App',
        onPress: () => RNRestart.restart(),
      },
      {
        text: 'Dismiss',
        style: 'cancel',
        onPress: onDismiss,
      },
    ],
    { cancelable: false }
  );
}

// Custom ErrorBoundary exported from root _layout — replaces expo-router's default.
// expo-router calls this component when a route throws, passing error and retry.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  useEffect(() => {
    showCrashAlert(error, retry);
  }, [error, retry]);

  // Blank view while the native alert is on screen
  return <View style={{ flex: 1 }} />;
}

// Call once at startup to catch unhandled JS errors that happen outside React renders
// (e.g. unhandled promise rejections, errors in event handlers).
export function setupGlobalErrorHandler() {
  // ErrorUtils is a React Native global; the types live in @types/react-native
  const previous = (global as typeof global & { ErrorUtils: ErrorUtils }).ErrorUtils.getGlobalHandler();

  (global as typeof global & { ErrorUtils: ErrorUtils }).ErrorUtils.setGlobalHandler(
    (error: Error, isFatal?: boolean) => {
      if (isFatal) {
        // For fatal errors show the native crash alert
        showCrashAlert(error);
      } else {
        // Non-fatal — still capture to Sentry
        captureException(error);
      }
      // Chain the previous handler (Sentry also hooks in here)
      previous?.(error, isFatal);
    }
  );
}

// ErrorUtils type shim (React Native global, not always in @types/react-native)
interface ErrorUtils {
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
}
