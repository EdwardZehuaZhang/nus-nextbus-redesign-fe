/**
 * Optimized Bottom Panel Gesture Hook using React Native Reanimated
 * 
 * This hook provides smooth 60fps animations by running all gesture handling
 * and animations on the UI thread (native thread), completely bypassing the
 * JavaScript thread bottleneck.
 * 
 * Key Performance Optimizations:
 * 1. ✅ Native driver - All animations run on UI thread (no JS bridge)
 * 2. ✅ Worklet functions - Gesture handlers run on UI thread
 * 3. ✅ useAnimatedStyle - Style updates bypass React reconciliation
 * 4. ✅ Pixel-based calculations - Direct numeric values (no string interpolation)
 * 5. ✅ Zero re-renders during drag - Animation state lives in native realm
 */

import { useCallback, useMemo } from 'react';
import { Dimensions, Platform } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface BottomPanelConfig {
  minHeightPercent?: number;
  defaultHeightPercent?: number;
  maxHeightPercent?: number;
  onSnapToMin?: () => void;
  onSnapToDefault?: () => void;
  onSnapToMax?: () => void;
}

interface BottomPanelState {
  heightAnimation: any; // Shared value
  animatedStyle: any;
  panGesture: any;
  tapGesture: any;
  snapToHeight: (heightPercent: number) => void;
  currentHeightPercent: () => number;
}

