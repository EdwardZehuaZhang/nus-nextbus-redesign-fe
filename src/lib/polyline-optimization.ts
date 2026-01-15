import simplify from 'simplify-js';

export function simplifyPolyline(
  coordinates: Array<{ latitude: number; longitude: number }>,
  zoomLevel: number
): Array<{ latitude: number; longitude: number }> {
  const tolerance = zoomLevel < 15 ? 0.01 : zoomLevel < 16 ? 0.005 : zoomLevel < 17 ? 0.002 : 0.001;

  const points = coordinates.map((c) => ({ x: c.longitude, y: c.latitude }));
  const simplified = simplify(points, tolerance);

  return simplified.map((p) => ({ latitude: p.y, longitude: p.x }));
}
