import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { TextInput } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

import { BusIndicator } from '@/components/bus-indicator';
import { Frame } from '@/components/frame';
import { InteractiveMap } from '@/components/interactive-map.web';
import { ToggleSwitch } from '@/components/toggle-switch';
import {
  FocusAwareStatusBar,
  Pressable,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { XIcon } from '@/components/ui/icons/x-icon';
import { addFavorite, isFavorite } from '@/lib/storage/favorites';

import { CircleIcon } from './circle-icon';
import { DragIcon } from './drag-icon';

// Navigation Icons
const NavigationArrow = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M19.375 9.4984C19.3731 9.7625 19.2863 10.019 19.1275 10.23C18.9687 10.441 18.7462 10.5954 18.4929 10.6703L18.4773 10.675L12.3836 12.3812L10.6773 18.475L10.6726 18.4906C10.5976 18.7438 10.4432 18.9662 10.2323 19.125C10.0213 19.2838 9.76483 19.3706 9.50076 19.3726H9.47732C9.21837 19.375 8.96524 19.2958 8.75389 19.1462C8.54254 18.9965 8.38372 18.7841 8.29998 18.539L3.20311 4.79762C3.20146 4.79357 3.20015 4.78938 3.1992 4.78512C3.12303 4.56389 3.11048 4.32573 3.16297 4.09772C3.21546 3.86972 3.3309 3.66102 3.49613 3.49538C3.66137 3.32973 3.86978 3.21379 4.09766 3.16073C4.32553 3.10768 4.56373 3.11965 4.78514 3.19527L4.79764 3.19918L18.5414 8.29762C18.7902 8.38268 19.0054 8.54509 19.1553 8.76113C19.3053 8.97717 19.3823 9.23551 19.375 9.4984Z"
      fill="#737373"
    />
  </Svg>
);

const MapPin = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M10 1.25C8.17727 1.25207 6.42979 1.97706 5.14092 3.26592C3.85206 4.55479 3.12707 6.30227 3.125 8.125C3.125 14.0078 9.375 18.4508 9.64141 18.6367C9.74649 18.7103 9.87169 18.7498 10 18.7498C10.1283 18.7498 10.2535 18.7103 10.3586 18.6367C10.625 18.4508 16.875 14.0078 16.875 8.125C16.8729 6.30227 16.1479 4.55479 14.8591 3.26592C13.5702 1.97706 11.8227 1.25207 10 1.25ZM10 5.625C10.4945 5.625 10.9778 5.77162 11.3889 6.04633C11.8 6.32103 12.1205 6.71148 12.3097 7.16829C12.4989 7.62511 12.5484 8.12777 12.452 8.61273C12.3555 9.09768 12.1174 9.54314 11.7678 9.89277C11.4181 10.2424 10.9727 10.4805 10.4877 10.577C10.0028 10.6734 9.50011 10.6239 9.04329 10.4347C8.58648 10.2455 8.19603 9.92505 7.92133 9.51393C7.64662 9.1028 7.5 8.61945 7.5 8.125C7.5 7.46196 7.76339 6.82607 8.23223 6.35723C8.70107 5.88839 9.33696 5.625 10 5.625Z"
      fill="#274F9C"
    />
  </Svg>
);

