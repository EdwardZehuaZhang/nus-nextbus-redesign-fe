/**
 * Helper functions for extracting and displaying internal bus route polylines
 */

import routeCheckpointsData from '../../route-checkpoints.json';
import type { LatLng } from '@/api/google-maps/types';
import type { RouteCode } from '@/api/bus/types';
import { getPickupPoints } from '@/api/bus/api';

interface Checkpoint {
  latitude: number;
  longitude: number;
  PointID: string;
  routeid: number;
}

/**
 * Get all checkpoints for a specific route
 */
export function getRouteCheckpoints(routeCode: RouteCode): Checkpoint[] {
  const checkpoints = (routeCheckpointsData as Record<string, Checkpoint[]>)[routeCode];
  return checkpoints || [];
}

/**
 * Find the checkpoint index closest to a bus stop location
 */
function findClosestCheckpointIndex(
  checkpoints: Checkpoint[],
  stopLocation: LatLng
): number {
  let closestIndex = 0;
  let minDistance = Infinity;

  checkpoints.forEach((checkpoint, index) => {
    const distance = Math.sqrt(
      Math.pow(checkpoint.latitude - stopLocation.lat, 2) +
      Math.pow(checkpoint.longitude - stopLocation.lng, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

/**
 * Extract the route segment between two bus stops
 * Returns the polyline path coordinates in Google Maps format
 */
export async function extractRouteSegment(
  routeCode: RouteCode,
  departureStopName: string, // e.g., 'PGP'
  arrivalStopName: string    // e.g., 'UTOWN'
): Promise<google.maps.LatLngLiteral[]> {
  try {
    // Get all checkpoints for this route
    const allCheckpoints = getRouteCheckpoints(routeCode);
    
    if (!allCheckpoints || allCheckpoints.length === 0) {
      console.error(`No checkpoints found for route ${routeCode}`);
      return [];
    }

    // Get pickup points (bus stops) for this route to find their locations
    const pickupPointsResponse = await getPickupPoints(routeCode);
    const pickupPoints = pickupPointsResponse.PickupPointResult.pickuppoint;

    // Find the departure and arrival stop locations
    const departureStop = pickupPoints.find(p => p.busstopcode === departureStopName);
    const arrivalStop = pickupPoints.find(p => p.busstopcode === arrivalStopName);

    if (!departureStop || !arrivalStop) {
      console.error(`Could not find bus stops: ${departureStopName} or ${arrivalStopName}`);
      return [];
    }

    // Find the checkpoint indices closest to each stop
    const departureIndex = findClosestCheckpointIndex(allCheckpoints, {
      lat: departureStop.lat,
      lng: departureStop.lng
    });
    
    const arrivalIndex = findClosestCheckpointIndex(allCheckpoints, {
      lat: arrivalStop.lat,
      lng: arrivalStop.lng
    });

    console.log(`📍 Route segment extraction for ${routeCode}:`, {
      departureStop: departureStopName,
      arrivalStop: arrivalStopName,
      departureIndex,
      arrivalIndex,
      totalCheckpoints: allCheckpoints.length
    });

    // Extract the segment between the two indices
    let segmentCheckpoints: Checkpoint[];
    
    if (departureIndex <= arrivalIndex) {
      // Normal case: departure before arrival in the array
      segmentCheckpoints = allCheckpoints.slice(departureIndex, arrivalIndex + 1);
    } else {
      // Route wraps around (e.g., circular route)
      segmentCheckpoints = [
        ...allCheckpoints.slice(departureIndex),
        ...allCheckpoints.slice(0, arrivalIndex + 1)
      ];
    }

    // Convert to Google Maps LatLngLiteral format
    const polylinePath: google.maps.LatLngLiteral[] = segmentCheckpoints.map(cp => ({
      lat: cp.latitude,
      lng: cp.longitude
    }));

    console.log(`✅ Extracted ${polylinePath.length} points for route segment`);
    return polylinePath;
    
  } catch (error) {
    console.error('Error extracting route segment:', error);
    return [];
  }
}

/**
 * Create polyline paths for the complete internal route
 * Includes: walking to stop, bus route segment, walking from stop
 */
export async function createInternalRoutePolylines(
  routeCode: RouteCode,
  departureStopName: string,
  arrivalStopName: string,
  walkToStopPolyline?: string, // Encoded polyline from Google Maps
  walkFromStopPolyline?: string // Encoded polyline from Google Maps
): Promise<{
  walkToStop: google.maps.LatLngLiteral[];
  busSegment: google.maps.LatLngLiteral[];
  walkFromStop: google.maps.LatLngLiteral[];
}> {
  // Get the bus route segment
  const busSegment = await extractRouteSegment(routeCode, departureStopName, arrivalStopName);

  // Decode walking polylines if provided, ensure they are always arrays
  let walkToStop: google.maps.LatLngLiteral[] = [];
  let walkFromStop: google.maps.LatLngLiteral[] = [];
  
  try {
    if (walkToStopPolyline && typeof window !== 'undefined' && window.google?.maps?.geometry?.encoding) {
      const decoded = google.maps.geometry.encoding.decodePath(walkToStopPolyline);
      walkToStop = decoded ? decoded.map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() })) : [];
    }
  } catch (error) {
    console.error('Error decoding walkToStop polyline:', error);
    walkToStop = [];
  }
  
  try {
    if (walkFromStopPolyline && typeof window !== 'undefined' && window.google?.maps?.geometry?.encoding) {
      const decoded = google.maps.geometry.encoding.decodePath(walkFromStopPolyline);
      walkFromStop = decoded ? decoded.map(latLng => ({ lat: latLng.lat(), lng: latLng.lng() })) : [];
    }
  } catch (error) {
    console.error('Error decoding walkFromStop polyline:', error);
    walkFromStop = [];
  }

  return {
    walkToStop: Array.isArray(walkToStop) ? walkToStop : [],
    busSegment: Array.isArray(busSegment) ? busSegment : [],
    walkFromStop: Array.isArray(walkFromStop) ? walkFromStop : [],
  };
}
