export interface Printer {
  id: string;
  building: string;
  location: string;
  coordinates: { lat: number; lng: number };
  hours: string;
  googleMapsUrl: string;
}

export const NUS_PRINTERS: Printer[] = [
  {
    id: 'e1-level6',
    building: 'E1',
    location: 'E1 Level 6 Study Corner (beside tutorial room E1-06-16)',
    coordinates: { lat: 1.2987234477304708, lng: 103.7711628721659 },
    hours: 'Daily 24 hours',
    googleMapsUrl: 'https://maps.app.goo.gl/QUYgAm1EoXH1hkkG8',
  },
  {
    id: 'e3-level6',
    building: 'E3',
    location: 'E3 Level 6',
    coordinates: { lat: 1.2993341800436138, lng: 103.77181238459862 },
    hours: 'Daily 24 hours',
    googleMapsUrl: 'https://maps.app.goo.gl/R8KKGrQbN5ifCCEA6',
  },
];
