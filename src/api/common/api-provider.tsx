import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

export const queryClient = new QueryClient();

export function APIProvider({ children }: { children: React.ReactNode }) {
  // Disabled React Query DevTools initialization to avoid creating insecure WebSocket
  // connections when the app is served over HTTPS in development (fixes WebSocket security error).
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
