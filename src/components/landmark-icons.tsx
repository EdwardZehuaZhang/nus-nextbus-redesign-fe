import React from 'react';
import { renderToString } from 'react-dom/server';
import { FirstAid, Bus, Subway, BookOpen } from 'phosphor-react';

// Create landmark marker using Phosphor Icons matching bus marker style
const createLandmarkSVG = (
  IconComponent: React.ComponentType<any>,
  color: string = '#274F9C'
) => {
  const iconElement = (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer circle (white border) */}
      <circle cx="20" cy="20" r="18" fill="white" stroke={color} strokeWidth="2" />
      {/* Inner circle (colored background) */}
      <circle cx="20" cy="20" r="15" fill={color} />
      {/* Icon */}
      <g transform="translate(20, 20)">
        <g transform="translate(-12, -12)">
          <IconComponent size={24} color="white" weight="bold" />
        </g>
      </g>
    </svg>
  );
  
  return renderToString(iconElement);
};

// Hospital/Medical icon (First Aid)
export const createHospitalIcon = (color: string = '#274F9C') => {
  return createLandmarkSVG(FirstAid, color);
};

// MRT/Metro icon (Subway)
export const createMRTIcon = (color: string = '#274F9C') => {
  return createLandmarkSVG(Subway, color);
};

// Library icon (Book Open)
export const createLibraryIcon = (color: string = '#274F9C') => {
  return createLandmarkSVG(BookOpen, color);
};

// Bus Terminal icon (Bus)
export const createBusTerminalIcon = (color: string = '#274F9C') => {
  return createLandmarkSVG(Bus, color);
};
