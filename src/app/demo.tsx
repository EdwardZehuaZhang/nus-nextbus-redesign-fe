import { useEffect } from 'react';
import { Platform } from 'react-native';

import { isMobileDevice } from '@/lib';

/**
 * Demo page that redirects mobile users to the app
 * For desktop, shows a simple iframe without device frame
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

      {/* Simple iframe wrapper */}
      <div style={styles.frameWrapper}>
        <iframe
          title="NUS NextBus Mobile Demo"
          src="/?embed=1"
          style={styles.iframe}
          allow="clipboard-read; clipboard-write; geolocation; fullscreen"
          sandbox="allow-same-origin allow-scripts allow-forms allow-modals allow-popups allow-presentation allow-pointer-lock"
          loading="eager"
        />
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
    maxWidth: '400px',
    width: '100%',
    height: '844px',
    backgroundColor: '#1a1a1a',
    borderRadius: '40px',
    padding: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  } as React.CSSProperties,
  iframe: {
    width: '100%',
    height: '100%',
    border: 0,
    borderRadius: '30px',
    pointerEvents: 'auto',
    touchAction: 'auto',
    userSelect: 'none',
  } as React.CSSProperties,
};

