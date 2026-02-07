export type LatLng = { lat: number; lng: number };
export type Checkpoint = { latitude: number; longitude: number };

/**
 * Calculate bearing (angle) from one point to another.
 * @param from - Starting coordinate {lat, lng}
 * @param to - Ending coordinate {lat, lng}
 * @returns Bearing in degrees (0-360, where 0 is North, 90 is East, 180 is South, 270 is West)
 */
export const calculateBearing = (from: LatLng, to: LatLng): number => {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const toDegrees = (radians: number) => (radians * 180) / Math.PI;

  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const dLng = toRadians(to.lng - from.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const bearing = toDegrees(Math.atan2(y, x));

  // Convert to 0-360 range
  return (bearing + 360) % 360;
};

/**
 * Find the nearest upcoming checkpoint for a bus along its route.
 * @param busPos - Current bus position {lat, lng}
 * @param checkpoints - Array of route checkpoints
 * @param direction - Bus direction (1 = forward, 2 = reverse)
 * @returns Next checkpoint or null if not found
 */
export const findNextCheckpoint = (
  busPos: LatLng,
  checkpoints: Checkpoint[],
  direction: 1 | 2
): LatLng | null => {
  if (!checkpoints || checkpoints.length === 0) return null;

  // For reverse direction, reverse the checkpoint array
  const orderedCheckpoints =
    direction === 2 ? [...checkpoints].reverse() : checkpoints;

  // Find the closest checkpoint ahead of the bus
  let minDistance = Infinity;
  let closestIndex = -1;

  orderedCheckpoints.forEach((checkpoint, index) => {
    const distance = Math.sqrt(
      Math.pow(checkpoint.latitude - busPos.lat, 2) +
        Math.pow(checkpoint.longitude - busPos.lng, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  // Return the next checkpoint after the closest one
  if (closestIndex !== -1 && closestIndex < orderedCheckpoints.length - 1) {
    const nextCheckpoint = orderedCheckpoints[closestIndex + 1];
    return { lat: nextCheckpoint.latitude, lng: nextCheckpoint.longitude };
  }

  // If we're at the last checkpoint, return the last one
  if (closestIndex === orderedCheckpoints.length - 1) {
    const checkpoint = orderedCheckpoints[closestIndex];
    return { lat: checkpoint.latitude, lng: checkpoint.longitude };
  }

  return null;
};

/**
 * Get arrow rotation for bus marker based on next checkpoint.
 * @param busPos - Current bus position {lat, lng}
 * @param checkpoints - Array of route checkpoints
 * @param direction - Bus direction (1 = forward, 2 = reverse)
 * @returns Rotation angle in degrees for SVG (0 = right/east)
 */
export const getBusArrowRotation = (
  busPos: LatLng,
  checkpoints: Checkpoint[],
  direction: 1 | 2
): number => {
  const nextCheckpoint = findNextCheckpoint(busPos, checkpoints, direction);
  if (!nextCheckpoint) return 0;

  const bearing = calculateBearing(busPos, nextCheckpoint);
  // Convert bearing to SVG rotation (bearing: 0°=North, 90°=East)
  return bearing - 90;
};
