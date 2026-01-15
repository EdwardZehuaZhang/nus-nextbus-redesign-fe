export interface SportsFacility {
  id: string;
  name: string;
  type: 'gym' | 'swimming' | 'badminton';
  coordinates: { lat: number; lng: number };
  address?: string;
  hours?: string;
  googleMapsUrl: string;
}

export const NUS_SPORTS_FACILITIES: SportsFacility[] = [
  // Gyms (Purple markers)
  {
    id: 'gym-utown',
    name: 'NUS Gym (University Town)',
    type: 'gym',
    coordinates: { lat: 1.299648492407296, lng: 103.77551730005814 },
    address: 'University Town, NUS Campus',
    hours: 'Mon-Fri: 7am-11pm, Sat-Sun: 8am-10pm',
    googleMapsUrl: 'https://maps.app.goo.gl/QUYgAm1EoXH1hkkG8',
  },
  {
    id: 'gym-eusoff',
    name: 'NUS Gym (Eusoff Hall)',
    type: 'gym',
    coordinates: { lat: 1.3058824627261878, lng: 103.7727738270419 },
    address: 'Eusoff Hall, NUS Campus',
    hours: 'Mon-Fri: 7am-11pm, Sat-Sun: 8am-10pm',
    googleMapsUrl: 'https://maps.app.goo.gl/om5tYqp1DeMaHbQi8',
  },
  {
    id: 'gym-ync',
    name: 'NUS Gym (YNC)',
    type: 'gym',
    coordinates: { lat: 1.3187647548105907, lng: 103.81650587332433 },
    address: 'Yale-NUS College, NUS Campus',
    hours: 'Mon-Fri: 7am-11pm, Sat-Sun: 8am-10pm',
    googleMapsUrl: 'https://maps.app.goo.gl/TdHLubua2PbqUxHG8',
  },
  // Swimming pools (Light blue markers)
  {
    id: 'pool-utown',
    name: 'NUS Swimming Pool (University Town)',
    type: 'swimming',
    coordinates: { lat: 1.3051276808898142, lng: 103.77237775074859 },
    address: 'University Town, NUS Campus',
    hours: 'Mon-Fri: 7am-9pm, Sat-Sun: 8am-8pm',
    googleMapsUrl: 'https://maps.app.goo.gl/knkXhVnfh1s9xBFL8',
  },
  {
    id: 'pool-utown-2',
    name: 'NUS Swimming Pool (University Sports Centre)',
    type: 'swimming',
    coordinates: { lat: 1.2998213715872569, lng: 103.77596553040573 },
    address: 'University Sports Centre, NUS Campus',
    hours: 'Mon-Fri: 7am-9pm, Sat-Sun: 8am-8pm',
    googleMapsUrl: 'https://maps.app.goo.gl/8ypSne6R8deuJMmS8',
  },
  // Badminton courts (Cyan markers)
  {
    id: 'badminton-utown',
    name: 'NUS Badminton Court (University Town)',
    type: 'badminton',
    coordinates: { lat: 1.300400807583099, lng: 103.77630734223835 },
    address: 'University Sports Centre, NUS Campus',
    hours: 'Mon-Fri: 7am-11pm, Sat-Sun: 8am-10pm',
    googleMapsUrl: 'https://maps.app.goo.gl/1d9nT6WV1Ko262z87',
  },
  {
    id: 'badminton-eusoff',
    name: 'NUS Badminton Court (Eusoff Hall)',
    type: 'badminton',
    coordinates: { lat: 1.304951001316462, lng: 103.77218324944066 },
    address: 'Eusoff Hall, NUS Campus',
    hours: 'Mon-Fri: 7am-11pm, Sat-Sun: 8am-10pm',
    googleMapsUrl: 'https://maps.app.goo.gl/p6wFcHVNifXK6UXj8',
  },
];

export const getSportsFacilityColor = (
  type: SportsFacility['type']
): string => {
  switch (type) {
    case 'gym':
      return '#A855F7'; // Purple
    case 'swimming':
      return '#87CEEB'; // Light Blue
    case 'badminton':
      return '#06B6D4'; // Cyan
  }
};
