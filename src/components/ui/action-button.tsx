import React from 'react';
import type {
  PressableProps,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type ActionButtonVariant = 'primary' | 'secondary';

type ActionButtonColors = {
  background?: string;
  border?: string;
  text?: string;
};

type Props = Omit<PressableProps, 'style'> & {
  label: string;
  icon?: React.ReactNode;
  variant?: ActionButtonVariant;
  colors?: ActionButtonColors;
  fullWidth?: boolean;
  labelOffsetY?: number;
  iconOffsetY?: number;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export const ActionButton: React.FC<Props> = ({
  label,
  icon,
  variant = 'primary',
  colors,
  fullWidth = true,
  labelOffsetY = 0,
  iconOffsetY = 0,
  containerStyle,
  textStyle,
  disabled,
  ...pressableProps
}) => {
  const baseColors =
    variant === 'primary'
      ? { background: '#274F9C', border: 'transparent', text: '#FFFFFF' }
      : { background: '#FFFFFF', border: '#E5E5E5', text: '#211F26' };

  const resolvedColors = { ...baseColors, ...colors };

  return (
    <Pressable
      {...pressableProps}
      disabled={disabled}
      style={[
        styles.container,
        fullWidth ? styles.fullWidth : null,
        {
          backgroundColor: resolvedColors.background,
          borderColor: resolvedColors.border,
          borderWidth: resolvedColors.border === 'transparent' ? 0 : 1,
          opacity: disabled ? 0.6 : 1,
        },
        containerStyle,
      ]}
    >
      {icon ? (
        <View
          style={[
            styles.icon,
            iconOffsetY ? { transform: [{ translateY: iconOffsetY }] } : null,
          ]}
        >
          {icon}
        </View>
      ) : null}
      <Text
        style={[
          styles.label,
          { color: resolvedColors.text },
          labelOffsetY ? { transform: [{ translateY: labelOffsetY }] } : null,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 36,
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  fullWidth: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
