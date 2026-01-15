import React from 'react';
import { View, Text } from 'react-native';

interface ClusterCircleProps {
  count: number;
}

export const ClusterCircle: React.FC<ClusterCircleProps> = ({ count }) => {
  return (
    <View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FF6B6B',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
      }}
    >
      <Text style={{ color: 'white', fontWeight: '600', fontSize: 12 }}>
        {count}
      </Text>
    </View>
  );
};