const PlusCircle = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M10 0.0996094C12.6248 0.102409 15.1411 1.14692 16.9971 3.00293C18.8531 4.85893 19.8976 7.37522 19.9004 10L19.8936 10.3662C19.8258 12.1959 19.2513 13.9736 18.2314 15.5C17.1436 17.128 15.5971 18.3972 13.7881 19.1465C11.9792 19.8956 9.98862 20.0919 8.06836 19.71C6.14803 19.3279 4.38449 18.3845 3 17C1.61551 15.6155 0.672059 13.852 0.290039 11.9316C-0.0919236 10.0114 0.104359 8.02078 0.853516 6.21191C1.60282 4.40293 2.87195 2.85638 4.5 1.76855C6.02638 0.748673 7.80407 0.174156 9.63379 0.106445L10 0.0996094ZM13.2764 2.08984C11.7121 1.44193 9.99069 1.27231 8.33008 1.60254C6.6693 1.93289 5.14364 2.74894 3.94629 3.94629C2.74894 5.14364 1.93289 6.6693 1.60254 8.33008C1.27231 9.99068 1.44193 11.7121 2.08984 13.2764C2.73785 14.8408 3.83523 16.1784 5.24316 17.1191C6.6511 18.0599 8.30669 18.5615 10 18.5615C12.2698 18.5589 14.4458 17.6558 16.0508 16.0508C17.6558 14.4458 18.5589 12.2698 18.5615 10L18.5557 9.68262C18.497 8.1005 18.001 6.563 17.1191 5.24316C16.1784 3.83523 14.8408 2.73785 13.2764 2.08984ZM10 5.48438C10.1775 5.48438 10.3481 5.55516 10.4736 5.68066C10.599 5.80615 10.6689 5.97691 10.6689 6.1543V9.33105H13.8457C14.0231 9.33105 14.1939 9.401 14.3193 9.52637C14.4448 9.65187 14.5156 9.82251 14.5156 10C14.5156 10.1775 14.4448 10.3481 14.3193 10.4736C14.1939 10.599 14.0231 10.6689 13.8457 10.6689H10.6689V13.8457C10.6689 14.0231 10.599 14.1939 10.4736 14.3193C10.3481 14.4448 10.1775 14.5156 10 14.5156C9.82251 14.5156 9.65187 14.4448 9.52637 14.3193C9.401 14.1939 9.33105 14.0231 9.33105 13.8457V10.6689H6.1543C5.97691 10.6689 5.80615 10.599 5.68066 10.4736C5.55516 10.3481 5.48438 10.1775 5.48438 10C5.48438 9.82251 5.55516 9.65187 5.68066 9.52637C5.80615 9.401 5.97691 9.33105 6.1543 9.33105H9.33105V6.1543C9.33105 5.97691 9.401 5.80615 9.52637 5.68066C9.65187 5.55516 9.82251 5.48438 10 5.48438Z"
      fill="#274F9C"
      stroke="#274F9C"
      strokeWidth="0.2"
    />
  </Svg>
);

const ChevronDown = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M4 6L8 10L12 6"
      stroke="#737373"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PersonIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <G clipPath="url(#clip0_530_1543)">
      <Path
        d="M7.81257 2.81812C7.81257 2.38547 7.94086 1.96254 8.18123 1.60281C8.42159 1.24307 8.76323 0.962696 9.16295 0.79713C9.56266 0.631563 10.0025 0.588243 10.4268 0.672648C10.8512 0.757054 11.2409 0.965393 11.5469 1.27132C11.8528 1.57725 12.0611 1.96702 12.1455 2.39136C12.2299 2.81569 12.1866 3.25552 12.0211 3.65524C11.8555 4.05495 11.5751 4.39659 11.2154 4.63696C10.8556 4.87732 10.4327 5.00562 10.0001 5.00562C9.4199 5.00562 8.86351 4.77515 8.45327 4.36491C8.04303 3.95468 7.81257 3.39828 7.81257 2.81812ZM16.8298 11.0041L13.2946 6.99624C13.0893 6.76347 12.8369 6.57705 12.554 6.44935C12.2711 6.32166 11.9643 6.25562 11.654 6.25562H8.34616C8.03581 6.25562 7.729 6.32166 7.44614 6.44935C7.16327 6.57705 6.91081 6.76347 6.70553 6.99624L3.17038 11.0041C2.94083 11.2389 2.81293 11.5547 2.81434 11.8831C2.81575 12.2115 2.94635 12.5262 3.17791 12.7591C3.40947 12.992 3.72338 13.1244 4.05178 13.1277C4.38018 13.131 4.69669 13.0049 4.93288 12.7767L6.95319 11.1541L5.41413 17.0041C5.28023 17.3046 5.27026 17.6459 5.38639 17.9538C5.50253 18.2617 5.73539 18.5114 6.03445 18.6487C6.33351 18.786 6.67465 18.7998 6.98384 18.6872C7.29303 18.5745 7.54533 18.3445 7.686 18.047L10.0001 14.0681L12.311 18.0525C12.4517 18.35 12.704 18.58 13.0132 18.6926C13.3224 18.8053 13.6635 18.7915 13.9626 18.6542C14.2616 18.5169 14.4945 18.2672 14.6106 17.9593C14.7267 17.6514 14.7168 17.3101 14.5829 17.0095L13.0469 11.1541L15.0704 12.7767C15.3066 13.0049 15.6231 13.131 15.9515 13.1277C16.2799 13.1244 16.5938 12.992 16.8253 12.7591C17.0569 12.5262 17.1875 12.2115 17.1889 11.8831C17.1903 11.5547 17.0624 11.2389 16.8329 11.0041H16.8298Z"
        fill="#737373"
      />
    </G>
    <Defs>
      <ClipPath id="clip0_530_1543">
        <Rect
          width="20"
          height="20"
          fill="white"
          transform="translate(0 0.00561523)"
        />
      </ClipPath>
    </Defs>
  </Svg>
);

const BookmarkIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M14.375 2.50562H5.625C5.29348 2.50562 4.97554 2.63731 4.74112 2.87173C4.5067 3.10615 4.375 3.42409 4.375 3.75562V17.5056C4.37506 17.6172 4.40496 17.7266 4.46161 17.8227C4.51826 17.9188 4.59959 17.998 4.69716 18.052C4.79473 18.1061 4.90498 18.133 5.01648 18.1301C5.12798 18.1271 5.23666 18.0944 5.33125 18.0353L10 15.1173L14.6695 18.0353C14.7641 18.0942 14.8727 18.1268 14.9841 18.1296C15.0955 18.1325 15.2056 18.1055 15.303 18.0514C15.4005 17.9974 15.4817 17.9183 15.5383 17.8224C15.5949 17.7264 15.6249 17.617 15.625 17.5056V3.75562C15.625 3.42409 15.4933 3.10615 15.2589 2.87173C15.0245 2.63731 14.7065 2.50562 14.375 2.50562ZM14.375 16.3783L10.3305 13.8509C10.2311 13.7888 10.1164 13.7559 9.99922 13.7559C9.88208 13.7559 9.7673 13.7888 9.66797 13.8509L5.625 16.3783V3.75562H14.375V16.3783Z"
      fill="black"
    />
  </Svg>
);

const DotDivider = () => (
  <Svg width={2} height={12} viewBox="0 0 2 12" fill="none">
    <Circle cx="1" cy="1" r="1" fill="#737373" />
    <Circle cx="1" cy="6" r="1" fill="#737373" />
    <Circle cx="1" cy="11" r="1" fill="#737373" />
  </Svg>
);

// Helper function to calculate optimal font size
const calculateFontSize = (
  textLength: number,
  containerWidth: number,
  currentFontSize: number
): number => {
  const estimatedTextWidth = textLength * currentFontSize * 0.6;
  if (estimatedTextWidth > containerWidth * 0.95) {
    const scale = (containerWidth * 0.95) / estimatedTextWidth;
    return Math.max(10.4, Math.min(14, currentFontSize * scale));
  }
  return currentFontSize < 14 ? 14 : currentFontSize;
};

// Dynamic font size component for bus timing
const DynamicBusTime = ({
  time,
  textColor,
}: {
  time: string;
  textColor?: string;
}) => {
  const [fontSize, setFontSize] = React.useState(14);
  const containerRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (containerRef.current && typeof window !== 'undefined') {
      const measureContainer = () => {
        try {
          containerRef.current?.measure?.(
            (_x: number, _y: number, width: number) => {
              if (width > 0) {
                const newSize = calculateFontSize(time.length, width, fontSize);
                if (newSize !== fontSize) {
                  setFontSize(newSize);
                }
              }
            }
          );
        } catch {
          const element = containerRef.current as HTMLElement;
          if (element?.offsetWidth) {
            const newSize = calculateFontSize(
              time.length,
              element.offsetWidth,
              fontSize
            );
            if (newSize !== fontSize) {
              setFontSize(newSize);
            }
          }
        }
      };

      const timer = setTimeout(measureContainer, 50);
      return () => clearTimeout(timer);
    }
  }, [time, fontSize]);

  return (
    <View
      ref={containerRef}
      style={{
        flex: 1,
        maxWidth: '100%',
        minWidth: 0,
      }}
    >
      <Text
        style={{
          color: textColor,
          fontSize: fontSize,
          fontWeight: '500',
          textAlign: 'center',
        }}
      >
        {time}
      </Text>
    </View>
  );
};

