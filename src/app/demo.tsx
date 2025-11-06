import 'react-device-frameset/styles/marvel-devices.min.css';

import { useEffect } from 'react';
import { DeviceFrameset } from 'react-device-frameset';
import { Platform } from 'react-native';

import { isMobileDevice } from '@/lib';

/**
 * Demo page that wraps the app in a professional mobile phone frame for desktop viewing
 * Automatically redirects to the actual app on mobile devices
 * Uses react-device-frameset for beautiful, realistic device mockups
 */
export default function DemoPage() {
  // On real mobile devices, redirect to the actual app
  useEffect(() => {
    if (Platform.OS === 'web' && isMobileDevice()) {
      window.location.replace('/?embed=1');
    }
  }, []);

  // Show nothing during SSR or on mobile (before redirect)
  if (
    typeof window === 'undefined' ||
    (Platform.OS === 'web' && isMobileDevice())
  ) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Background */}
      <div style={styles.background} />

      {/* Professional Device Frame */}
      <div style={styles.frameWrapper}>
        <DeviceFrameset device="iPhone X" zoom={0.85}>
          <iframe
            title="NUS NextBus Mobile Demo"
            src="/?embed=1"
            style={styles.iframe}
            allow="clipboard-read; clipboard-write; geolocation; fullscreen"
            sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups allow-presentation allow-pointer-lock"
            loading="eager"
          />
        </DeviceFrameset>
      </div>
    </div>
  );
}

const styles = {
  container: {
    flex: 1,
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: '40px',
    boxSizing: 'border-box',
  } as React.CSSProperties,
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  } as React.CSSProperties,
  frameWrapper: {
    position: 'relative',
    zIndex: 1,
  } as React.CSSProperties,
  iframe: {
    width: '100%',
    height: '100%',
    border: 0,
    pointerEvents: 'auto',
    touchAction: 'auto',
    userSelect: 'none',
  } as React.CSSProperties,
};
