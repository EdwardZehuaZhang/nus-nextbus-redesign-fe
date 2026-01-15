export interface CanteenVenue {
  id: string;
  name: string;
  coords: { lat: number; lng: number };
  mapsUrl: string;
  locationLabel: string;
  seatingCapacity: number;
  stallsCount: number | null;
  dietary: { halal: boolean; vegetarian: boolean };
  hours: {
    term: { days: string; open?: string; close?: string; closed?: boolean }[];
    vacation: { days: string; open?: string; close?: string; closed?: boolean }[] | null;
  };
  notes?: string[];
  imageSource?: any;
}

export const CANTEENS: CanteenVenue[] = [
  {
    id: 'frontier',
    name: 'Frontier',
    coords: { lat: 1.2964152887081777, lng: 103.78036558548233 },
    mapsUrl: 'https://maps.app.goo.gl/jw7Mjk4D2KktHYUn9',
    locationLabel: 'Faculty of Science',
    seatingCapacity: 700,
    stallsCount: 15,
    dietary: { halal: true, vegetarian: true },
    hours: {
      term: [
        { days: 'Mon–Fri', open: '07:30', close: '20:00' },
        { days: 'Sat', open: '07:30', close: '15:00' },
        { days: 'Sun/PH', closed: true },
      ],
      vacation: [
        { days: 'Mon–Fri', open: '07:00', close: '19:00' },
        { days: 'Sat', open: '07:00', close: '14:00' },
        { days: 'Sun/PH', closed: true },
      ],
    },
    notes: [
      'Some stalls may close earlier (e.g., around 16:00 during term time).',
      'Stalls\' operating hours vary.',
    ],
    imageSource: require('../../assets/images/canteens/Frontier-Canteen.jpg'),
  },
  {
    id: 'central-square',
    name: 'Central Square',
    coords: { lat: 1.2984323093116565, lng: 103.77519859345162 },
    mapsUrl: 'https://maps.app.goo.gl/MYgjheJdHTD9jKBc9',
    locationLabel: 'Yusof Ishak House',
    seatingCapacity: 314,
    stallsCount: 6,
    dietary: { halal: true, vegetarian: true },
    hours: {
      term: [
        { days: 'Mon–Fri', open: '08:00', close: '20:00' },
        { days: 'Sat', open: '08:30', close: '14:30' },
        { days: 'Sun/PH', closed: true },
      ],
      vacation: null,
    },
    notes: [
      'Vacation hours not provided (app should fallback to term hours).',
      'Stalls\' operating hours vary.',
    ],
    imageSource: require('../../assets/images/canteens/Central-Square-Canteen.jpg'),
  },
  {
    id: 'pgp',
    name: 'PGP',
    coords: { lat: 1.2908865499056028, lng: 103.78085687162289 },
    mapsUrl: 'https://maps.app.goo.gl/PqmNey2m16hHDpPXA',
    locationLabel: 'Prince George\'s Park',
    seatingCapacity: 308,
    stallsCount: 11,
    dietary: { halal: false, vegetarian: true },
    hours: {
      term: [
        { days: 'Mon–Fri', open: '07:30', close: '20:00' },
        { days: 'Sat–Sun', open: '08:00', close: '20:00' },
      ],
      vacation: [
        { days: 'Mon–Fri', open: '07:30', close: '20:00' },
        { days: 'Sat–Sun', open: '08:00', close: '20:00' },
      ],
    },
    notes: ['Stalls\' operating hours vary.'],
    imageSource: require('../../assets/images/canteens/PGP-Canteen.jpg'),
  },
  {
    id: 'techno-edge',
    name: 'Techno Edge',
    coords: { lat: 1.2978477549627496, lng: 103.77165198035571 },
    mapsUrl: 'https://maps.app.goo.gl/ojAGuVUECu84u8ub6',
    locationLabel: 'College of Design and Engineering',
    seatingCapacity: 450,
    stallsCount: 12,
    dietary: { halal: true, vegetarian: true },
    hours: {
      term: [
        { days: 'Mon–Fri', open: '07:00', close: '20:00' },
        { days: 'Sat', open: '07:30', close: '14:00' },
        { days: 'Sun/PH', closed: true },
      ],
      vacation: [
        { days: 'Mon–Fri', open: '07:00', close: '20:00' },
        { days: 'Sat', open: '07:30', close: '14:00' },
        { days: 'Sun/PH', closed: true },
      ],
    },
    notes: [
      'Some stalls may operate only during term time.',
      'Stalls\' operating hours vary.',
    ],
    imageSource: require('../../assets/images/canteens/Techno-Edge-Canteen.jpg'),
  },
  {
    id: 'the-deck',
    name: 'The Deck',
    coords: { lat: 1.2944219250418836, lng: 103.77256122716878 },
    mapsUrl: 'https://maps.app.goo.gl/6vRYpgKXM1Vu5k8q7',
    locationLabel: 'College of Design and Engineering',
    seatingCapacity: 450,
    stallsCount: 12,
    dietary: { halal: true, vegetarian: true },
    hours: {
      term: [
        { days: 'Mon–Fri', open: '07:00', close: '20:00' },
        { days: 'Sat', open: '07:30', close: '14:00' },
        { days: 'Sun/PH', closed: true },
      ],
      vacation: [
        { days: 'Mon–Fri', open: '07:00', close: '20:00' },
        { days: 'Sat', open: '07:30', close: '14:00' },
        { days: 'Sun/PH', closed: true },
      ],
    },
    notes: [
      'Some stalls may operate only during term time.',
      'Stalls\' operating hours vary.',
    ],
    imageSource: require('../../assets/images/canteens/The-Deck-Canteen.jpg'),
  },
  {
    id: 'the-terrace',
    name: 'The Terrace',
    coords: { lat: 1.2943811718774203, lng: 103.77433814074732 },
    mapsUrl: 'https://maps.app.goo.gl/Nyb32CXwW5rFmcYj6',
    locationLabel: 'Computing 3 (COM3)',
    seatingCapacity: 756,
    stallsCount: null,
    dietary: { halal: false, vegetarian: false },
    hours: {
      term: [
        { days: 'Mon–Sat', open: '07:30', close: '19:00' },
        { days: 'Sun', closed: true },
      ],
      vacation: [
        { days: 'Mon–Sat', open: '07:30', close: '19:00' },
        { days: 'Sun', closed: true },
      ],
    },
    notes: [
      'Halal/vegetarian options not provided; flags set to false (change to true if confirmed).',
    ],
    imageSource: require('../../assets/images/canteens/The-Terrace-Canteen.png'),
  },
  {
    id: 'fine-food',
    name: 'Fine Food',
    coords: { lat: 1.3040313498428027, lng: 103.77354161780208 },
    mapsUrl: 'https://maps.app.goo.gl/dyAuiDNc71qLok3r9',
    locationLabel: 'UTown (Town Plaza)',
    seatingCapacity: 410,
    stallsCount: 14,
    dietary: { halal: true, vegetarian: false },
    hours: {
      term: [{ days: 'Mon–Sun', open: '08:00', close: '20:30' }],
      vacation: [{ days: 'Mon–Sun', open: '08:00', close: '20:30' }],
    },
    notes: ['Vegetarian options not specified; flag set to false (change to true if confirmed).'],
    imageSource: require('../../assets/images/canteens/Fine-Food-Canteen.jpg'),
  },
  {
    id: 'flavours',
    name: 'Flavours',
    coords: { lat: 1.3044003832968651, lng: 103.77298312942845 },
    mapsUrl: 'https://maps.app.goo.gl/by3nYbH6QMnQFfPg7',
    locationLabel: 'UTown (Stephen Riady Centre)',
    seatingCapacity: 700,
    stallsCount: 11,
    dietary: { halal: true, vegetarian: false },
    hours: {
      term: [{ days: 'Mon–Sun', open: '07:30', close: '20:30' }],
      vacation: [{ days: 'Mon–Sun', open: '07:30', close: '20:30' }],
    },
    notes: ['Vegetarian options not specified; flag set to false (change to true if confirmed).'],
    imageSource: require('../../assets/images/canteens/Flavours-Canteen.jpg'),
  },
];

/**
 * Get color for canteen markers
 * Using a food-themed color distinct from printers/sports
 */
export const getCanteenColor = (): string => {
  return '#E91E63'; // Pink/magenta - distinct from orange (printers) and sports colors
};
