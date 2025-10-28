import React from 'react';
import { Animated, Pressable } from 'react-native';

interface ToggleSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  value,
  onValueChange,
}) => {
  const animatedValue = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, animatedValue]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1.48, 18.49], // Start position to end position
  });

  const backgroundColor = value ? '#274F9C' : '#E5E5E5';

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={{
        width: 36,
        height: 20,
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 7.41,
        padding: 1.48,
        backgroundColor,
        borderRadius: 45.91,
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={{
          width: 17.03,
          height: 17.03,
          backgroundColor: '#FFFFFF',
          borderRadius: 8.52,
          boxShadow: '0 2.96px 4.44px rgba(0, 0, 0, 0.1)',
          elevation: 3,
          transform: [{ translateX }],
        }}
      />
    </Pressable>
  );
};
