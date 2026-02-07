import React from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

interface BusMarkerIconProps {
  color?: string;
  flipHorizontal?: boolean;
  arrowRotation?: number;
  size?: number;
}

const BUS_ICON_PATH =
  'M18,11H6V6H18M16.5,17A1.5,1.5 0 0,1 15,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,17M7.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,14A1.5,1.5 0 0,1 9,15.5A1.5,1.5 0 0,1 7.5,17M4,16C4,16.88 4.39,17.67 5,18.22V20A1,1 0 0,0 6,21H7A1,1 0 0,0 8,20V19H16V20A1,1 0 0,0 17,21H18A1,1 0 0,0 19,20V18.22C19.61,17.67 20,16.88 20,16V6C20,2.5 16.42,2 12,2C7.58,2 4,2.5 4,6V16Z';

export const BusMarkerIcon: React.FC<BusMarkerIconProps> = ({
  color = '#274F9C',
  flipHorizontal = false,
  arrowRotation = 0,
  size = 28,
}) => {
  const transform = flipHorizontal ? 'scale(-1,1) translate(-28,0)' : undefined;

  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <G transform={transform}>
        <Circle cx={14} cy={14} r={12} fill="white" stroke={color} strokeWidth={1.75} />

        <G transform="translate(14 14)">
          <G transform="scale(0.8) translate(-12 -12)">
            <Path d={BUS_ICON_PATH} fill={color} />
          </G>
        </G>

        <G transform={`translate(14 14) rotate(${arrowRotation})`}>
          <G transform="translate(8.75 0)">
            <Path d="M0,-2.625 L3.5,0 L0,2.625 Z" fill={color} />
          </G>
        </G>
      </G>
    </Svg>
  );
};
