import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

interface LocationIconProps {
  width?: number;
  height?: number;
  fill?: string;
}

export const LocationIcon: React.FC<LocationIconProps> = ({
  width = 20,
  height = 20,
  fill = '#274F9C',
}) => (
  <Svg width={width} height={height} viewBox="0 0 20 20" fill="none">
    <Path
      d="M10 2C7.79086 2 6 3.79086 6 6C6 8.5 10 14 10 14C10 14 14 8.5 14 6C14 3.79086 12.2091 2 10 2ZM10 8C8.89543 8 8 7.10457 8 6C8 4.89543 8.89543 4 10 4C11.1046 4 12 4.89543 12 6C12 7.10457 11.1046 8 10 8Z"
      fill={fill}
    />
  </Svg>
);

export const BuildingIcon: React.FC<LocationIconProps> = ({
  width = 20,
  height = 20,
  fill = '#274F9C',
}) => (
  <Svg width={width} height={height} viewBox="0 0 20 20" fill="none">
    <Path
      d="M3 18V4C3 3.45 3.196 2.979 3.588 2.587C3.98 2.195 4.45067 1.99933 5 2H15C15.55 2 16.021 2.196 16.413 2.588C16.805 2.98 17.0007 3.45067 17 4V18H3ZM5 16H7V14H5V16ZM5 12H7V10H5V12ZM5 8H7V6H5V8ZM9 16H11V14H9V16ZM9 12H11V10H9V12ZM9 8H11V6H9V8ZM13 16H15V14H13V16ZM13 12H15V10H13V12ZM13 8H15V6H13V8Z"
      fill={fill}
    />
  </Svg>
);

export const DotIcon: React.FC<LocationIconProps> = ({
  width = 20,
  height = 20,
  fill = '#274F9C',
}) => (
  <Svg width={width} height={height} viewBox="0 0 20 20" fill="none">
    <Path
      d="M10 8C11.1046 8 12 8.89543 12 10C12 11.1046 11.1046 12 10 12C8.89543 12 8 11.1046 8 10C8 8.89543 8.89543 8 10 8Z"
      fill={fill}
    />
  </Svg>
);

export const MenuDotsIcon: React.FC<LocationIconProps> = ({
  width = 20,
  height = 20,
  fill = '#737373',
}) => (
  <Svg width={width} height={height} viewBox="0 0 20 20" fill="none">
    <Path
      d="M10 6C10.5523 6 11 5.55228 11 5C11 4.44772 10.5523 4 10 4C9.44772 4 9 4.44772 9 5C9 5.55228 9.44772 6 10 6Z"
      fill={fill}
    />
    <Path
      d="M10 11C10.5523 11 11 10.5523 11 10C11 9.44772 10.5523 9 10 9C9.44772 9 9 9.44772 9 10C9 10.5523 9.44772 11 10 11Z"
      fill={fill}
    />
    <Path
      d="M10 16C10.5523 16 11 15.5523 11 15C11 14.4477 10.5523 14 10 14C9.44772 14 9 14.4477 9 15C9 15.5523 9.44772 16 10 16Z"
      fill={fill}
    />
  </Svg>
);
