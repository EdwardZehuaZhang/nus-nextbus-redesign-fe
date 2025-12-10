/**
 * Landmark marker icons for Google Maps using Phosphor icon paths
 */

const DEFAULT_LANDMARK_COLOR = '#274F9C';

// Use the exact filled SVG paths from assets/icons to match native appearance
const ICON_PATHS: Record<
  'hospital' | 'mrt' | 'library' | 'bus-terminal',
  string
> = {
  hospital: `
    <path
      d="M232,108v40a16,16,0,0,1-16,16H164v52a16,16,0,0,1-16,16H108a16,16,0,0,1-16-16V164H40a16,16,0,0,1-16-16V108A16,16,0,0,1,40,92H92V40a16,16,0,0,1,16-16h40a16,16,0,0,1,16,16V92h52A16,16,0,0,1,232,108Z"
      fill="white"
    />
  `.trim(),
  mrt: `
    <path
      d="M156,176V152h20v16a8,8,0,0,1-8,8Zm-16,0V152H116v24Zm36-88a8,8,0,0,0-8-8H88a8,8,0,0,0-8,8v48h96ZM152,24H104A72,72,0,0,0,32,96V208a8,8,0,0,0,8,8H76.58a4,4,0,0,0,3.58-2.21L91.06,192H88a24,24,0,0,1-24-24V88A24,24,0,0,1,88,64h80a24,24,0,0,1,24,24v80a24,24,0,0,1-24,24h-3.06l10.9,21.79a4,4,0,0,0,3.58,2.21H216a8,8,0,0,0,8-8V96A72,72,0,0,0,152,24Zm-4.94,168H108.94l-9.1,18.21a4,4,0,0,0,3.58,5.79h49.16a4,4,0,0,0,3.58-5.79ZM80,168a8,8,0,0,0,8,8h12V152H80Z"
      fill="white"
    />
  `.trim(),
  library: `
    <path
      d="M240,56V200a8,8,0,0,1-8,8H160a24,24,0,0,0-24,23.94,7.9,7.9,0,0,1-5.12,7.55A8,8,0,0,1,120,232a24,24,0,0,0-24-24H24a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8H88a32,32,0,0,1,32,32v87.73a8.17,8.17,0,0,0,7.47,8.25,8,8,0,0,0,8.53-8V80a32,32,0,0,1,32-32h64A8,8,0,0,1,240,56Z"
      fill="white"
    />
  `.trim(),
  'bus-terminal': `
    <path
      d="M248,80v24a8,8,0,0,1-16,0V80a8,8,0,0,1,16,0ZM16,72a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V80A8,8,0,0,0,16,72Zm200-8V208a16,16,0,0,1-16,16H184a16,16,0,0,1-16-16v-8H88v8a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V64A32,32,0,0,1,72,32H184A32,32,0,0,1,216,64ZM104,148a12,12,0,1,0-12,12A12,12,0,0,0,104,148Zm72,0a12,12,0,1,0-12,12A12,12,0,0,0,176,148Zm24-76H56v40H200Z"
      fill="white"
    />
  `.trim(),
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

const createPinMarkerWithIcon = (
  pathData: string,
  color: string = DEFAULT_LANDMARK_COLOR
): string => {
  const width = 40;
  const height = 52;
  const iconSize = 22;
  const iconOffset = 9;

  const iconSVG = `<svg viewBox="0 0 256 256" width="${iconSize}" height="${iconSize}" xmlns="http://www.w3.org/2000/svg">${pathData}</svg>`;

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

export const getLandmarkMarkerSVG = (
  type: Landmark['type'],
  color: string = DEFAULT_LANDMARK_COLOR
): string => {
  const pathData = ICON_PATHS[type] || ICON_PATHS.hospital;
  return createPinMarkerWithIcon(pathData, color);
};
