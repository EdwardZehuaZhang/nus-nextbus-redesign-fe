import React from 'react';
import { Platform, StyleSheet, View as RNView } from 'react-native';

import { View } from '@/components/ui';

interface FrameProps {
  onDrag?: (gestureState: { dy: number; vy: number }) => void;
  onDragMove?: (dy: number) => void;
  onDragEnd?: () => void;
}

// Hook to manage drag handlers
const useDragHandlers = (
  onDrag?: (gestureState: { dy: number; vy: number }) => void,
  onDragMove?: (dy: number) => void,
  onDragEnd?: () => void
) => {
  const startY = React.useRef(0);
  const startTime = React.useRef(0);
  const isDragging = React.useRef(false);
  const [cursor, setCursor] = React.useState<'grab' | 'grabbing'>('grab');

  const handleTouchStart = (e: any) => {
    const touch = e.touches ? e.touches[0] : e;
    startY.current = touch.clientY || touch.pageY;
    startTime.current = Date.now();
    isDragging.current = true;
    setCursor('grabbing');
    console.log('Touch started at:', startY.current);
  };

  const handleTouchMove = (e: any) => {
    if (!isDragging.current) return;

    const touch = e.touches ? e.touches[0] : e;
    const currentY = touch.clientY || touch.pageY;
    const dy = currentY - startY.current;

    if (onDragMove) {
      onDragMove(dy);
    }
  };

  const handleTouchEnd = (e: any) => {
    if (!isDragging.current) return;

    const touch = e.changedTouches ? e.changedTouches[0] : e;
    const endY = touch.clientY || touch.pageY;
    const dy = endY - startY.current;
    const dt = Date.now() - startTime.current;
    const vy = dy / dt; // velocity in pixels per millisecond

    console.log('Touch ended - dy:', dy, 'velocity:', vy);

    isDragging.current = false;
    setCursor('grab');

    if (onDrag) {
      onDrag({ dy, vy });
    }

    if (onDragEnd) {
      onDragEnd();
    }
  };

  return { cursor, handleTouchStart, handleTouchMove, handleTouchEnd };
};

export const Frame = ({ onDrag, onDragMove, onDragEnd }: FrameProps) => {
  const { cursor, handleTouchStart, handleTouchMove, handleTouchEnd } =
    useDragHandlers(onDrag, onDragMove, onDragEnd);

  // Use native div for web to ensure mouse events work
  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Invisible expanded hit area */}
        <div
          style={{
            position: 'absolute',
            top: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100vw',
            height: '60px',
            cursor: cursor,
            userSelect: 'none',
            zIndex: 10,
          }}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        {/* Visible bar */}
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
      onTouchMove={handleTouchMove}
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
