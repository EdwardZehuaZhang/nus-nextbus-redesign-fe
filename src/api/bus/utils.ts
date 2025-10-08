import type { CrowdingLevel, PassengerLoad } from './types';

/**
 * Convert arrival time in seconds to human-readable format
 * @param seconds - Arrival time in seconds (-1 for no estimate)
 * @returns Formatted time string
 */
export const formatArrivalTime = (seconds: number | string): string => {
  const numSeconds =
    typeof seconds === 'string' ? parseInt(seconds, 10) : seconds;

  if (numSeconds === -1) {
    return 'N/A';
  }

  if (numSeconds < 60) {
    return 'Arr';
  }

  const minutes = Math.floor(numSeconds / 60);

  if (minutes === 1) {
    return '1 Min';
  }

  return `${minutes} Min`;
};

/**
 * Convert passenger load to crowding level
 * @param load - Passenger load from API
 * @returns Crowding level for UI
 */
export const passengerLoadToCrowding = (load: PassengerLoad): CrowdingLevel => {
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
    const timeA = parseInt(a.arrivalTime, 10);
    const timeB = parseInt(b.arrivalTime, 10);

    // Handle -1 (no estimate) - put them at the end
    if (timeA === -1) return 1;
    if (timeB === -1) return -1;

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