export const useBottomPanelGesture = (config: BottomPanelConfig = {}): BottomPanelState => {
  const {
    minHeightPercent = 5,
    defaultHeightPercent = 39,
    maxHeightPercent = 75,
    onSnapToMin,
    onSnapToDefault,
    onSnapToMax,
  } = config;

  // Get screen dimensions
  const screenHeight = useMemo(() => {
    return Platform.OS === 'web' 
      ? (typeof window !== 'undefined' ? window.innerHeight : 800)
      : Dimensions.get('window').height;
  }, []);

  // Convert percentages to pixels for native calculations
  const MIN_HEIGHT_PX = useMemo(() => Math.round(screenHeight * (minHeightPercent / 100)), [screenHeight, minHeightPercent]);
  const DEFAULT_HEIGHT_PX = useMemo(() => Math.round(screenHeight * (defaultHeightPercent / 100)), [screenHeight, defaultHeightPercent]);
  const MAX_HEIGHT_PX = useMemo(() => Math.round(screenHeight * (maxHeightPercent / 100)), [screenHeight, maxHeightPercent]);

  // Shared value for height - lives on UI thread (no JS bridge overhead)
  const heightPx = useSharedValue(DEFAULT_HEIGHT_PX);
  const startHeightPx = useSharedValue(DEFAULT_HEIGHT_PX);
  const startState = useSharedValue<'MIN' | 'DEFAULT' | 'MAX'>('DEFAULT');

  // Spring configuration for smooth, natural animations
  const springConfig = {
    damping: 20,
    stiffness: 300,
    mass: 0.5,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  };

  // Determine which state we're in based on height
  const determineState = useCallback((height: number): 'MIN' | 'DEFAULT' | 'MAX' => {
    'worklet'; // Run on UI thread
    const distToMin = Math.abs(height - MIN_HEIGHT_PX);
    const distToDefault = Math.abs(height - DEFAULT_HEIGHT_PX);
    const distToMax = Math.abs(height - MAX_HEIGHT_PX);
    const minDist = Math.min(distToMin, distToDefault, distToMax);
    
    if (minDist === distToMin) return 'MIN';
    if (minDist === distToMax) return 'MAX';
    return 'DEFAULT';
  }, [MIN_HEIGHT_PX, DEFAULT_HEIGHT_PX, MAX_HEIGHT_PX]);

  // Snap to target height with callback
  const snapToHeightInternal = useCallback((targetPx: number, callback?: () => void) => {
    'worklet';
    heightPx.value = withSpring(targetPx, springConfig, () => {
      if (callback) {
        runOnJS(callback)();
      }
    });
  }, [heightPx, springConfig]);

  // Public API to snap to height (percentage-based for convenience)
  const snapToHeight = useCallback((heightPercent: number) => {
    const targetPx = Math.round(screenHeight * (heightPercent / 100));
    const clampedPx = Math.max(MIN_HEIGHT_PX, Math.min(MAX_HEIGHT_PX, targetPx));
    heightPx.value = withSpring(clampedPx, springConfig);
  }, [screenHeight, MIN_HEIGHT_PX, MAX_HEIGHT_PX, heightPx, springConfig]);

  // Get current height as percentage
  const currentHeightPercent = useCallback(() => {
    return (heightPx.value / screenHeight) * 100;
  }, [heightPx, screenHeight]);

  // Pan gesture for dragging
  const panGesture = useMemo(() => 
    Gesture.Pan()
      .onStart(() => {
        'worklet';
        // Store starting height and state
        startHeightPx.value = heightPx.value;
        startState.value = determineState(heightPx.value);
      })
      .onUpdate((event) => {
        'worklet';
        // Calculate new height (dragging down = positive translationY, should decrease height)
        const newHeight = startHeightPx.value - event.translationY;
        
        // Clamp and update
        heightPx.value = Math.max(MIN_HEIGHT_PX, Math.min(MAX_HEIGHT_PX, newHeight));
      })
      .onEnd((event) => {
        'worklet';
        // Determine snap target based on starting state and drag direction
        const velocity = event.velocityY;
        const draggedUp = velocity < 0;
        const draggedDown = velocity > 0;
        
        let targetPx: number;
        let callback: (() => void) | undefined;

        // State machine for transitions
        if (startState.value === 'MIN') {
          if (draggedUp) {
            targetPx = DEFAULT_HEIGHT_PX;
            callback = onSnapToDefault;
          } else {
            targetPx = MIN_HEIGHT_PX;
            callback = onSnapToMin;
          }
        } else if (startState.value === 'DEFAULT') {
          if (draggedUp) {
            targetPx = MAX_HEIGHT_PX;
            callback = onSnapToMax;
          } else {
            targetPx = MIN_HEIGHT_PX;
            callback = onSnapToMin;
          }
        } else { // MAX
          if (draggedDown) {
            targetPx = DEFAULT_HEIGHT_PX;
            callback = onSnapToDefault;
          } else {
            targetPx = MAX_HEIGHT_PX;
            callback = onSnapToMax;
          }
        }

        // Snap with callback
        heightPx.value = withSpring(targetPx, springConfig, () => {
          if (callback) {
            runOnJS(callback)();
          }
        });
      }),
    [
      heightPx,
      startHeightPx,
      startState,
      MIN_HEIGHT_PX,
      DEFAULT_HEIGHT_PX,
      MAX_HEIGHT_PX,
      springConfig,
      determineState,
      onSnapToMin,
      onSnapToDefault,
      onSnapToMax,
    ]
  );

  // Tap gesture for quick snap to default
  const tapGesture = useMemo(() =>
    Gesture.Tap()
      .onEnd(() => {
        'worklet';
        const currentState = determineState(heightPx.value);
        
        // Only snap to default if at MIN or MAX
        if (currentState === 'MIN') {
          heightPx.value = withSpring(DEFAULT_HEIGHT_PX, springConfig, () => {
            if (onSnapToDefault) {
              runOnJS(onSnapToDefault)();
            }
          });
        } else if (currentState === 'MAX') {
          heightPx.value = withSpring(DEFAULT_HEIGHT_PX, springConfig, () => {
            if (onSnapToDefault) {
              runOnJS(onSnapToDefault)();
            }
          });
        }
        // If already at DEFAULT, do nothing
      }),
    [heightPx, DEFAULT_HEIGHT_PX, springConfig, determineState, onSnapToDefault]
  );

  // Animated style - updates on UI thread without React re-renders
  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: heightPx.value,
    };
  }, [heightPx]);

  return {
    heightAnimation: heightPx,
    animatedStyle,
    panGesture,
    tapGesture,
    snapToHeight,
    currentHeightPercent,
  };
};
