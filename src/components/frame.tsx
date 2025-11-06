import React from 'react';
import { Platform, StyleSheet, View as RNView } from 'react-native';

import { View } from '@/components/ui';

interface FrameProps {
  onDrag?: (gestureState: { dy: number; vy: number }) => void;
  onDragMove?: (dy: number) => void;
  onDragEnd?: () => void;
}

interface DragState {
  startY: React.MutableRefObject<number>;
  startTime: React.MutableRefObject<number>;
  isDragging: React.MutableRefObject<boolean>;
  setCursor: (cursor: 'grab' | 'grabbing') => void;
}

// Mouse handlers for desktop
function useMouseHandlers(state: DragState, callbacks: FrameProps) {
  const { startY, startTime, isDragging, setCursor } = state;
  const { onDrag, onDragMove, onDragEnd } = callbacks;

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      onDragMove?.(e.clientY - startY.current);
    },
    [isDragging, startY, onDragMove]
  );

  const handleMouseUp = React.useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dy = e.clientY - startY.current;
      // eslint-disable-next-line react-compiler/react-compiler
      isDragging.current = false;
      setCursor('grab');
      onDrag?.({ dy, vy: dy / (Date.now() - startTime.current) });
      onDragEnd?.();

      // Remove global listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    },
    [
      isDragging,
      startY,
      startTime,
      setCursor,
      onDrag,
      onDragEnd,
      handleMouseMove,
    ]
  );

  const handleMouseDown = React.useCallback(
    (e: any) => {
      e.preventDefault();
      startY.current = e.clientY;
      startTime.current = Date.now();
      isDragging.current = true;
      setCursor('grabbing');

      // Attach global listeners for move and up
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [startY, startTime, isDragging, setCursor, handleMouseMove, handleMouseUp]
  );

  return { handleMouseDown, handleMouseMove, handleMouseUp };
}

// Touch handlers for mobile
function useTouchHandlers(state: DragState, callbacks: FrameProps) {
  const { startY, startTime, isDragging, setCursor } = state;
  const { onDrag, onDragMove, onDragEnd } = callbacks;

  const handleTouchStart = React.useCallback(
    (e: any) => {
      const touch = e.touches?.[0] || e;
      // eslint-disable-next-line react-compiler/react-compiler
      startY.current = touch.clientY || touch.pageY;
      startTime.current = Date.now();
      isDragging.current = true;
      setCursor('grabbing');
    },
    [startY, startTime, isDragging, setCursor]
  );

  const handleTouchMove = React.useCallback(
    (e: any) => {
      if (!isDragging.current) return;
      const touch = e.touches?.[0] || e;
      onDragMove?.((touch.clientY || touch.pageY) - startY.current);
    },
    [isDragging, startY, onDragMove]
  );

  const handleTouchEnd = React.useCallback(
    (e: any) => {
      if (!isDragging.current) return;
      const touch = e.changedTouches?.[0] || e;
      const dy = (touch.clientY || touch.pageY) - startY.current;
      isDragging.current = false;
      setCursor('grab');
      onDrag?.({ dy, vy: dy / (Date.now() - startTime.current) });
      onDragEnd?.();
    },
    [isDragging, startY, startTime, setCursor, onDrag, onDragEnd]
  );

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}

// Main hook to manage drag handlers
function useDragHandlers(callbacks: FrameProps) {
  const startY = React.useRef(0);
  const startTime = React.useRef(0);
  const isDragging = React.useRef(false);
  const [cursor, setCursor] = React.useState<'grab' | 'grabbing'>('grab');

  const state = { startY, startTime, isDragging, setCursor };
  const mouseHandlers = useMouseHandlers(state, callbacks);
  const touchHandlers = useTouchHandlers(state, callbacks);

  return { cursor, ...mouseHandlers, ...touchHandlers };
}

// Web frame component
const WebFrame = ({
  cursor,
  handlers,
}: {
  cursor: 'grab' | 'grabbing';
  handlers: ReturnType<typeof useDragHandlers>;
}) => {
  const hitAreaStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-30px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100vw',
    height: '60px',
    cursor,
    userSelect: 'none',
    zIndex: 10,
    touchAction: 'none',
  };

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
        style={hitAreaStyle}
        onMouseDown={handlers.handleMouseDown}
        onTouchStart={handlers.handleTouchStart}
        onTouchMove={handlers.handleTouchMove}
        onTouchEnd={handlers.handleTouchEnd}
      />
      {/* Visible bar */}
      <View
        className="h-1 w-[52px] rounded-[48px]"
        style={{ backgroundColor: '#b6b6b6' }}
      />
    </div>
  );
};

export const Frame = ({ onDrag, onDragMove, onDragEnd }: FrameProps) => {
  const handlers = useDragHandlers({ onDrag, onDragMove, onDragEnd });

  // Use native div for web to ensure mouse events work
  if (Platform.OS === 'web') {
    return <WebFrame cursor={handlers.cursor} handlers={handlers} />;
  }

  return (
    <RNView
      style={styles.container}
      onTouchStart={handlers.handleTouchStart}
      onTouchMove={handlers.handleTouchMove}
      onTouchEnd={handlers.handleTouchEnd}
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
