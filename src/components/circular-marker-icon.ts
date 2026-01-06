/**
 * SVG Circular Marker Icons for Sports and Printers
 * Creates 24x24px circular markers with darker borders, distinct from map pins
 *
 * @param type - Type of marker ('gym', 'swimming', 'badminton', 'printer')
 * @param color - Fill color for the marker (hex color like '#FF8C00')
 * @returns SVG string for use with Google Maps marker icon
 */

// Filled icon paths for sports facilities and printers (from Phosphor Icons - Fill weight)
const ICON_PATHS = {
  // Gym/Dumbbell icon - Filled (from Phosphor Icons)
  gym: 'M248,120h-8V88a16,16,0,0,0-16-16H208V64a16,16,0,0,0-16-16H168a16,16,0,0,0-16,16v56H104V64A16,16,0,0,0,88,48H64A16,16,0,0,0,48,64v8H32A16,16,0,0,0,16,88v32H8a8,8,0,0,0,0,16h8v32a16,16,0,0,0,16,16H48v8a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V136h48v56a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16v-8h16a16,16,0,0,0,16-16V136h8a8,8,0,0,0,0-16ZM32,168V88H48v80Zm56,24H64V64H88V192Zm80,0V64h24V192Zm56-24H208V88h16Z',

  // Swimming/Waves icon - Filled (from Phosphor Icons)
  swimming:
    'M232,160v16a8,8,0,0,1-8,8,24,24,0,0,1-24-24,8,8,0,0,0-16,0,24,24,0,0,1-24,24,24,24,0,0,1-24-24,8,8,0,0,0-16,0,24,24,0,0,1-24,24,24,24,0,0,1-24-24,8,8,0,0,0-16,0,24,24,0,0,1-24,24,8,8,0,0,1-8-8V160a8,8,0,0,1,16,0,8,8,0,0,0,8,8,8,8,0,0,0,8-8,24,24,0,0,1,24-24,24,24,0,0,1,24,24,8,8,0,0,0,16,0,24,24,0,0,1,24-24,24,24,0,0,1,24,24,8,8,0,0,0,16,0,24,24,0,0,1,24-24,24,24,0,0,1,24,24,8,8,0,0,0,8,8,8,8,0,0,0,8-8A8,8,0,0,1,232,160Zm0,40v16a8,8,0,0,1-8,8,24,24,0,0,1-24-24,8,8,0,0,0-16,0,24,24,0,0,1-24,24,24,24,0,0,1-24-24,8,8,0,0,0-16,0,24,24,0,0,1-24,24,24,24,0,0,1-24-24,8,8,0,0,0-16,0,24,24,0,0,1-24,24,8,8,0,0,1-8-8V200a8,8,0,0,1,16,0,8,8,0,0,0,8,8,8,8,0,0,0,8-8,24,24,0,0,1,24-24,24,24,0,0,1,24,24,8,8,0,0,0,16,0,24,24,0,0,1,24-24,24,24,0,0,1,24,24,8,8,0,0,0,16,0,24,24,0,0,1,24-24,24,24,0,0,1,24,24,8,8,0,0,0,8,8,8,8,0,0,0,8-8A8,8,0,0,1,232,200ZM175.9,106.6a78.2,78.2,0,0,0,8.6-8.2,4.1,4.1,0,0,0,.3-5.4,48,48,0,0,0-67.8-67.8,4.1,4.1,0,0,0-5.4.3,78.2,78.2,0,0,0-8.2,8.6L89.8,20.5a8,8,0,0,0-11.3,0L23.5,75.5a8,8,0,0,0,0,11.3L38,101.4a78.2,78.2,0,0,0-8.6,8.2,4.1,4.1,0,0,0-.3,5.4,48,48,0,0,0,67.8,67.8,4.1,4.1,0,0,0,5.4-.3,78.2,78.2,0,0,0,8.2-8.6l13.6,13.6a8,8,0,0,0,11.3,0l55-55a8,8,0,0,0,0-11.3Z',

  // Badminton/Tennis Ball icon - Filled (from Phosphor Icons)
  badminton:
    'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,16a88,88,0,0,1,53.92,18.5L138.67,101.8a71.23,71.23,0,0,0-19.64-3.66L162.28,54.9A87.42,87.42,0,0,1,216,128a88.11,88.11,0,0,1-8.5,37.92L164.2,122.67a71.23,71.23,0,0,0,3.66-19.64l43.24-43.25A87.42,87.42,0,0,1,216,128a88,88,0,0,1-88,88,88,88,0,0,1-53.92-18.5l43.25-43.3a71.23,71.23,0,0,0,19.64,3.66L93.72,201.1A87.42,87.42,0,0,1,40,128,88.11,88.11,0,0,1,48.5,90.08L91.8,133.33a71.23,71.23,0,0,0-3.66,19.64L44.9,196.22A87.42,87.42,0,0,1,40,128,88,88,0,0,1,128,40Z',

  // Printer icon - Filled (from Phosphor Icons)
  printer:
    'M240,96.8c0-16.1-13.3-29.3-29.5-29.3H200V40a8,8,0,0,0-8-8H64a8,8,0,0,0-8,8V67.5H45.5C29.3,67.5,16,80.7,16,96.8v55.4c0,16.1,13.3,29.3,29.5,29.3H56v35a8,8,0,0,0,8,8H192a8,8,0,0,0,8-8V181.5h10.5c16.2,0,29.5-13.2,29.5-29.3ZM72,48H184V67.5H72ZM184,208H72V149h112Zm40-55.8c0,7.8-6.4,14.2-14.2,14.2H200v-9.9c0-4.4-3.6-8-8-8H64c-4.4,0-8,3.6-8,8v9.9H45.5c-7.8,0-14.2-6.4-14.2-14.2V96.8c0-7.8,6.4-14.2,14.2-14.2h165c7.8,0,14.2,6.4,14.2,14.2ZM192,116a12,12,0,1,1,12-12A12,12,0,0,1,192,116Z',
};

export const createCircularMarkerSVG = (
  type: 'gym' | 'swimming' | 'badminton' | 'printer',
  color: string = '#FF8C00'
): string => {
  const iconPath = ICON_PATHS[type];
  
  // Darker border color (darker shade of the main color)
  const borderColor = darkenColor(color, 0.3);
  
  return `
    <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
      <!-- White background circle -->
      <circle cx="15" cy="15" r="13" fill="white" stroke="${borderColor}" stroke-width="2.5"/>
      
      <!-- Colored circle -->
      <circle cx="15" cy="15" r="10.5" fill="${color}"/>
      
      <!-- Icon (Phosphor icons use 256x256 viewBox) -->
      <g transform="translate(15, 15)">
        <g transform="scale(0.05859375) translate(-128, -128)">
          <path
            d="${iconPath}"
            fill="white"
          />
        </g>
      </g>
    </svg>
  `.trim();
};

/**
 * Darken a hex color by a given amount
 * @param color - Hex color string (e.g., '#FF8C00')
 * @param amount - Amount to darken (0-1, where 0.3 = 30% darker)
 * @returns Darkened hex color string
 */
function darkenColor(color: string, amount: number): string {
  // Remove # if present
  const hex = color.replace('#', '');
  
  // Parse RGB components
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Darken each component
  const newR = Math.round(r * (1 - amount));
  const newG = Math.round(g * (1 - amount));
  const newB = Math.round(b * (1 - amount));
  
  // Convert back to hex
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Create a data URL from SVG string for use with Google Maps marker
 *
 * @param svgString - SVG markup as string
 * @returns Data URL that can be used as marker icon URL
 */
export const svgToDataURL = (svgString: string): string => {
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgString);
};
