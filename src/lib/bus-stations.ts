import { BookOpen, FirstAid, Train, Van } from '@/components/ui/icons';

export type BusStationType =
  | 'mrt'
  | 'library'
  | 'residential'
  | 'academic'
  | 'medical'
  | 'general';

export interface BusStation {
  id: string;
  name: string;
  type: BusStationType;
  icon: React.ComponentType<any>;
  keywords: string[]; // For better search matching
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// Icon mapping based on station type
const getIconForType = (type: BusStationType): React.ComponentType<any> => {
  switch (type) {
    case 'mrt':
      return Train;
    case 'library':
      return BookOpen;
    case 'medical':
      return FirstAid;
    case 'residential':
    case 'academic':
    case 'general':
    default:
      return Van;
  }
};

// Complete bus station database
export const BUS_STATIONS: BusStation[] = [
  {
    id: '1',
    name: "Prince George's Park",
    type: 'residential',
    icon: getIconForType('residential'),
    keywords: ['prince', 'george', 'park', 'pgp', 'residential'],
    coordinates: { lat: 1.29289, lng: 103.78004 },
  },
  {
    id: '2',
    name: 'University Hall',
    type: 'residential',
    icon: getIconForType('residential'),
    keywords: ['university', 'hall', 'uh', 'residential'],
    coordinates: { lat: 1.29700, lng: 103.77900 },
  },
  {
    id: '3',
    name: 'Central Library',
    type: 'library',
    icon: getIconForType('library'),
    keywords: ['central', 'library', 'lib', 'books', 'study'],
    coordinates: { lat: 1.29650, lng: 103.77250 },
  },
  {
    id: '4',
    name: 'Kent Vale',
    type: 'residential',
    icon: getIconForType('residential'),
    keywords: ['kent', 'vale', 'residential', 'housing'],
    coordinates: { lat: 1.29300, lng: 103.76950 },
  },
  {
    id: '5',
    name: 'Opp University Hall',
    type: 'general',
    icon: getIconForType('general'),
    keywords: ['opposite', 'university', 'hall', 'opp'],
    coordinates: { lat: 1.29750, lng: 103.77850 },
  },
  {
    id: '6',
    name: "Prince George's Park Foyer",
    type: 'residential',
    icon: getIconForType('residential'),
    keywords: ['prince', 'george', 'park', 'foyer', 'pgp'],
    coordinates: { lat: 1.29250, lng: 103.78050 },
  },
  {
    id: '7',
    name: 'University Town',
    type: 'academic',
    icon: getIconForType('academic'),
    keywords: ['university', 'town', 'utown', 'residential', 'college'],
    coordinates: { lat: 1.30373, lng: 103.77434 },
  },
  {
    id: '8',
    name: 'Opp NUSS',
    type: 'general',
    icon: getIconForType('general'),
    keywords: ['opposite', 'nuss', 'opp'],
    coordinates: { lat: 1.29200, lng: 103.77800 },
  },
  {
    id: '9',
    name: 'Opp Yusof Ishak House',
    type: 'general',
    icon: getIconForType('general'),
    keywords: ['opposite', 'yusof', 'ishak', 'house', 'opp'],
    coordinates: { lat: 1.29869, lng: 103.77463 },
  },
  {
    id: '10',
    name: 'BIZ 2',
    type: 'academic',
    icon: getIconForType('academic'),
    keywords: ['biz', 'business', 'school', 'building'],
    coordinates: { lat: 1.29363, lng: 103.77534 },
  },
  {
    id: '11',
    name: 'EA',
    type: 'academic',
    icon: getIconForType('academic'),
    keywords: ['ea', 'engineering', 'auditorium'],
    coordinates: { lat: 1.29950, lng: 103.77100 },
  },
  {
    id: '12',
    name: 'Botanic Gardens MRT (PUDO)',
    type: 'mrt',
    icon: getIconForType('mrt'),
    keywords: ['botanic', 'gardens', 'mrt', 'pudo', 'train', 'station'],
    coordinates: { lat: 1.32250, lng: 103.81550 },
  },
  {
    id: '13',
    name: 'Kent Ridge MRT',
    type: 'mrt',
    icon: getIconForType('mrt'),
    keywords: ['kent', 'ridge', 'mrt', 'train', 'station'],
    coordinates: { lat: 1.29350, lng: 103.78450 },
  },
  {
    id: '14',
    name: 'Opp University Health Centre',
    type: 'general',
    icon: getIconForType('general'),
    keywords: ['opposite', 'university', 'health', 'centre', 'medical', 'opp'],
    coordinates: { lat: 1.29850, lng: 103.77550 },
  },
  {
    id: '15',
    name: 'Opp SDE 3',
    type: 'general',
    icon: getIconForType('general'),
    keywords: ['opposite', 'sde', 'school', 'design', 'environment', 'opp'],
    coordinates: { lat: 1.29500, lng: 103.77150 },
  },
  {
    id: '16',
    name: 'Museum',
    type: 'general',
    icon: getIconForType('general'),
    keywords: ['museum', 'heritage', 'culture'],
    coordinates: { lat: 1.30120, lng: 103.77372 },
  },
  {
    id: '17',
    name: 'S 17',
    type: 'academic',
    icon: getIconForType('academic'),
    keywords: ['s17', 'science', 'block', 'building'],
    coordinates: { lat: 1.29700, lng: 103.78150 },
  },
  {
    id: '18',
    name: 'COM 3',
    type: 'academic',
    icon: getIconForType('academic'),
    keywords: ['com3', 'computing', 'computer', 'science'],
    coordinates: { lat: 1.29453, lng: 103.77397 },
  },
  {
    id: '19',
    name: 'TCOMS',
    type: 'academic',
    icon: getIconForType('academic'),
    keywords: ['tcoms', 'tropical', 'marine', 'science'],
    coordinates: { lat: 1.29289, lng: 103.77657 },
  },
  {
    id: '20',
    name: 'Ventus',
    type: 'residential',
    icon: getIconForType('residential'),
    keywords: ['ventus', 'residential', 'hall'],
    coordinates: { lat: 1.29400, lng: 103.77600 },
  },
  {
    id: '21',
    name: 'LT 13',
    type: 'academic',
    icon: getIconForType('academic'),
    keywords: ['lt13', 'lecture', 'theatre', 'theater'],
    coordinates: { lat: 1.29464, lng: 103.77131 },
  },
  {
    id: '22',
    name: 'Kent Ridge Bus Terminal',
    type: 'general',
    icon: getIconForType('general'),
    keywords: ['kent', 'ridge', 'bus', 'terminal', 'interchange'],
    coordinates: { lat: 1.29481, lng: 103.76986 },
  },
  {
    id: '23',
    name: 'SDE 3',
    type: 'academic',
    icon: getIconForType('academic'),
    keywords: ['sde3', 'school', 'design', 'environment', 'architecture'],
    coordinates: { lat: 1.29450, lng: 103.77200 },
  },
  {
    id: '24',
    name: 'College Green',
    type: 'residential',
    icon: getIconForType('residential'),
    keywords: ['college', 'green', 'residential', 'utown'],
    coordinates: { lat: 1.30450, lng: 103.77350 },
  },
  {
    id: '25',
    name: 'LT 27',
    type: 'academic',
    icon: getIconForType('academic'),
    keywords: ['lt27', 'lecture', 'theatre', 'theater'],
    coordinates: { lat: 1.29650, lng: 103.77000 },
  },
  {
    id: '26',
    name: 'Yusof Ishak House',
    type: 'academic',
    icon: getIconForType('academic'),
    keywords: ['yusof', 'ishak', 'house', 'yih', 'building'],
    coordinates: { lat: 1.29869, lng: 103.77463 },
  },
  {
    id: '27',
    name: 'The Japanese Primary School',
    type: 'academic',
    icon: getIconForType('academic'),
    keywords: ['japanese', 'primary', 'school', 'education'],
    coordinates: { lat: 1.30250, lng: 103.76850 },
  },
  {
    id: '28',
    name: 'University Health Centre',
    type: 'medical',
    icon: getIconForType('medical'),
    keywords: ['university', 'health', 'centre', 'medical', 'clinic', 'doctor'],
    coordinates: { lat: 1.29800, lng: 103.77500 },
  },
  {
    id: '29',
    name: 'Opp Kent Ridge MRT',
    type: 'general',
    icon: getIconForType('general'),
    keywords: ['opposite', 'kent', 'ridge', 'mrt', 'opp'],
    coordinates: { lat: 1.29400, lng: 103.78400 },
  },
  {
    id: '30',
    name: 'Opp TCOMS',
    type: 'general',
    icon: getIconForType('general'),
    keywords: ['opposite', 'tcoms', 'tropical', 'marine', 'opp'],
    coordinates: { lat: 1.29250, lng: 103.77700 },
  },
  {
    id: '31',
    name: 'Opp HSSML',
    type: 'general',
    icon: getIconForType('general'),
    keywords: ['opposite', 'hssml', 'humanities', 'social', 'sciences', 'opp'],
    coordinates: { lat: 1.29350, lng: 103.77450 },
  },
  {
    id: '32',
    name: 'Information Technology',
    type: 'academic',
    icon: getIconForType('academic'),
    keywords: ['information', 'technology', 'it', 'computing'],
    coordinates: { lat: 1.29700, lng: 103.77300 },
  },
  {
    id: '33',
    name: 'AS 5',
    type: 'academic',
    icon: getIconForType('academic'),
    keywords: ['as5', 'arts', 'social', 'sciences', 'building'],
    coordinates: { lat: 1.29440, lng: 103.77190 },
  },
  {
    id: '34',
    name: 'Raffles Hall',
    type: 'residential',
    icon: getIconForType('residential'),
    keywords: ['raffles', 'hall', 'residential', 'rh'],
    coordinates: { lat: 1.30050, lng: 103.77150 },
  },
  {
    id: '35',
    name: 'Oei Tiong Ham Building',
    type: 'academic',
    icon: getIconForType('academic'),
    keywords: ['oei', 'tiong', 'ham', 'building', 'oth'],
    coordinates: { lat: 1.29450, lng: 103.77380 },
  },
];

// Search function
export const searchBusStations = (query: string): BusStation[] => {
  if (!query.trim()) {
    return [];
  }

  const searchTerm = query.toLowerCase().trim();

  return BUS_STATIONS.filter((station) => {
    // Search in station name
    const nameMatch = station.name.toLowerCase().includes(searchTerm);

    // Search in keywords
    const keywordMatch = station.keywords.some((keyword) =>
      keyword.toLowerCase().includes(searchTerm)
    );

    return nameMatch || keywordMatch;
  }).sort((a, b) => {
    // Prioritize exact name matches
    const aNameMatch = a.name.toLowerCase().startsWith(searchTerm);
    const bNameMatch = b.name.toLowerCase().startsWith(searchTerm);

    if (aNameMatch && !bNameMatch) return -1;
    if (!aNameMatch && bNameMatch) return 1;

    // Then sort alphabetically
    return a.name.localeCompare(b.name);
  });
};

// Get station by ID
export const getBusStationById = (id: string): BusStation | undefined => {
  return BUS_STATIONS.find((station) => station.id === id);
};

// Get station by name
export const getBusStationByName = (name: string): BusStation | undefined => {
  return BUS_STATIONS.find(
    (station) => station.name.toLowerCase() === name.toLowerCase()
  );
};
