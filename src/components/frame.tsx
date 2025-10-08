import React from 'react';
import { Platform, StyleSheet, View as RNView } from 'react-native';

import { View } from '@/components/ui';

interface FrameProps {
  onDrag?: (gestureState: { dy: number; vy: number }) => void;
}

export const Frame = ({ onDrag }: FrameProps) => {
  const startY = React.useRef(0);
  const startTime = React.useRef(0);

  const handleTouchStart = (e: any) => {
    const touch = e.touches ? e.touches[0] : e;
    startY.current = touch.clientY || touch.pageY;
    startTime.current = Date.now();
    console.log('Touch started at:', startY.current);
  };

  const handleTouchEnd = (e: any) => {
    const touch = e.changedTouches ? e.changedTouches[0] : e;
    const endY = touch.clientY || touch.pageY;
    const dy = endY - startY.current;
    const dt = Date.now() - startTime.current;
    const vy = dy / dt; // velocity in pixels per millisecond

    console.log('Touch ended - dy:', dy, 'velocity:', vy);

    if (onDrag) {
      onDrag({ dy, vy });
    }
  };

  // Use native div for web to ensure mouse events work
  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
          cursor: 'grab',
        }}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <View
          className="h-1 w-[52px] rounded-[48px]"
          style={{ backgroundColor: '#b6b6b6' }}
        />
      </div>
    );
  }

  return (
    <RNView
      style={styles.container}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <View
        className="h-1 w-[52px] rounded-[48px]"
        style={{ backgroundColor: '#b6b6b6' }}
      />
    </RNView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  } as const,
});
