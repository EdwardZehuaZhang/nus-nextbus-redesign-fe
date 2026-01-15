import { useMemo } from 'react';
import Supercluster from 'supercluster';

export interface BusStopMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface MapBounds {
  ne: { lat: number; lng: number };
  sw: { lat: number; lng: number };
}

export interface ClusterDisplayItem {
  id: string;
  latitude: number;
  longitude: number;
  isCluster: boolean;
  clusterCount?: number;
  clusterId?: number;
}

export function useMapClustering(
  markers: BusStopMarker[],
  zoomLevel: number,
  mapBounds?: MapBounds
): { displayMarkers: ClusterDisplayItem[] } {
  const supercluster = useMemo(() => {
    const instance = new Supercluster({
      radius: 60,
      maxZoom: 17,
      minZoom: 0,
    });

    const features = markers.map((m) => ({
      type: 'Feature' as const,
      properties: { id: m.id, name: m.name },
      geometry: {
        type: 'Point' as const,
        coordinates: [m.longitude, m.latitude],
      },
    }));

    instance.load(features);
    return instance;
  }, [markers]);

  const displayMarkers = useMemo(() => {
    if (!mapBounds) return [];
    const bbox: [number, number, number, number] = [
      mapBounds.sw.lng,
      mapBounds.sw.lat,
      mapBounds.ne.lng,
      mapBounds.ne.lat,
    ];

    const clusters = supercluster.getClusters(bbox, Math.floor(zoomLevel));

    return clusters.map((c: any) => {
      if (c.properties && c.properties.cluster) {
        return {
          id: `cluster-${c.properties.cluster_id}`,
          latitude: c.geometry.coordinates[1],
          longitude: c.geometry.coordinates[0],
          isCluster: true,
          clusterCount: c.properties.point_count,
          clusterId: c.properties.cluster_id,
        } as ClusterDisplayItem;
      }
      return {
        id:
          c.properties?.id ??
          `${c.geometry.coordinates[1]}-${c.geometry.coordinates[0]}`,
        latitude: c.geometry.coordinates[1],
        longitude: c.geometry.coordinates[0],
        isCluster: false,
      } as ClusterDisplayItem;
    });
  }, [supercluster, mapBounds, zoomLevel]);

  return { displayMarkers };
}
