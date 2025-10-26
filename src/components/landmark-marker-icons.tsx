/**
 * Landmark marker icons for Google Maps using Phosphor Icons
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { FirstAid, Subway, BookOpen, Bus } from 'phosphor-react-native';
import { View } from 'react-native';

const DEFAULT_LANDMARK_COLOR = '#274F9C';

/**
 * Create a pin marker with a Phosphor icon inside
 */
const createPinMarkerWithIcon = (
  IconComponent: React.ComponentType<any>,
  color: string = DEFAULT_LANDMARK_COLOR
): string => {
  // Create the SVG marker with the icon
  const svgString = `
    <svg width="40" height="52" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 0C9 0 0 9 0 20C0 35 20 52 20 52C20 52 40 35 40 20C40 9 31 0 20 0Z" fill="${color}"/>
      <g transform="translate(9, 9)">
        ${renderToString(<IconComponent size={22} color="white" weight="fill" />)}
      </g>
    </svg>
  `.trim();

  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgString);
};

export interface Landmark {
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  type: 'hospital' | 'mrt' | 'library' | 'bus-terminal';
}

export const NUS_LANDMARKS: Landmark[] = [
  {
    name: 'University Health Centre',
    address: '20 Lower Kent Ridge Rd, Singapore 119080',
    coordinates: { lat: 1.2984648, lng: 103.7760358 },
    type: 'hospital',
  },
  {
    name: 'Kent Ridge MRT Station (CC24)',
    address: '301 South Buona Vista Rd, Singapore 118177',
    coordinates: { lat: 1.2934291, lng: 103.7846561 },
    type: 'mrt',
  },
  {
    name: 'NUS Central Library',
    address: '12 Kent Ridge Cres, Singapore 119275',
    coordinates: { lat: 1.2966106, lng: 103.7722558 },
    type: 'library',
  },
  {
    name: 'Kent Ridge Bus Terminal',
    address: '37B Clementi Rd, Singapore 129762',
    coordinates: { lat: 1.2946866, lng: 103.7700484 },
    type: 'bus-terminal',
  },
];

export const getLandmarkMarkerSVG = (type: Landmark['type'], color: string = DEFAULT_LANDMARK_COLOR): string => {
  switch (type) {
    case 'hospital':
      return createPinMarkerWithIcon(FirstAid, color);
    case 'mrt':
      return createPinMarkerWithIcon(Subway, color);
    case 'library':
      return createPinMarkerWithIcon(BookOpen, color);
    case 'bus-terminal':
      return createPinMarkerWithIcon(Bus, color);
    default:
      return createPinMarkerWithIcon(FirstAid, color);
  }
};
