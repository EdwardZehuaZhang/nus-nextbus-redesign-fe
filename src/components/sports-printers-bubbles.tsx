import React from 'react';
import { Animated, Pressable, Text } from 'react-native';

interface BubbleProps {
  active: boolean;
  label: string;
  onPress: () => void;
}

const BubbleButton: React.FC<BubbleProps> = ({ active, label, onPress }) => (
  <Pressable
    onPress={onPress}
    style={{
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: active ? '#274F9C' : '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5E5E5',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    }}
  >
    <Text
      style={{
        fontSize: 13,
        fontWeight: '500',
        color: active ? '#FFFFFF' : '#09090B',
        fontFamily: 'Inter',
      }}
    >
      {label}
    </Text>
  </Pressable>
);

interface SportsAndPrintersBubblesProps {
  filters: Record<string, boolean>;
  onFilterChange: (filters: Record<string, boolean>) => void;
  heightAnimation?: Animated.Value;
  MIN_HEIGHT?: number;
  MAX_HEIGHT?: number;
}

export const SportsAndPrintersBubbles: React.FC<
  SportsAndPrintersBubblesProps
> = ({
  filters,
  onFilterChange,
  heightAnimation,
  MIN_HEIGHT = 10,
  MAX_HEIGHT = 92,
}) => {
  const handleToggle = (filterId: string) => {
    onFilterChange({
      ...filters,
      [filterId]: !filters[filterId],
    });
  };

  // Create animated opacity that hides bubbles at MAX_HEIGHT
  const animatedOpacity = heightAnimation
    ? heightAnimation.interpolate({
        inputRange: [MIN_HEIGHT, 70, MAX_HEIGHT],
        outputRange: [1, 1, 0], // Visible at MIN and normal heights, hidden at MAX
      })
    : 1;

  // Calculate dynamic bottom position - position bubbles above the panel
  // Panel height is a percentage, so we position bubbles just above it
  const animatedBottom = heightAnimation
    ? heightAnimation.interpolate({
        inputRange: [MIN_HEIGHT, MAX_HEIGHT],
        outputRange: [`${MIN_HEIGHT + 1}%`, `${MAX_HEIGHT + 2}%`], // 2% above panel at all times
      })
    : '12%';

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: animatedBottom,
        left: 8,
        flexDirection: 'row',
        gap: 8,
        zIndex: 10,
        pointerEvents: 'box-none',
        opacity: animatedOpacity,
      }}
    >
      <BubbleButton
        active={filters['sports'] ?? false}
        label="Sports"
        onPress={() => handleToggle('sports')}
      />
      <BubbleButton
        active={filters['printers'] ?? false}
        label="Printers"
        onPress={() => handleToggle('printers')}
      />
    </Animated.View>
  );
};