// Capacity Icons with people
const CapacityIcons = ({ opacity = 1 }: { opacity?: number }) => (
  <Svg
    width={30}
    height={23}
    viewBox="0 0 30 23"
    fill="none"
    style={{ opacity }}
  >
    <Path
      opacity="0.5"
      d="M21.4932 17.075C20.5629 15.6493 19.1978 14.5615 17.6005 13.9727C18.646 13.2684 19.3838 12.1923 19.6638 10.9632C19.9438 9.73412 19.7449 8.44455 19.1076 7.35697C18.4702 6.26939 17.4424 5.46554 16.2333 5.10905C15.0242 4.75256 13.7247 4.87022 12.5993 5.43809C12.5563 5.4603 12.5187 5.49171 12.4891 5.53009C12.4596 5.56846 12.4388 5.61286 12.4284 5.66015C12.4179 5.70743 12.4179 5.75644 12.4285 5.80371C12.439 5.85097 12.4599 5.89534 12.4895 5.93366C13.3263 6.97751 13.8069 8.2619 13.8609 9.59868C13.9148 10.9355 13.5393 12.2544 12.7893 13.3623C12.7408 13.4347 12.7229 13.5233 12.7395 13.6089C12.756 13.6944 12.8057 13.77 12.8777 13.8191C13.8555 14.5015 14.6926 15.3661 15.3432 16.3655C15.6055 16.7673 15.7127 17.2508 15.6446 17.7258C15.637 17.7731 15.6397 17.8214 15.6526 17.8675C15.6654 17.9136 15.6882 17.9564 15.7192 17.9929C15.7502 18.0293 15.7888 18.0586 15.8323 18.0786C15.8757 18.0987 15.923 18.1091 15.9709 18.1091H20.9514C21.0969 18.1091 21.2384 18.0611 21.3538 17.9726C21.4692 17.884 21.5522 17.7598 21.5899 17.6193C21.6128 17.5269 21.6161 17.4306 21.5995 17.3369C21.5828 17.2431 21.5466 17.1539 21.4932 17.075Z"
      fill="#211F26"
    />
    <Path
      d="M14.0481 17.0884C14.1131 17.1881 14.15 17.3035 14.1548 17.4225C14.1597 17.5414 14.1323 17.6594 14.0756 17.7641C14.0189 17.8687 13.935 17.9561 13.8328 18.017C13.7305 18.078 13.6137 18.1101 13.4947 18.1101H1.30851C1.18949 18.1101 1.07268 18.078 0.970423 18.017C0.868168 17.9561 0.784265 17.8687 0.727579 17.7641C0.670892 17.6594 0.643528 17.5414 0.648376 17.4225C0.653224 17.3035 0.690104 17.1881 0.755121 17.0884C1.68523 15.6567 3.05334 14.5642 4.65529 13.9737C3.76969 13.3842 3.09734 12.5252 2.73766 11.524C2.37798 10.5227 2.35006 9.43233 2.65803 8.41399C2.96601 7.39564 3.59352 6.50344 4.44778 5.86932C5.30204 5.2352 6.3377 4.89282 7.40159 4.89282C8.46548 4.89282 9.50114 5.2352 10.3554 5.86932C11.2097 6.50344 11.8372 7.39564 12.1451 8.41399C12.4531 9.43233 12.4252 10.5227 12.0655 11.524C11.7058 12.5252 11.0335 13.3842 10.1479 13.9737C11.7498 14.5642 13.1179 15.6567 14.0481 17.0884Z"
      fill="#211F26"
    />
    <Path
      opacity="0.5"
      d="M29.103 17.075C28.1726 15.6493 26.8076 14.5615 25.2102 13.9727C26.2557 13.2684 26.9936 12.1923 27.2735 10.9632C27.5535 9.73412 27.3546 8.44455 26.7173 7.35697C26.08 6.26939 25.0522 5.46554 23.8431 5.10905C22.634 4.75256 21.3345 4.87022 20.2091 5.43809C20.166 5.4603 20.1284 5.49171 20.0989 5.53009C20.0693 5.56846 20.0486 5.61286 20.0381 5.66015C20.0276 5.70743 20.0277 5.75644 20.0382 5.80371C20.0488 5.85097 20.0696 5.89534 20.0992 5.93366C20.9361 6.97751 21.4167 8.2619 21.4706 9.59868C21.5246 10.9355 21.149 12.2544 20.3991 13.3623C20.3506 13.4347 20.3327 13.5233 20.3492 13.6089C20.3658 13.6944 20.4154 13.77 20.4874 13.8191C21.4653 14.5015 22.3024 15.3661 22.9529 16.3655C23.2153 16.7673 23.3224 17.2508 23.2544 17.7258C23.2467 17.7731 23.2494 17.8214 23.2623 17.8675C23.2752 17.9136 23.2979 17.9564 23.3289 17.9929C23.36 18.0293 23.3985 18.0586 23.442 18.0786C23.4855 18.0987 23.5328 18.1091 23.5806 18.1091H28.5612C28.7067 18.1091 28.8481 18.0611 28.9635 17.9726C29.079 17.884 29.162 17.7598 29.1996 17.6193C29.2226 17.5269 29.2259 17.4306 29.2092 17.3369C29.1926 17.2431 29.1564 17.1539 29.103 17.075Z"
      fill="#211F26"
    />
  </Svg>
);

