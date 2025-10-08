import * as React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

interface PlusIconProps {
  width?: number;
  height?: number;
  fill?: string;
}

export const PlusIcon: React.FC<PlusIconProps> = ({
  width = 20,
  height = 20,
  fill = '#274F9C',
}) => (
  <Svg width={width} height={height} viewBox="0 0 20 20" fill="none">
    <Circle cx="10" cy="10" r="9" stroke={fill} strokeWidth="2" fill="none" />
    <Path
      d="M10 6V14M6 10H14"
      stroke={fill}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
