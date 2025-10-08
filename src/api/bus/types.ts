// API Response Types for NUS NextBus Mock API

export type PassengerLoad = 'Low' | 'Medium' | 'High' | '';

export type DayType = 'Mon-Fri' | 'Sat' | 'Sun/PH';

export type ScheduleType = 'Term' | 'Vacation';

export type RouteCode = 'A1' | 'A2' | 'D1' | 'D2' | 'BTC' | 'L' | 'E' | 'K';

export type BusStopCode =
  | 'PGP'
  | 'KRB'
  | 'LT13'
  | 'AS5'
  | 'BIZ2'
  | 'CENLIB'
  | 'LT27'
  | 'UHALL'
  | 'OPPUHALL'
  | 'YIHHT'
  | 'MUSEUM'
  | 'UTOWN'
  | 'RAFFLES'
  | 'KV'
  | 'COM2';

// 1. Publicity Banner Types
export type BannerType = 'IMG' | 'FORM';

export type PublicityBanner = {
  id: number;
  name: string;
  description: string;
  type: BannerType;
  img_url: string;
  link_url: string;
  enabled: boolean;
  priority: number;
  begin: string;
  end: string;
  form: {
    input_label1: string;
    input_label2: string;
  };
};

export type PublicityResponse = {
  banners: PublicityBanner[];
  frequency: number;
};

// 2. Bus Stop Types
export type BusStop = {
  name: string;
  caption: string;
  ShortName: string;
  LongName: string;
  latitude: number;
  longitude: number;
};

export type BusStopsResponse = {
  BusStopsResult: {
    busstops: BusStop[];
  };
};

// 3. Pickup Point Types
export type PickupPoint = {
  pickupname: string;
  busstopcode: string;
  lat: number;
  lng: number;
  LongName: string;
  ShortName: string;
  routeid: number;
};

export type PickupPointResponse = {
  PickupPointResult: {
    pickuppoint: PickupPoint[];
  };
};

// 4. Shuttle Service Types
export type ShuttleService = {
  name: string;
  arrivalTime: string;
  nextArrivalTime: string;
  arrivalTime_veh_plate: string;
  nextArrivalTime_veh_plate: string;
  passengers: PassengerLoad;
  nextPassengers: PassengerLoad;
};

export type ShuttleServiceResponse = {
  ShuttleServiceResult: {
    Timestamp: string;
    name: string;
    caption: string;
    shuttles: ShuttleService[];
  };
};

// 5. Active Bus Types
export type ActiveBus = {
  veh_plate: string;
  lat: number;
  lng: number;
  speed: number;
  direction: 1 | 2; // 1 = Forward/Clockwise, 2 = Reverse/Counter-clockwise
};

export type ActiveBusResponse = {
  ActiveBusResult: {
    Timestamp: string;
    ActiveBusCount: string;
    activebus: ActiveBus[];
  };
};

// 6. Bus Location Types
export type BusLocation = {
  vehplate: string;
  lat: number;
  lng: number;
  speed: number;
  direction: 1 | 2;
  status: string;
};

export type BusLocationResponse = {
  BusLocationResult: BusLocation;
};

// 7. Route Operating Hours Types
export type RouteMinMaxTime = {
  DayType: DayType;
  ScheduleType: ScheduleType;
  FirstTime: string;
  LastTime: string;
  DisplayOrder: string;
};

export type RouteMinMaxTimeResponse = {
  RouteMinMaxTimeResult: {
    RouteMinMaxTime: RouteMinMaxTime[];
  };
};

// 8. Service Description Types
export type ServiceDescription = {
  Route: string;
  RouteDescription: string;
  Color: string; // Hex color code (e.g., "FF0000" for red)
};

export type ServiceDescriptionResponse = {
  ServiceDescriptionResult: {
    ServiceDescription: ServiceDescription[];
  };
};

// 9. Announcements Types
export type AnnouncementStatus = 'Enabled' | 'Disabled';

export type Announcement = {
  ID: string;
  Text: string;
  Status: AnnouncementStatus;
  Priority: string;
  Created_By: string;
  Created_On: string;
  Affected_Service_Ids: string;
};

export type AnnouncementsResponse = {
  AnnouncementsResult: {
    TimeStamp: string;
    Announcement: Announcement[];
  };
};

// 10. Ticker Tapes Types
export type TickerTapePriority = 'High' | 'Medium' | 'Low';

export type TickerTape = {
  ID: string;
  Message: string;
  Status: AnnouncementStatus;
  Priority: TickerTapePriority;
  Display_From: string;
  Display_To: string;
  Created_By: string;
  Created_On: string;
  Affected_Service_Ids: string;
  Accident_Latitude: number;
  Accident_Longitude: number;
};

export type TickerTapesResponse = {
  TickerTapesResult: {
    TimeStamp: string;
    TickerTape: TickerTape[];
  };
};

// 11. Checkpoint Types
export type CheckPoint = {
  PointID: string;
  latitude: number;
  longitude: number;
  routeid: number;
};

export type CheckPointResponse = {
  CheckPointResult: {
    CheckPoint: CheckPoint[];
  };
};

// Helper type for mapping arrival times to display format
export type ArrivalTimeSeconds = number; // -1 = No estimate, positive number = seconds

// Helper type for converting passenger load to crowding level
export type CrowdingLevel = 'low' | 'medium' | 'high';
