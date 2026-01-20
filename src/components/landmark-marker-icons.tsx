/**
 * Landmark marker icons for Google Maps using Phosphor icon paths
 */

const DEFAULT_LANDMARK_COLOR = '#274F9C';

// Use the exact filled SVG paths from assets/icons to match native appearance
const ICON_PATHS: Record<
  'hospital' | 'mrt' | 'library' | 'bus-terminal' | 'gym' | 'swimming' | 'badminton' | 'printer',
  string
> = {
  printer: `
    <path
      d="M210.67,72H200V40a8,8,0,0,0-8-8H64a8,8,0,0,0-8,8V72H45.33C31.47,72,20,82.47,20,96.33v55.34C20,165.53,31.47,177,45.33,177H56v35a8,8,0,0,0,8,8H192a8,8,0,0,0,8-8V177h10.67c13.86,0,25.33-11.47,25.33-25.33V96.33C236,82.47,224.53,72,210.67,72ZM72,48H184V72H72ZM184,204H72V160H184Zm36-52.33c0,5.5-4.5,10-10,10H200V152a8,8,0,0,0-8-8H64a8,8,0,0,0-8,8v9.67H45.33c-5.5,0-10-4.5-10-10V96.33c0-5.5,4.5-10,10-10H210.67c5.5,0,10,4.5,10,10ZM176,184a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,184Zm16-68a12,12,0,1,1,12-12A12,12,0,0,1,192,116Z"
      fill="white"
    />
  `.trim(),
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
  gym: `
    <path
      d="M248,120h-8V88a16,16,0,0,0-16-16H208V64a16,16,0,0,0-16-16H168a16,16,0,0,0-16,16v56H104V64A16,16,0,0,0,88,48H64A16,16,0,0,0,48,64v8H32A16,16,0,0,0,16,88v32H8a8,8,0,0,0,0,16h8v32a16,16,0,0,0,16,16H48v8a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V136h48v56a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16v-8h16a16,16,0,0,0,16-16V136h8a8,8,0,0,0,0-16ZM32,168V88H48v80Zm56,24H64V64H88V192Zm80,0V64h24V192Zm56-24H208V88h16Z"
      fill="white"
    />
  `.trim(),
  swimming: `
    <path
      d="M224,156.08V72a16,16,0,0,0-16-16H133.31L99.63,24.66a8,8,0,0,0-11.31,0l-48,48a8,8,0,0,0,0,11.31L72,115.65V56a16,16,0,0,1,16-16h60.69l33.68,31.34a8,8,0,0,0,11.31,0l48-48a8,8,0,0,0,0-11.31l-48-48a8,8,0,0,0-11.31,0l-18.65,18.64A4,4,0,0,0,165,16H88A32,32,0,0,0,56,48V160a4,4,0,0,1-8,0v-8a8,8,0,0,0-16,0v8a20,20,0,0,0,40,0,4,4,0,0,1,8,0v8a20,20,0,0,0,40,0,4,4,0,0,1,8,0v8a20,20,0,0,0,40,0,4,4,0,0,1,8,0v8a20,20,0,0,0,40,0,4,4,0,0,1,8,0v8a8,8,0,0,0,16,0v-8a20,20,0,0,0-16-19.52Z"
      fill="white"
    />
  `.trim(),
  badminton: `
    <path
      d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.62,87.62,0,0,1-6.4,32.94l-44.7-27.49a64,64,0,0,0-50.1-50.1L87.06,38.4A88.15,88.15,0,0,1,216,128ZM40,128a87.62,87.62,0,0,1,6.4-32.94l44.7,27.49a64,64,0,0,0,50.1,50.1l27.49,44.7A88.15,88.15,0,0,1,40,128Z"
      fill="white"
    />
  `.trim(),
};

export interface Landmark {
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  type: 'hospital' | 'mrt' | 'library' | 'bus-terminal' | 'gym' | 'swimming' | 'badminton' | 'printer';
  placeId?: string; // Google Maps Place ID
  googleMapsUrl?: string; // Google Maps share URL
}

export const NUS_LANDMARKS: Landmark[] = [
  {
    name: 'University Health Centre',
    address: '20 Lower Kent Ridge Rd, Singapore 119080',
    coordinates: { lat: 1.2996048925553527, lng: 103.77611014991999 },
    type: 'hospital',
    placeId: 'ChIJSRKyHlga2jER8FRSVqw1Px0',
  },
  {
    name: 'Kent Ridge MRT Station (CC24)',
    address: '301 South Buona Vista Rd, Singapore 118177',
    coordinates: { lat: 1.294322964873385, lng: 103.78439348191023 },
    type: 'mrt',
    placeId: 'ChIJ_9hQHswb2jERDyOL3-rPBxg',
  },
  {
    name: 'NUS Central Library',
    address: '12 Kent Ridge Cres, Singapore 119275',
    coordinates: { lat: 1.2972082837600674, lng: 103.77257701009512 },
    type: 'library',
    placeId: 'ChIJ77M1mP4a2jERRfwA553Qz3E',
  },
  {
    name: 'Kent Ridge Bus Terminal',
    address: '37B Clementi Rd, Singapore 129762',
    coordinates: { lat: 1.2951009420947077, lng: 103.77000879496335 },
    type: 'bus-terminal',
    placeId: 'ChIJbQOuVPka2jERT0AKxPVa-NU',
  },
];

