/**
 * Landmark marker icons for Google Maps using Phosphor Icons
 */
import React from 'react';
import { FirstAid, Subway, BookOpen, Bus } from 'phosphor-react-native';
import { View, Platform } from 'react-native';

const DEFAULT_LANDMARK_COLOR = '#274F9C';

/**
 * Helper function to render Phosphor icon to SVG string
 * For native/web compatibility - mimics react-dom/server's renderToString
 */
const renderIconToSVG = (IconComponent: React.ComponentType<any>, size: number, color: string, weight: string): string => {
  // Phosphor icons use a standard structure - we manually create the SVG paths
  // This is a simplified version that works for basic icons
  const iconMap: Record<string, string> = {
    'FirstAid': '<path d="M216,88H168V40a8,8,0,0,0-8-8H96a8,8,0,0,0-8,8V88H40a8,8,0,0,0-8,8v64a8,8,0,0,0,8,8H88v48a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V168h48a8,8,0,0,0,8-8V96A8,8,0,0,0,216,88Zm-8,64H160a8,8,0,0,0-8,8v48H104V160a8,8,0,0,0-8-8H48V104H96a8,8,0,0,0,8-8V48h48V96a8,8,0,0,0,8,8h48Z" fill="${color}"/>',
    'Subway': '<path d="M224,72V200a8,8,0,0,1-8,8H192a8,8,0,0,1-8-8V184H72v16a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V72A40,40,0,0,1,72,32H184A40,40,0,0,1,224,72ZM56,72V96H88V72ZM168,72V96h32V72Zm32,56H56v32H200ZM92,156a12,12,0,1,0-12,12A12,12,0,0,0,92,156Zm88,0a12,12,0,1,0-12,12A12,12,0,0,0,180,156Z" fill="${color}"/>',
    'BookOpen': '<path d="M232,56V200a8,8,0,0,1-8,8H160a24,24,0,0,0-24,24,8,8,0,0,1-16,0,24,24,0,0,0-24-24H32a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8H96a32,32,0,0,1,32,32,32,32,0,0,1,32-32h64A8,8,0,0,1,232,56ZM96,192h24a39.81,39.81,0,0,1,8,0.81V80A16,16,0,0,0,112,64H40V192H96Zm120,0V64H176a16,16,0,0,0-16,16v112.81A39.81,39.81,0,0,1,168,192h48Z" fill="${color}"/>',
    'Bus': '<path d="M184,32H72A32,32,0,0,0,40,64V200a16,16,0,0,0,16,16H72a16,16,0,0,0,16-16V192h80v8a16,16,0,0,0,16,16h16a16,16,0,0,0,16-16V64A32,32,0,0,0,184,32ZM56,120V80H96v40Zm104,0H120V80h40ZM92,168a12,12,0,1,1,12-12A12,12,0,0,1,92,168Zm72,0a12,12,0,1,1,12-12A12,12,0,0,1,164,168Z" fill="${color}"/>'
  };
  
  const iconName = IconComponent.name || 'FirstAid';
  const pathData = iconMap[iconName] || iconMap['FirstAid'];
  
  // Return SVG with proper viewBox for Phosphor icons (256x256)
  return `<svg viewBox="0 0 256 256" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${pathData}</svg>`;
};

/**
 * Create a pin marker with a Phosphor icon inside
 */
const createPinMarkerWithIcon = (
  IconComponent: React.ComponentType<any>,
  color: string = DEFAULT_LANDMARK_COLOR
): string => {
  const width = 40;
  const height = 52;
  const iconSize = 22;
  const iconOffset = 9;
  
  // Create the SVG marker with the icon
  // Scaling is handled by Google Maps API via the scaledSize parameter
  const iconSVG = renderIconToSVG(IconComponent, iconSize, 'white', 'fill');
  
  const svgString = `
    <svg width="${width}" height="${height}" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 0C9 0 0 9 0 20C0 35 20 52 20 52C20 52 40 35 40 20C40 9 31 0 20 0Z" fill="${color}"/>
      <g transform="translate(${iconOffset}, ${iconOffset})">
        ${iconSVG}
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
  placeId?: string; // Google Maps Place ID
}

export const NUS_LANDMARKS: Landmark[] = [
  {
    name: 'University Health Centre',
    address: '20 Lower Kent Ridge Rd, Singapore 119080',
    coordinates: { lat: 1.2984648, lng: 103.7760358 },
    type: 'hospital',
    placeId: 'ChIJSRKyHlga2jER8FRSVqw1Px0',
  },
  {
    name: 'Kent Ridge MRT Station (CC24)',
    address: '301 South Buona Vista Rd, Singapore 118177',
    coordinates: { lat: 1.2934291, lng: 103.7846561 },
    type: 'mrt',
    placeId: 'ChIJ_9hQHswb2jERDyOL3-rPBxg',
  },
  {
    name: 'NUS Central Library',
    address: '12 Kent Ridge Cres, Singapore 119275',
    coordinates: { lat: 1.2966106, lng: 103.7722558 },
    type: 'library',
    placeId: 'ChIJ77M1mP4a2jERRfwA553Qz3E',
  },
  {
    name: 'Kent Ridge Bus Terminal',
    address: '37B Clementi Rd, Singapore 129762',
    coordinates: { lat: 1.2946866, lng: 103.7700484 },
    type: 'bus-terminal',
    placeId: 'ChIJbQOuVPka2jERT0AKxPVa-NU',
  },
];

export const getLandmarkMarkerSVG = (
  type: Landmark['type'],
  color: string = DEFAULT_LANDMARK_COLOR
): string => {
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
