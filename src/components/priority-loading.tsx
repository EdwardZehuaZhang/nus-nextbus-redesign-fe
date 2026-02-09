/**
 * Priority Loading Component
 * 
 * Shows minimal loading state during priority initialization phase
 * Only displays during location fetch and bus stops fetch
 * Hides as soon as nearest stops are ready
 */

import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { AnimatedDots } from '@/components/animated-dots';
import { usePriorityInitialization } from '@/lib/hooks/use-priority-initialization';

interface PriorityLoadingProps {
  onReadyStateChange?: (isReady: boolean) => void;
}

export const PriorityLoadingOverlay: React.FC<PriorityLoadingProps> = ({ 
  onReadyStateChange 
}) => {
  const { phase, isLocationReady, isReady, nearestStops } = usePriorityInitialization();

  // Notify parent when ready state changes
  React.useEffect(() => {
    onReadyStateChange?.(isReady);
  }, [isReady, onReadyStateChange]);

  // Don't show overlay if location is ready
  if (isLocationReady) {
    return null;
  }

  return (
    <View 
      className="absolute inset-0 z-50 flex items-center justify-center bg-white"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
      }}
    >
      <View className="items-center gap-4">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-lg font-semibold text-neutral-700">
          {phase === 'location' ? 'Getting your location' : 'Loading bus stops'}
          <AnimatedDots interval={400} />
        </Text>
        <Text className="text-sm text-neutral-500">
          {phase === 'location' 
            ? 'This will take a second'
            : 'Finding nearest stops...'}
        </Text>
      </View>
    </View>
  );
};

/**
 * Hook to check if we should show the priority loading state
 * Returns true if we're still initializing location/bus stops
 */
export const useShouldShowPriorityLoading = (): boolean => {
  const { isLocationReady } = usePriorityInitialization();
  return !isLocationReady;
};

/**
 * Hook to get the nearest stops from priority initialization
 */
export const usePriorityNearestStops = () => {
  const { nearestStops, isReady } = usePriorityInitialization();
  return { nearestStops, isReady };
};
