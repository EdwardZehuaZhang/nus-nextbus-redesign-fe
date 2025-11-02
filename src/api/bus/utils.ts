import type { CrowdingLevel, PassengerLoad } from './types';

/**
 * Convert arrival time to human-readable format
 * @param time - Arrival time in minutes (string or number), or "-" for no estimate
 * @returns Formatted time string
 */
export const formatArrivalTime = (time: number | string): string => {
  // Handle "-" or empty string
  if (time === '-' || time === '' || time === null || time === undefined) {
    return 'N/A';
  }

  const minutes = typeof time === 'string' ? parseInt(time, 10) : time;

  // Handle invalid numbers
  if (isNaN(minutes) || minutes < 0) {
    return 'N/A';
  }

  // Less than 1 minute
  if (minutes < 1) {
    return 'Arr';
  }

  // 1 minute
  if (minutes === 1) {
    return '1 m';
  }

  // Multiple minutes
  return `${minutes} m`;
};

/**
 * Convert passenger load to crowding level
 * @param load - Passenger load from API (can be "Low", "Medium", "High", "-", or undefined)
 * @returns Crowding level for UI
 */
export const passengerLoadToCrowding = (load: PassengerLoad): CrowdingLevel => {
  // Handle "-" or undefined passengers (unknown capacity)
  if (!load || load === '-') {
    return 'low'; // Default to low when unknown
  }

  switch (load) {
    case 'Low':
      return 'low';
    case 'Medium':
      return 'medium';
    case 'High':
      return 'high';
    default:
      return 'low';
  }
};

/**
 * Get route color based on route code
 * @param routeCode - Bus route code
 * @param colorFromAPI - Optional color from API (hex without #)
 * @returns Hex color code with #
 */
export const getRouteColor = (
  routeCode: string,
  colorFromAPI?: string
): string => {
  // If color from API is provided, use it
  if (colorFromAPI) {
    return `#${colorFromAPI}`;
  }

  // Fallback color map for when API doesn't provide colors
  const colorMap: Record<string, string> = {
    A1: '#FF0000', // Red
    A2: '#E3CE0B', // Yellow
    D1: '#C77DE2', // Light Purple
    D2: '#6F1B6F', // Dark Purple
    BTC: '#EF8136', // Orange
    L: '#BFBFBF', // Gray
    E: '#00B050', // Green
    K: '#345A9B', // Blue
  };

  return colorMap[routeCode] || '#000000';
};

/**
 * Check if a bus stop is currently active based on operating hours
 * @param dayType - Day type from operating hours
 * @param _scheduleType - Schedule type (Term/Vacation) - currently unused
 * @returns Whether the stop is currently active
 */
export const isStopActive = (
  dayType: string,
  _scheduleType: string
): boolean => {
  // This is a simplified check - in production you'd check actual time
  // For now, we'll just check if it's during term time on weekdays
  const now = new Date();
  const day = now.getDay();

  // Check if it's a weekday (Mon-Fri)
  if (dayType === 'Mon-Fri' && day >= 1 && day <= 5) {
    return true;
  }

  // Check if it's Saturday
  if (dayType === 'Sat' && day === 6) {
    return true;
  }

  // Check if it's Sunday
  if (dayType === 'Sun/PH' && day === 0) {
    return true;
  }

  return false;
};

/**
 * Sort shuttles by arrival time
 * @param shuttles - Array of shuttle services
 * @returns Sorted array with earliest arrivals first
 */
export const sortShuttlesByArrival = <T extends { arrivalTime: string }>(
  shuttles: T[]
): T[] => {
  return [...shuttles].sort((a, b) => {
    // Handle "-" or invalid values - put them at the end
    if (a.arrivalTime === '-' || !a.arrivalTime) return 1;
    if (b.arrivalTime === '-' || !b.arrivalTime) return 1;

    const timeA = parseInt(a.arrivalTime, 10);
    const timeB = parseInt(b.arrivalTime, 10);

    // Handle NaN or negative values - put them at the end
    if (isNaN(timeA) || timeA < 0) return 1;
    if (isNaN(timeB) || timeB < 0) return -1;

    return timeA - timeB;
  });
};

/**
 * Get bus stop code from full name
 * @param name - Bus stop full name
 * @returns Bus stop code
 */
export const getBusStopCode = (name: string): string => {
  const codeMap: Record<string, string> = {
    "Prince George's Park": 'PGP',
    'Kent Ridge Bus Terminal': 'KRB',
    'Lecture Theatre 13': 'LT13',
    'Faculty of Arts & Social Sciences': 'AS5',
    'Business School': 'BIZ2',
    'Central Library': 'CENLIB',
    'Lecture Theatre 27': 'LT27',
    'University Hall': 'UHALL',
    'Opposite University Hall': 'OPPUHALL',
    'Yusof Ishak House': 'YIHHT',
    'NUS Museum': 'MUSEUM',
    'University Town': 'UTOWN',
    'Raffles Hall': 'RAFFLES',
    'Kent Vale': 'KV',
    'School of Computing': 'COM2',
  };

  return codeMap[name] || name;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param params - Coordinates object
 * @param params.lat1 - Latitude of first point
 * @param params.lon1 - Longitude of first point
 * @param params.lat2 - Latitude of second point
 * @param params.lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export const calculateDistance = ({
  lat1,
  lon1,
  lat2,
  lon2,
}: {
  lat1: number;
  lon1: number;
  lat2: number;
  lon2: number;
}): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

/**
 * Convert degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Format distance for display as walking time
 * @param distanceKm - Distance in kilometers
 * @returns Formatted walking time string
 */
export const formatDistance = (distanceKm: number): string => {
  // Average walking speed: 5 km/h = 83.33 meters/min
  const walkingSpeedKmPerHour = 5;
  const walkingTimeMinutes = (distanceKm / walkingSpeedKmPerHour) * 60;

  const roundedMinutes = Math.round(walkingTimeMinutes);

  if (roundedMinutes < 1) {
    return '< 1 min walk';
  }

  return `${roundedMinutes} min${roundedMinutes > 1 ? 's' : ''} walk`;
};
