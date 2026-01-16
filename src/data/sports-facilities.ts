export interface SportsFacility {
  id: string;
  name: string;
  type: 'gym' | 'swimming' | 'badminton';
  coordinates: { lat: number; lng: number };
  address?: string;
  hours?: string;
  googleMapsUrl: string;
  imageSource?: any;
}

export const NUS_SPORTS_FACILITIES: SportsFacility[] = [
  // Gyms (Purple markers)
  {
    id: 'gym-utown',
    name: 'UCS Gym',
    type: 'gym',
    coordinates: { lat: 1.299648492407296, lng: 103.77551730005814 },
    address: 'University Sports Centre, NUS Campus',
    hours: 'Mon-Fri: 7am-11pm, Sat-Sun: 8am-10pm',
    googleMapsUrl: 'https://maps.app.goo.gl/QUYgAm1EoXH1hkkG8',
    imageSource: require('../../assets/images/sports/USC_Gym_Sports.png'),
  },
  {
    id: 'gym-eusoff',
    name: 'UTown Gym',
    type: 'gym',
    coordinates: { lat: 1.3058824627261878, lng: 103.7727738270419 },
    address: 'University Town, NUS Campus',
    hours: 'Mon-Fri: 7am-11pm, Sat-Sun: 8am-10pm',
    googleMapsUrl: 'https://maps.app.goo.gl/om5tYqp1DeMaHbQi8',
    imageSource: require('../../assets/images/sports/Utown_Gym_Sports.jpg'),
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
    name: 'UTown Infinity Pool',
    type: 'swimming',
    coordinates: { lat: 1.3051276808898142, lng: 103.77237775074859 },
    address: 'University Town, NUS Campus',
    hours: 'Mon-Fri: 7am-9pm, Sat-Sun: 8am-8pm',
    googleMapsUrl: 'https://maps.app.goo.gl/knkXhVnfh1s9xBFL8',
    imageSource: require('../../assets/images/sports/UTown_Swimming_Pool.jpg'),
  },
  {
    id: 'pool-utown-2',
    name: 'USC Swimming Pool',
    type: 'swimming',
    coordinates: { lat: 1.2998213715872569, lng: 103.77596553040573 },
    address: 'University Sports Centre, NUS Campus',
    hours: 'Mon-Fri: 7am-9pm, Sat-Sun: 8am-8pm',
    googleMapsUrl: 'https://maps.app.goo.gl/8ypSne6R8deuJMmS8',
  },
  // Badminton courts (Cyan markers)
  {
    id: 'badminton-utown',
    name: 'MPSH5 Badminton Court',
    type: 'badminton',
    coordinates: { lat: 1.300400807583099, lng: 103.77630734223835 },
    address: 'MPSH5, University Sports Centre, NUS Campus',
    hours: 'Mon-Fri: 7am-11pm, Sat-Sun: 8am-10pm',
    googleMapsUrl: 'https://maps.app.goo.gl/1d9nT6WV1Ko262z87',
    imageSource: require('../../assets/images/sports/MPSH5_Badminton_Courts_Sports.jpg'),
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
