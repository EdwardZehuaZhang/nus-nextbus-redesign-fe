/**
 * Helper functions for getting transit line colors (MRT, public buses, etc.)
 */

// Singapore MRT Line Colors (official colors)
const MRT_LINE_COLORS: Record<string, string> = {
  // North-South Line (Red)
  'North South Line': '#EE2E24',
  'NSL': '#EE2E24',
  'NS': '#EE2E24',
  
  // East-West Line (Green)
  'East West Line': '#009645',
  'EWL': '#009645',
  'EW': '#009645',
  
  // Circle Line (Orange/Yellow)
  'Circle Line': '#FA9E0D',
  'CCL': '#FA9E0D',
  'CC': '#FA9E0D',
  
  // North-East Line (Purple)
  'North East Line': '#9900AA',
  'NEL': '#9900AA',
  'NE': '#9900AA',
  
  // Downtown Line (Blue)
  'Downtown Line': '#005EC4',
  'DTL': '#005EC4',
  'DT': '#005EC4',
  
  // Thomson-East Coast Line (Brown)
  'Thomson-East Coast Line': '#9D5B25',
  'TEL': '#9D5B25',
  'TE': '#9D5B25',
  
  // Bukit Panjang LRT (Grey)
  'Bukit Panjang LRT': '#748477',
  'BP': '#748477',
  
  // Sengkang-Punggol LRT (Grey)
  'Sengkang Punggol LRT': '#748477',
  'STC': '#748477',
  'PTC': '#748477',
  'SE': '#748477',
  'SW': '#748477',
  'PE': '#748477',
  'PW': '#748477',
};

// Public Bus Color (Neon Green)
export const PUBLIC_BUS_COLOR = '#55DD33';

// Default fallback color
const DEFAULT_TRANSIT_COLOR = '#274F9C';

/**
 * Get the color for an MRT line based on its name
 * @param lineName - Name of the MRT line (e.g., "Downtown Line", "DTL", "DT")
 * @returns Hex color code
 */
export const getMRTLineColor = (lineName: string): string => {
  // Normalize line name (trim and uppercase)
  const normalized = lineName.trim().toUpperCase();
  
  // Check exact match first
  const exactMatch = Object.keys(MRT_LINE_COLORS).find(
    key => key.toUpperCase() === normalized
  );
  if (exactMatch) {
    return MRT_LINE_COLORS[exactMatch];
  }
  
  // Check if line name contains any known line identifier
  const partialMatch = Object.keys(MRT_LINE_COLORS).find(
    key => normalized.includes(key.toUpperCase())
  );
  if (partialMatch) {
    return MRT_LINE_COLORS[partialMatch];
  }
  
  return DEFAULT_TRANSIT_COLOR;
};

/**
 * Determine if a transit line is a public bus (non-NUS bus)
 * @param lineName - Name of the transit line
 * @returns True if it's a public bus
 */
export const isPublicBus = (lineName: string): boolean => {
  // Check if it's a numeric route (public bus) or starts with specific patterns
  const numericPattern = /^\d+[A-Z]?$/; // Matches: 151, 96, 95A, etc.
  return numericPattern.test(lineName.trim());
};

/**
 * Get the appropriate color for a transit line
 * Supports: MRT lines, public buses, and NUS shuttle buses
 * 
 * @param lineName - Name of the transit line (e.g., "Downtown Line", "151", "A1")
 * @param fallbackColor - Optional fallback color if no match found
 * @returns Hex color code
 */
export const getTransitLineColor = (
  lineName: string,
  fallbackColor?: string
): string => {
  // Check if it's a public bus
  if (isPublicBus(lineName)) {
    return PUBLIC_BUS_COLOR;
  }
  
  // Check if it's an MRT line
  const mrtColor = getMRTLineColor(lineName);
  if (mrtColor !== DEFAULT_TRANSIT_COLOR) {
    return mrtColor;
  }
  
  // Use fallback color or default
  return fallbackColor || DEFAULT_TRANSIT_COLOR;
};
