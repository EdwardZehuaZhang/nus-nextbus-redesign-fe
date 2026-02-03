import React from 'react';
import { Animated, Pressable, Text } from 'react-native';

interface BubbleProps {
  active: boolean;
  label: string;
  onPress: () => void;
  type?: 'sports' | 'printers' | 'canteens';
}

const BubbleButton: React.FC<BubbleProps> = ({ active, label, onPress, type = 'sports' }) => {
  // Use distinct colors for each type when active
  const activeBackgroundColor = 
    type === 'printers' ? '#FF8C00' : 
    type === 'canteens' ? '#E91E63' : 
    '#274F9C'; // sports default

  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: active ? activeBackgroundColor : '#FFFFFF',
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
};

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
  MIN_HEIGHT = 87,
  MAX_HEIGHT = 804,
}) => {
  const handleToggle = (filterId: string) => {
    onFilterChange({
      ...filters,
      [filterId]: !filters[filterId],
    });
  };

  // Create animated opacity that hides bubbles at MAX_HEIGHT
  // Calculate midpoint between MIN and MAX for fade transition
  const midHeight = Math.round((MIN_HEIGHT + MAX_HEIGHT) / 2);
  
  const animatedOpacity = heightAnimation && heightAnimation.interpolate
    ? heightAnimation.interpolate({
        inputRange: [MIN_HEIGHT, midHeight, MAX_HEIGHT],
        outputRange: [1, 1, 0], // Visible at MIN and normal heights, hidden at MAX
      })
    : new Animated.Value(1);

  // Calculate dynamic bottom position - position bubbles above the panel
  // Use pixel-based values directly for positioning
  const animatedBottom = heightAnimation && heightAnimation.interpolate
    ? heightAnimation.interpolate({
        inputRange: [MIN_HEIGHT, MAX_HEIGHT],
        outputRange: [MIN_HEIGHT + 8, MAX_HEIGHT + 8], // 8 pixels above panel at all times
      })
    : MIN_HEIGHT + 8; // Default fallback in pixels

  const animatedTranslateY = typeof animatedBottom === 'number'
    ? -animatedBottom
    : Animated.multiply(animatedBottom, -1);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 8,
        flexDirection: 'row',
        gap: 8,
        zIndex: 10,
        pointerEvents: 'box-none',
        opacity: animatedOpacity,
        transform: [{ translateY: animatedTranslateY }],
      }}
    >
      <BubbleButton
        active={filters['sports'] ?? false}
        label="Sports"
        onPress={() => handleToggle('sports')}
        type="sports"
      />
      <BubbleButton
        active={filters['printers'] ?? false}
        label="Printers"
        onPress={() => handleToggle('printers')}
        type="printers"
      />
      <BubbleButton
        active={filters['canteens'] ?? false}
        label="Canteens"
        onPress={() => handleToggle('canteens')}
        type="canteens"
      />
    </Animated.View>
  );
};