const ChevronExpand = ({ expanded }: { expanded: boolean }) => (
  <Svg
    width={20}
    height={20}
    viewBox="0 0 20 20"
    fill="none"
    style={{
      transform: [{ rotate: expanded ? '180deg' : '0deg' }],
    }}
  >
    <Path
      d="M5 7.50562L10 12.5056L15 7.50562"
      stroke="#211F26"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default function NavigationPage() {
  const router = useRouter();
  const { destination, from, to } = useLocalSearchParams();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [routeExpanded, setRouteExpanded] = useState(false);

  // Get destination from URL parameter or default to "COM3"
  const currentDestination =
    typeof destination === 'string' ? destination : 'COM3';

  // Get from and to for favorites
  const fromLocation = typeof from === 'string' ? from : 'Your location';
  const toLocation = typeof to === 'string' ? to : currentDestination;

  // Check if this route is already favorited
  const [favorited, setFavorited] = useState(() =>
    isFavorite(fromLocation, toLocation)
  );

  const handleSaveFavorite = () => {
    if (!favorited) {
      addFavorite({
        from: fromLocation,
        to: toLocation,
        fromId: fromLocation,
        toId: toLocation,
      });
      setFavorited(true);
    }
  };

  // Manage all locations as a unified list
  type LocationItem = {
    id: string;
    text: string;
    type: 'origin' | 'stop' | 'destination';
    isEditable: boolean;
  };

  const [locations, setLocations] = useState<LocationItem[]>([
    { id: '1', text: 'Your location', type: 'origin', isEditable: false },
    {
      id: '2',
      text: currentDestination,
      type: 'destination',
      isEditable: false,
    },
  ]);

  const handleAddStop = () => {
    const newStop: LocationItem = {
      id: Date.now().toString(),
      text: '',
      type: 'stop',
      isEditable: true,
    };
    // Insert before the last item (destination)
    setLocations([
      ...locations.slice(0, -1),
      newStop,
      locations[locations.length - 1],
    ]);
  };

  const handleRemoveLocation = (id: string) => {
    setLocations(locations.filter((loc) => loc.id !== id));
  };

  const handleUpdateLocation = (id: string, text: string) => {
    setLocations(
      locations.map((loc) => (loc.id === id ? { ...loc, text } : loc))
    );
  };

  const handleMoveUp = (index: number) => {
    // Can't move if already at top
    if (index <= 0) return;

    const newLocations = [...locations];
    // Swap with the item above
    [newLocations[index], newLocations[index - 1]] = [
      newLocations[index - 1],
      newLocations[index],
    ];
    setLocations(newLocations);
  };

  const handleMoveDown = (index: number) => {
    // Can't move if already at bottom
    if (index >= locations.length - 1) return;

    const newLocations = [...locations];
    // Swap with the item below
    [newLocations[index], newLocations[index + 1]] = [
      newLocations[index + 1],
      newLocations[index],
    ];
    setLocations(newLocations);
  };

  // Show X and drag icons when there are 3+ locations (origin + at least 1 stop + destination)
  const showControls = locations.length >= 3;

  return (
    <View className="flex-1" style={{ backgroundColor: '#FAFAFA' }}>
      <FocusAwareStatusBar />

      {/* Map Background */}
      <View className="flex-1">
        <InteractiveMap
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Location Input Card */}
        <View
          style={{
            marginHorizontal: 10,
            marginTop: 48,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#E5E5E5',
            backgroundColor: '#FFFFFF',
            padding: 12,
            paddingHorizontal: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 2,
          }}
        >
          {/* Render All Locations */}
          {locations.map((location, index) => {
            const isOrigin = location.type === 'origin';
            const isDestination = location.type === 'destination';
            const isLast = index === locations.length - 1;

            // Determine icon
            let LocationIcon = null;
            if (isOrigin) {
              LocationIcon = <NavigationArrow />;
            } else if (isDestination) {
              LocationIcon = <MapPin />;
            } else {
              LocationIcon = <CircleIcon />;
            }

            return (
              <React.Fragment key={location.id}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      flex: 1,
                    }}
                  >
                    {LocationIcon}
                    {location.isEditable ? (
                      <TextInput
                        value={location.text}
                        onChangeText={(text: string) =>
                          handleUpdateLocation(location.id, text)
                        }
                        placeholder="Enter location"
                        placeholderTextColor="#737373"
                        style={{
                          fontSize: 16,
                          fontWeight: '500',
                          color: '#211F26',
                          flex: 1,
                          padding: 0,
                        }}
                      />
                    ) : (
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '500',
                          color: '#211F26',
                        }}
                      >
                        {location.text}
                      </Text>
                    )}
                  </View>

                  {/* Show controls when there are 3+ locations */}
                  {showControls && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      {/* X button - show for ALL locations */}
                      <Pressable
                        onPress={() => handleRemoveLocation(location.id)}
                      >
                        <XIcon width={20} height={20} fill="#737373" />
                      </Pressable>

                      {/* Drag icon - show for ALL locations */}
                      <Pressable
                        onPress={() => {
                          // Tap to swap with above item
                          handleMoveUp(index);
                        }}
                        onLongPress={() => {
                          // Long press moves down
                          handleMoveDown(index);
                        }}
                      >
                        <DragIcon />
                      </Pressable>
                    </View>
                  )}
                </View>

                {/* Divider - show for all except last location */}
                {!isLast && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 20,
                      paddingLeft: 9,
                      height: 10,
                      justifyContent: 'center',
                      marginVertical: 4,
                    }}
                  >
                    <DotDivider />
                    <View
                      style={{ height: 1, flex: 1, backgroundColor: '#E4E7E7' }}
                    />
                  </View>
                )}
              </React.Fragment>
            );
          })}

          {/* Divider before Add Stop button */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 20,
              paddingLeft: 9,
              height: 10,
              justifyContent: 'center',
              marginVertical: 4,
            }}
          >
            <DotDivider />
            <View style={{ height: 1, flex: 1, backgroundColor: '#E4E7E7' }} />
          </View>

          {/* Add Stop */}
          <Pressable
            onPress={handleAddStop}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <PlusCircle />
            <Text style={{ fontSize: 16, fontWeight: '500', color: '#274F9C' }}>
              Add Stop
            </Text>
          </Pressable>
        </View>

        {/* Journey Details Card */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            borderWidth: 1,
            borderColor: '#E5E5E5',
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 20,
            paddingBottom: 20,
            paddingTop: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 5,
            maxHeight: '55%',
          }}
        >
          <Frame />
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ marginTop: 12 }}
          >
            {/* Journey Time Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: 8,
                marginBottom: 16,
              }}
            >
              <Text
                style={{ fontSize: 24, fontWeight: '500', color: '#211F26' }}
              >
                28 Mins
              </Text>

              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#E5E5E5',
                    backgroundColor: '#FFFFFF',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 1,
                    width: 154,
                    height: 32,
                  }}
                >
                  <Text style={{ fontSize: 14, color: '#09090B' }}>
                    Arrive 9:15PM
                  </Text>
                  <ChevronDown />
                </View>
                <Pressable
                  onPress={() => router.push('/(app)/transit')}
                  style={{
                    padding: 4,
                  }}
                >
                  <XIcon width={24} height={24} fill="#09090B" />
                </Pressable>
              </View>
            </View>

            {/* Journey Steps */}
            <View style={{ marginBottom: 16 }}>
              {/* Step 1: Your location */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <NavigationArrow />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '500',
                      color: '#211F26',
                    }}
                  >
                    Your location
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: '#09090B' }}>9:44AM</Text>
              </View>

              {/* Connecting line */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 20,
                  paddingLeft: 9,
                  height: 16,
                  justifyContent: 'center',
                  marginVertical: 8,
                }}
              >
                <DotDivider />
                <View
                  style={{ height: 1, flex: 1, backgroundColor: '#E4E7E7' }}
                />
              </View>

              {/* Step 2: Walk */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <PersonIcon />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '500',
                      color: '#211F26',
                    }}
                  >
                    Walk 10 min
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: '#09090B' }}>9:44AM</Text>
              </View>

              {/* Connecting line */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 20,
                  paddingLeft: 9,
                  height: 16,
                  justifyContent: 'center',
                  marginVertical: 8,
                }}
              >
                <DotDivider />
                <View
                  style={{ height: 1, flex: 1, backgroundColor: '#E4E7E7' }}
                />
              </View>

              {/* Step 3: Bus Journey */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 16,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 16,
                    flex: 1,
                  }}
                >
                  {/* Blue line indicator with bus icons */}
                  <BusIndicator expanded={routeExpanded} />

                  <View
                    style={{
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 16,
                      flex: 1,
                    }}
                  >
                    {/* Ventus */}
                    <View
                      style={{
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 8,
                        alignSelf: 'stretch',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '500',
                          color: '#211F26',
                        }}
                      >
                        Ventus
                      </Text>

                      {/* Bus Routes */}
                      <View
                        style={{
                          flexDirection: 'column',
                          gap: 16,
                          alignSelf: 'stretch',
                        }}
                      >
                        {/* A1 Route */}
                        <View
                          style={{
                            flexDirection: 'row',
                            height: 37,
                            alignItems: 'center',
                            borderRadius: 5.286,
                          }}
                        >
                          <View
                            style={{
                              width: 38,
                              height: 37,
                              paddingHorizontal: 10.572,
                              paddingVertical: 7.048,
                              justifyContent: 'center',
                              alignItems: 'center',
                              borderTopLeftRadius: 5.286,
                              borderBottomLeftRadius: 5.286,
                              backgroundColor: '#F00',
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 0.881 },
                              shadowOpacity: 0.1,
                              shadowRadius: 1.762,
                              elevation: 1,
                              flexShrink: 0,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: '600',
                                color: '#FFFFFF',
                                textAlign: 'center',
                              }}
                            >
                              A1
                            </Text>
                          </View>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              flex: 1,
                              alignSelf: 'stretch',
                              borderTopRightRadius: 5.286,
                              borderBottomRightRadius: 5.286,
                              borderTopWidth: 0.881,
                              borderRightWidth: 0.881,
                              borderBottomWidth: 0.881,
                              borderColor: '#E5E5E5',
                            }}
                          >
                            <View
                              style={{
                                height: 37,
                                paddingHorizontal: 10.572,
                                paddingVertical: 7.048,
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flex: 1,
                                borderTopWidth: 0.881,
                                borderRightWidth: 0.881,
                                borderBottomWidth: 0.881,
                                borderColor: '#E5E5E5',
                                backgroundColor: '#FFFFFF',
                                flexDirection: 'row',
                              }}
                            >
                              <DynamicBusTime
                                time="1 Min"
                                textColor="#211F26"
                              />
                              <CapacityIcons />
                            </View>
                            <View
                              style={{
                                height: 37,
                                paddingHorizontal: 10.572,
                                paddingVertical: 7.048,
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flex: 1,
                                borderTopWidth: 0.881,
                                borderRightWidth: 0.881,
                                borderBottomWidth: 0.881,
                                borderColor: '#E5E5E5',
                                backgroundColor: '#FFFFFF',
                                flexDirection: 'row',
                              }}
                            >
                              <DynamicBusTime
                                time="5 Min"
                                textColor="#737373"
                              />
                              <CapacityIcons opacity={0.6} />
                            </View>
                            <View
                              style={{
                                height: 37,
                                paddingHorizontal: 10.572,
                                paddingVertical: 7.048,
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flex: 1,
                                borderTopWidth: 0.881,
                                borderBottomWidth: 0.881,
                                borderColor: '#E5E5E5',
                                backgroundColor: '#FFFFFF',
                                flexDirection: 'row',
                              }}
                            >
                              <DynamicBusTime
                                time="10 Min"
                                textColor="#737373"
                              />
                              <CapacityIcons opacity={0.6} />
                            </View>
                          </View>
                        </View>

                        {/* D2 Route */}
                        <View
                          style={{
                            flexDirection: 'row',
                            height: 37,
                            alignItems: 'center',
                            borderRadius: 5.286,
                          }}
                        >
                          <View
                            style={{
                              width: 38,
                              height: 37,
                              paddingHorizontal: 10.572,
                              paddingVertical: 7.048,
                              justifyContent: 'center',
                              alignItems: 'center',
                              borderTopLeftRadius: 5.286,
                              borderBottomLeftRadius: 5.286,
                              backgroundColor: '#6F1B6F',
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 0.881 },
                              shadowOpacity: 0.1,
                              shadowRadius: 1.762,
                              elevation: 1,
                              flexShrink: 0,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: '600',
                                color: '#FFFFFF',
                                textAlign: 'center',
                              }}
                            >
                              D2
                            </Text>
                          </View>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              flex: 1,
                              alignSelf: 'stretch',
                              borderTopRightRadius: 5.286,
                              borderBottomRightRadius: 5.286,
                              borderTopWidth: 0.881,
                              borderRightWidth: 0.881,
                              borderBottomWidth: 0.881,
                              borderColor: '#E5E5E5',
                            }}
                          >
                            <View
                              style={{
                                height: 37,
                                paddingHorizontal: 10.572,
                                paddingVertical: 7.048,
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flex: 1,
                                borderTopWidth: 0.881,
                                borderRightWidth: 0.881,
                                borderBottomWidth: 0.881,
                                borderColor: '#E5E5E5',
                                backgroundColor: '#FFFFFF',
                                flexDirection: 'row',
                              }}
                            >
                              <DynamicBusTime
                                time="3 Min"
                                textColor="#211F26"
                              />
                              <CapacityIcons />
                            </View>
                            <View
                              style={{
                                height: 37,
                                paddingHorizontal: 10.572,
                                paddingVertical: 7.048,
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flex: 1,
                                borderTopWidth: 0.881,
                                borderRightWidth: 0.881,
                                borderBottomWidth: 0.881,
                                borderColor: '#E5E5E5',
                                backgroundColor: '#FFFFFF',
                                flexDirection: 'row',
                              }}
                            >
                              <DynamicBusTime
                                time="7 Min"
                                textColor="#737373"
                              />
                              <CapacityIcons opacity={0.6} />
                            </View>
                            <View
                              style={{
                                height: 37,
                                paddingHorizontal: 10.572,
                                paddingVertical: 7.048,
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flex: 1,
                                borderTopWidth: 0.881,
                                borderBottomWidth: 0.881,
                                borderColor: '#E5E5E5',
                                backgroundColor: '#FFFFFF',
                                flexDirection: 'row',
                              }}
                            >
                              <DynamicBusTime
                                time="12 Min"
                                textColor="#737373"
                              />
                              <CapacityIcons opacity={0.6} />
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Route Details - Expandable */}
                    <View
                      style={{
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 10,
                        alignSelf: 'stretch',
                      }}
                    >
                      <Pressable
                        onPress={() => setRouteExpanded(!routeExpanded)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          alignSelf: 'stretch',
                        }}
                      >
                        <ChevronExpand expanded={routeExpanded} />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '500',
                            color: '#09090B',
                          }}
                        >
                          Ride 5 stops (9 mins)
                        </Text>
                      </Pressable>

                      {routeExpanded && (
                        <>
                          <View
                            style={{
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: 10,
                              paddingHorizontal: 24,
                            }}
                          >
                            <Text style={{ fontSize: 12, color: '#09090B' }}>
                              LT13
                            </Text>
                          </View>
                          <View
                            style={{
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: 10,
                              paddingHorizontal: 24,
                            }}
                          >
                            <Text style={{ fontSize: 12, color: '#09090B' }}>
                              AS5
                            </Text>
                          </View>
                          <View
                            style={{
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: 10,
                              paddingHorizontal: 24,
                            }}
                          >
                            <Text style={{ fontSize: 12, color: '#09090B' }}>
                              Opp NUSS
                            </Text>
                          </View>
                        </>
                      )}
                    </View>

                    {/* Final Stop */}
                    <View
                      style={{
                        height: 36,
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '500',
                          color: '#211F26',
                        }}
                      >
                        {currentDestination}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Connecting line */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 20,
                  paddingLeft: 9,
                  height: 16,
                  justifyContent: 'center',
                  marginVertical: 8,
                }}
              >
                <DotDivider />
                <View
                  style={{ height: 1, flex: 1, backgroundColor: '#E4E7E7' }}
                />
              </View>

              {/* Step 4: Final Walk */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <PersonIcon />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '500',
                      color: '#211F26',
                    }}
                  >
                    Walk 10 min
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: '#09090B' }}>9:44AM</Text>
              </View>

              {/* Connecting line */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 20,
                  paddingLeft: 9,
                  height: 16,
                  justifyContent: 'center',
                  marginVertical: 8,
                }}
              >
                <DotDivider />
                <View
                  style={{ height: 1, flex: 1, backgroundColor: '#E4E7E7' }}
                />
              </View>

              {/* Step 5: Destination */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <MapPin />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '500',
                      color: '#211F26',
                    }}
                  >
                    {currentDestination}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: '#09090B' }}>9:50AM</Text>
              </View>
            </View>

            {/* Divider */}
            <View
              style={{
                width: 390,
                height: 1,
                backgroundColor: '#E4E7E7',
                marginBottom: 16,
              }}
            />

            {/* Reminder Toggle */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                alignSelf: 'stretch',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 14, color: '#09090B' }}>
                Remind me to leave on time
              </Text>
              <ToggleSwitch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
              />
            </View>

            {/* Save as Favorite Button */}
            <Pressable
              onPress={handleSaveFavorite}
              disabled={favorited}
              style={{
                height: 36,
                paddingVertical: 8,
                paddingLeft: 16,
                paddingRight: 13,
                justifyContent: 'center',
                alignItems: 'center',
                gap: 4,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: favorited ? '#274F9C' : '#E5E5E5',
                backgroundColor: favorited ? '#F0F4FF' : '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 1,
                flexDirection: 'row',
                opacity: favorited ? 0.7 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: favorited ? '#274F9C' : '#211F26',
                }}
              >
                {favorited ? 'Saved as favorite' : 'Save as favorite'}
              </Text>
              <BookmarkIcon />
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
