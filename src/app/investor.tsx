import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Investor redirect page - automatically redirects to /demo
 * This provides a clean, memorable URL to share with investors
 */
export default function InvestorPage() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      window.location.replace('/demo');
    }
  }, []);

  return null;
}
