/**
 * SVG Bus Icon for Google Maps markers
 * Uses Material Design Icons (MDI) bus icon
 *
 * @param color - Fill color for the bus icon (hex color like '#C77DE2')
 * @param flipHorizontal - Whether to flip the bus horizontally (for reverse direction)
 * @returns SVG string for use with Google Maps marker icon
 */
export const createBusMarkerSVG = (
  color: string = '#274F9C',
  flipHorizontal: boolean = false
): string => {
  // MDI bus icon path (from @mdi/js mdiBus)
  const busIconPath =
    'M18,11H6V6H18M16.5,17A1.5,1.5 0 0,1 15,15.5A1.5,1.5 0 0,1 16.5,14A1.5,1.5 0 0,1 18,15.5A1.5,1.5 0 0,1 16.5,17M7.5,17A1.5,1.5 0 0,1 6,15.5A1.5,1.5 0 0,1 7.5,14A1.5,1.5 0 0,1 9,15.5A1.5,1.5 0 0,1 7.5,17M4,16C4,16.88 4.39,17.67 5,18.22V20A1,1 0 0,0 6,21H7A1,1 0 0,0 8,20V19H16V20A1,1 0 0,0 17,21H18A1,1 0 0,0 19,20V18.22C19.61,17.67 20,16.88 20,16V6C20,2.5 16.42,2 12,2C7.58,2 4,2.5 4,6V16Z';

  // Use scale(-1, 1) for horizontal flip instead of rotation
  const transform = flipHorizontal ? 'scale(-1, 1) translate(-32, 0)' : '';

  return `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <g transform="${transform}">
        <!-- White circle background for visibility -->
        <circle cx="16" cy="16" r="14" fill="white" stroke="${color}" stroke-width="2"/>

        <!-- MDI Bus icon (scaled and centered) -->
        <g transform="translate(4, 4)">
          <path
            d="${busIconPath}"
            fill="${color}"
          />
        </g>

        <!-- Direction arrow pointing forward (right) -->
        <g transform="translate(26, 16)">
          <path
            d="M0,-3 L4,0 L0,3 Z"
            fill="${color}"
          />
        </g>
      </g>
    </svg>
  `.trim();
};

/**
 * Create a data URL from SVG string for use with Google Maps marker
 *
 * @param svgString - SVG markup as string
 * @returns Data URL that can be used as marker icon URL
 */
export const svgToDataURL = (svgString: string): string => {
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgString);
};
