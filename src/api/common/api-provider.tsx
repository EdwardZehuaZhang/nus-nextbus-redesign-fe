import { useReactQueryDevTools } from '@dev-plugins/react-query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

export const queryClient = new QueryClient();

export function APIProvider({ children }: { children: React.ReactNode }) {
  // Only enable React Query DevTools in development on non-secure contexts (avoid insecure WebSocket on HTTPS)
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    try {
      const { protocol } = window.location;
      const isSecureContext = protocol === 'https:';
      // Enable devtools only if not served over HTTPS (or when running in native/mobile where window.location may be undefined)
      if (!isSecureContext) {
        useReactQueryDevTools(queryClient);
      }
    } catch (err) {
      // If anything goes wrong, avoid initializing devtools to prevent runtime errors
      // eslint-disable-next-line no-console
      console.warn('Skipping React Query DevTools initialization due to environment constraints');
    }
  }

  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