// Sports facilities at NUS
export const NUS_SPORTS_FACILITIES: Landmark[] = [
  // Gyms (Purple markers)
  {
    name: 'NUS Gym',
    address: 'NUS Campus, Singapore',
    coordinates: { lat: 1.299648492407296, lng: 103.77551730005814 },
    type: 'gym',
    googleMapsUrl: 'https://maps.app.goo.gl/QUYgAm1EoXH1hkkG8',
  },
  {
    name: 'NUS Gym',
    address: 'NUS Campus, Singapore',
    coordinates: { lat: 1.3058824627261878, lng: 103.7727738270419 },
    type: 'gym',
    googleMapsUrl: 'https://maps.app.goo.gl/om5tYqp1DeMaHbQi8',
  },
  {
    name: 'NUS Gym',
    address: 'NUS Campus, Singapore',
    coordinates: { lat: 1.3187647548105907, lng: 103.81650587332433 },
    type: 'gym',
    googleMapsUrl: 'https://maps.app.goo.gl/TdHLubua2PbqUxHG8',
  },
  // Swimming pools (Light blue markers)
  {
    name: 'NUS Swimming Pool',
    address: 'NUS Campus, Singapore',
    coordinates: { lat: 1.2995649803342673, lng: 103.77552925831773 },
    type: 'swimming',
    googleMapsUrl: 'https://maps.app.goo.gl/knkXhVnfh1s9xBFL8',
  },
  {
    name: 'NUS Swimming Pool',
    address: 'NUS Campus, Singapore',
    coordinates: { lat: 1.2998213715872569, lng: 103.77596553040573 },
    type: 'swimming',
    googleMapsUrl: 'https://maps.app.goo.gl/8ypSne6R8deuJMmS8',
  },
  {
    name: 'NUS Swimming Pool',
    address: 'NUS Campus, Singapore',
    coordinates: { lat: 1.3054693714472791, lng: 103.77268218249164 },
    type: 'swimming',
    googleMapsUrl: 'https://maps.app.goo.gl/mbH8545MNmXAY3VYA',
  },
  // Badminton courts (Cyan markers)
  {
    name: 'NUS Badminton Court',
    address: 'NUS Campus, Singapore',
    coordinates: { lat: 1.300400807583099, lng: 103.77630734223835 },
    type: 'badminton',
    googleMapsUrl: 'https://maps.app.goo.gl/1d9nT6WV1Ko262z87',
  },
  {
    name: 'NUS Badminton Court',
    address: 'NUS Campus, Singapore',
    coordinates: { lat: 1.304951001316462, lng: 103.77218324944066 },
    type: 'badminton',
    googleMapsUrl: 'https://maps.app.goo.gl/p6wFcHVNifXK6UXj8',
  },
];

const createPinMarkerWithIcon = (
  pathData: string,
  color: string = DEFAULT_LANDMARK_COLOR
): string => {
  const width = 40;
  const height = 52;
  // The pin's "head" is centered at (20, 20) in the 40x52 viewBox.
  // Center the 256x256 icon glyph by scaling into an iconSize square and translating
  // so the glyph sits exactly centered within the pin head.
  const iconSize = 28;
  const iconScale = iconSize / 256;
  const iconTranslateX = 20 - iconSize / 2;
  const iconTranslateY = 20 - iconSize / 2;

  const svgString = `
    <svg width="${width}" height="${height}" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 0C9 0 0 9 0 20C0 35 20 52 20 52C20 52 40 35 40 20C40 9 31 0 20 0Z" fill="${color}"/>
      <g transform="translate(${iconTranslateX}, ${iconTranslateY}) scale(${iconScale})" transform-origin="0 0">
        ${pathData}
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

// Get the default color for a landmark/sports facility type
export const getLandmarkColor = (type: Landmark['type']): string => {
  switch (type) {
    case 'hospital':
      return '#D32F2F'; // Red
    case 'mrt':
      return '#274F9C'; // Blue
    case 'library':
      return '#FF8C00'; // Orange
    case 'bus-terminal':
      return '#00B050'; // Green
    case 'gym':
      return '#A855F7'; // Purple
    case 'swimming':
      return '#87CEEB'; // Light Blue
    case 'badminton':
      return '#06B6D4'; // Cyan
    case 'printer':
      return '#FF8C00'; // Orange
    default:
      return DEFAULT_LANDMARK_COLOR;
  }
};
