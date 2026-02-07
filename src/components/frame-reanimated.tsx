/**
 * Frame Component for Bottom Panel - Optimized with Reanimated Gestures
 * 
 * This component provides the draggable handle for the bottom panel.
 * Uses React Native Reanimated gestures for true native performance.
 */

import React from 'react';
import { View, Platform } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

interface FrameReanimatedProps {
  panGesture: any;
  tapGesture: any;
}

export const FrameReanimated: React.FC<FrameReanimatedProps> = ({ panGesture, tapGesture }) => {
  // For web, we need to render a simple draggable handle
  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: 'grab',
          padding: '12px 0',
        }}
      >
        {/* Expanded hit area for easier dragging */}
        <div
          style={{
            position: 'absolute',
            top: -20,
            left: -40,
            right: -40,
            bottom: -20,
            zIndex: 10,
          }}
        />
        {/* Visible handle */}
        <View
          style={{
            height: 4,
            width: 52,
            borderRadius: 48,
            backgroundColor: '#b6b6b6',
          }}
        />
      </div>
    );
  }

  // For native, use gesture detector
  return (
    <GestureDetector gesture={panGesture}>
      <GestureDetector gesture={tapGesture}>
        <View
          style={{
            alignItems: 'center',
            paddingVertical: 12,
            // Expand hit area
            paddingHorizontal: 40,
            marginHorizontal: -40,
            marginVertical: -12,
          }}
        >
          <View
            style={{
              height: 4,
              width: 52,
              borderRadius: 48,
              backgroundColor: '#b6b6b6',
            }}
          />
        </View>
      </GestureDetector>
    </GestureDetector>
  );
};
