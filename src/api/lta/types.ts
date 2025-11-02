// LTA DataMall API Types
// Based on: https://datamall.lta.gov.sg/content/dam/datamall/datasets/LTA_DataMall_API_User_Guide.pdf

export interface LTABusStop {
  BusStopCode: string;
  RoadName: string;
  Description: string;
  Latitude: number;
  Longitude: number;
}

export interface LTABusRoute {
  ServiceNo: string;
  Operator: string;
  Direction: number; // 1 or 2
  StopSequence: number;
  BusStopCode: string;
  Distance: number; // Distance from first stop in km
  WD_FirstBus: string; // Weekday first bus time (e.g., "0530")
  WD_LastBus: string; // Weekday last bus time
  SAT_FirstBus: string;
  SAT_LastBus: string;
  SUN_FirstBus: string;
  SUN_LastBus: string;
}

export interface LTABusArrivalBus {
  OriginCode: string;
  DestinationCode: string;
  EstimatedArrival: string; // ISO date string
  Latitude: string;
  Longitude: string;
  VisitNumber: string;
  Load: 'SEA' | 'SDA' | 'LSD'; // Seats Available, Standing Available, Limited Standing
  Feature: 'WAB' | ''; // Wheelchair Accessible Bus
  Type: 'SD' | 'DD' | 'BD'; // Single Deck, Double Deck, Bendy
}

export interface LTABusArrival {
  ServiceNo: string;
  Operator: string;
  NextBus: LTABusArrivalBus;
  NextBus2: LTABusArrivalBus;
  NextBus3: LTABusArrivalBus;
}

export interface LTABusStopsResponse {
  'odata.metadata': string;
  value: LTABusStop[];
}

export interface LTABusRoutesResponse {
  'odata.metadata': string;
  value: LTABusRoute[];
}

export interface LTABusArrivalResponse {
  'odata.metadata': string;
  BusStopCode: string;
  Services: LTABusArrival[];
}

// Extended type for bus route with stop details
export interface LTABusRouteWithStop extends LTABusRoute {
  stopDetails?: LTABusStop;
}
