import React from 'react';

import { Pressable, Text, View } from 'react-native';

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
}

export const SportsAndPrintersBubbles: React.FC<SportsAndPrintersBubblesProps> = ({
  filters,
  onFilterChange,
}) => {
  const handleToggle = (filterId: string) => {
    onFilterChange({
      ...filters,
      [filterId]: !filters[filterId],
    });
  };

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 50,
        left: 20,
        flexDirection: 'row',
        gap: 8,
        zIndex: 10,
        pointerEvents: 'box-none',
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
    </View>
  );
};
