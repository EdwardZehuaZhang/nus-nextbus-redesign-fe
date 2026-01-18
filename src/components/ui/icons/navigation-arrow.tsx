import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

interface NavigationArrowIconProps {
  width?: number;
  height?: number;
  fill?: string;
}

export const NavigationArrowIcon: React.FC<NavigationArrowIconProps> = ({
  width = 16,
  height = 16,
  fill = '#FFFFFF',
}) => (
  <Svg width={width} height={height} viewBox="0 0 20 20" fill="none">
    <Path
      d="M19.375 9.4984C19.3731 9.7625 19.2863 10.019 19.1275 10.23C18.9687 10.441 18.7462 10.5954 18.4929 10.6703L18.4773 10.675L12.3836 12.3812L10.6773 18.475L10.6726 18.4906C10.5976 18.7438 10.4432 18.9662 10.2323 19.125C10.0213 19.2838 9.76483 19.3706 9.50076 19.3726H9.47732C9.21837 19.375 8.96524 19.2958 8.75389 19.1462C8.54254 18.9965 8.38372 18.7841 8.29998 18.539L3.20311 4.79762C3.20146 4.79357 3.20015 4.78938 3.1992 4.78512C3.12303 4.56389 3.11048 4.32573 3.16297 4.09772C3.21546 3.86972 3.3309 3.66102 3.49613 3.49538C3.66137 3.32973 3.86978 3.21379 4.09766 3.16073C4.32553 3.10768 4.56373 3.11965 4.78514 3.19527L4.79764 3.19918L18.5414 8.29762C18.7902 8.38268 19.0054 8.54509 19.1553 8.76113C19.3053 8.97717 19.3823 9.23551 19.375 9.4984Z"
      fill={fill}
    />
  </Svg>
);

export const NavigationArrowWhite: React.FC<Omit<NavigationArrowIconProps, 'fill'>> = ({
  width = 16,
  height = 16,
}) => <NavigationArrowIcon width={width} height={height} fill="#FFFFFF" />;
