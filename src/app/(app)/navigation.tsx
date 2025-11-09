import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
import { Animated, TextInput, Platform, ActivityIndicator } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';

import {
  getTransitRoute,
  type Route,
  type RouteStep,
  type Waypoint,
  durationToMinutes,
  formatTime,
} from '@/api';
import type { RouteCode } from '@/api/bus';
import { useNearestBusStop, useStopsBetween } from '@/api/lta/hooks';
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
import { Search as SearchIcon, Van } from '@/components/ui/icons';
import { useLocation } from '@/lib/hooks/use-location';
import { addFavorite, isFavorite, removeFavorite, getFavorites } from '@/lib/storage/favorites';
import { getTransitLineColor } from '@/lib/transit-colors';
import { useInternalRouteFinder } from '@/lib/hooks/use-internal-route-finder';
import { InternalRoutesSection } from '@/components/internal-route-card';
import type { InternalBusRoute } from '@/lib/route-finding';
import { createInternalRoutePolylines } from '@/lib/route-polylines';
import {
  type BusStation,
  searchBusStations,
  getBusStationByName,
} from '@/lib/bus-stations';
import {
  addRecentSearch,
  getRecentSearches,
} from '@/lib/storage/recent-searches';

import { CircleIcon } from './circle-icon';
import { DragIcon } from './drag-icon';

// Navigation Icons
const NavigationArrow = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M19.375 9.4984C19.3731 9.7625 19.2863 10.019 19.1275 10.23C18.9687 10.441 18.7462 10.5954 18.4929 10.6703L18.4773 10.675L12.3836 12.3812L10.6773 18.475L10.6726 18.4906C10.5976 18.7438 10.4432 18.9662 10.2323 19.125C10.0213 19.2838 9.76483 19.3706 9.50076 19.3726H9.47732C9.21837 19.375 8.96524 19.2958 8.75389 19.1462C8.54254 18.9965 8.38372 18.7841 8.29998 18.539L3.20311 4.79762C3.20146 4.79357 3.20015 4.78938 3.1992 4.78512C3.12303 4.56389 3.11048 4.32573 3.16297 4.09772C3.21546 3.86972 3.3309 3.66102 3.49613 3.49538C3.66137 3.32973 3.86978 3.21379 4.09766 3.16073C4.32553 3.10768 4.56373 3.11965 4.78514 3.19527L4.79764 3.19918L18.5414 8.29762C18.7902 8.38268 19.0054 8.54509 19.1553 8.76113C19.3053 8.97717 19.3823 9.23551 19.375 9.4984Z"
      fill="#274F9C"
    />
  </Svg>
);

const NavigationArrowWhite = () => (
  <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
    <Path
      d="M19.375 9.4984C19.3731 9.7625 19.2863 10.019 19.1275 10.23C18.9687 10.441 18.7462 10.5954 18.4929 10.6703L18.4773 10.675L12.3836 12.3812L10.6773 18.475L10.6726 18.4906C10.5976 18.7438 10.4432 18.9662 10.2323 19.125C10.0213 19.2838 9.76483 19.3706 9.50076 19.3726H9.47732C9.21837 19.375 8.96524 19.2958 8.75389 19.1462C8.54254 18.9965 8.38372 18.7841 8.29998 18.539L3.20311 4.79762C3.20146 4.79357 3.20015 4.78938 3.1992 4.78512C3.12303 4.56389 3.11048 4.32573 3.16297 4.09772C3.21546 3.86972 3.3309 3.66102 3.49613 3.49538C3.66137 3.32973 3.86978 3.21379 4.09766 3.16073C4.32553 3.10768 4.56373 3.11965 4.78514 3.19527L4.79764 3.19918L18.5414 8.29762C18.7902 8.38268 19.0054 8.54509 19.1553 8.76113C19.3053 8.97717 19.3823 9.23551 19.375 9.4984Z"
      fill="#FFFFFF"
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
        fill="#274F9C"
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

const BookmarkIcon = ({ fill = 'black' }: { fill?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
    <Path
      d="M14.375 2.50562H5.625C5.29348 2.50562 4.97554 2.63731 4.74112 2.87173C4.5067 3.10615 4.375 3.42409 4.375 3.75562V17.5056C4.37506 17.6172 4.40496 17.7266 4.46161 17.8227C4.51826 17.9188 4.59959 17.998 4.69716 18.052C4.79473 18.1061 4.90498 18.133 5.01648 18.1301C5.12798 18.1271 5.23666 18.0944 5.33125 18.0353L10 15.1173L14.6695 18.0353C14.7641 18.0942 14.8727 18.1268 14.9841 18.1296C15.0955 18.1325 15.2056 18.1055 15.303 18.0514C15.4005 17.9974 15.4817 17.9183 15.5383 17.8224C15.5949 17.7264 15.6249 17.617 15.625 17.5056V3.75562C15.625 3.42409 15.4933 3.10615 15.2589 2.87173C15.0245 2.63731 14.7065 2.50562 14.375 2.50562ZM14.375 16.3783L10.3305 13.8509C10.2311 13.7888 10.1164 13.7559 9.99922 13.7559C9.88208 13.7559 9.7673 13.7888 9.66797 13.8509L5.625 16.3783V3.75562H14.375V16.3783Z"
      fill={fill}
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
  const lastCalculatedSizeRef = React.useRef<number>(14);

  React.useEffect(() => {
    if (containerRef.current && typeof window !== 'undefined') {
      const measureContainer = () => {
        try {
          containerRef.current?.measure?.(
            (_x: number, _y: number, width: number) => {
              if (width > 0) {
                const newSize = calculateFontSize(time.length, width, 14);
                // Only update if the change is significant (> 0.5px) to prevent oscillation
                if (Math.abs(newSize - lastCalculatedSizeRef.current) > 0.5) {
                  lastCalculatedSizeRef.current = newSize;
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
              14
            );
            // Only update if the change is significant (> 0.5px) to prevent oscillation
            if (Math.abs(newSize - lastCalculatedSizeRef.current) > 0.5) {
              lastCalculatedSizeRef.current = newSize;
              setFontSize(newSize);
            }
          }
        }
      };

      const timer = setTimeout(measureContainer, 50);
      return () => clearTimeout(timer);
    }
  }, [time]); // Removed fontSize from dependencies to prevent infinite loop

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
    width={33}
    height={24}
    viewBox="0 0 33 24"
    fill="none"
    style={{ opacity }}
  >
    <Path
      opacity="0.5"
      d="M23.6606 18.3262C22.6046 16.708 21.0552 15.4732 19.2422 14.8049C20.4289 14.0056 21.2663 12.7841 21.5841 11.389C21.9019 9.99396 21.6761 8.53024 20.9528 7.29578C20.2294 6.06132 19.0628 5.14891 17.6904 4.74428C16.318 4.33965 14.843 4.4732 13.5656 5.11775C13.5168 5.14297 13.4741 5.17862 13.4405 5.22218C13.407 5.26574 13.3835 5.31613 13.3716 5.3698C13.3597 5.42347 13.3597 5.4791 13.3717 5.53275C13.3837 5.5864 13.4073 5.63675 13.4409 5.68025C14.3908 6.86507 14.9363 8.32291 14.9975 9.84023C15.0588 11.3576 14.6325 12.8546 13.7813 14.1121C13.7262 14.1943 13.7059 14.2949 13.7247 14.392C13.7435 14.4891 13.7999 14.5748 13.8816 14.6306C14.9915 15.4052 15.9416 16.3865 16.68 17.5209C16.9778 17.9769 17.0994 18.5258 17.0222 19.0649C17.0135 19.1186 17.0166 19.1735 17.0312 19.2258C17.0458 19.2781 17.0716 19.3266 17.1068 19.368C17.142 19.4094 17.1858 19.4426 17.2352 19.4654C17.2845 19.4882 17.3382 19.5 17.3925 19.4999H23.0456C23.2108 19.5 23.3713 19.4455 23.5024 19.345C23.6334 19.2445 23.7276 19.1035 23.7703 18.944C23.7964 18.8391 23.8001 18.7299 23.7812 18.6234C23.7623 18.517 23.7212 18.4157 23.6606 18.3262Z"
      fill="#211F26"
    />
    <Path
      opacity="0.5"
      d="M15.2099 18.3415C15.2837 18.4547 15.3256 18.5856 15.3311 18.7206C15.3366 18.8556 15.3055 18.9896 15.2412 19.1084C15.1768 19.2272 15.0816 19.3264 14.9655 19.3955C14.8495 19.4647 14.7169 19.5012 14.5818 19.5012H0.749908C0.614811 19.5012 0.482226 19.4647 0.366162 19.3955C0.250097 19.3264 0.154864 19.2272 0.0905218 19.1084C0.0261802 18.9896 -0.00488012 18.8556 0.000622504 18.7206C0.00612513 18.5856 0.0479864 18.4547 0.121783 18.3415C1.17751 16.7165 2.73037 15.4763 4.54866 14.8062C3.54347 14.137 2.78032 13.1621 2.37206 12.0256C1.96381 10.8891 1.93212 9.65146 2.28168 8.49559C2.63125 7.33972 3.3435 6.32703 4.31313 5.60727C5.28276 4.88751 6.45827 4.4989 7.66585 4.4989C8.87342 4.4989 10.0489 4.88751 11.0186 5.60727C11.9882 6.32703 12.7004 7.33972 13.05 8.49559C13.3996 9.65146 13.3679 10.8891 12.9596 12.0256C12.5514 13.1621 11.7882 14.137 10.783 14.8062C12.6013 15.4763 14.1542 16.7165 15.2099 18.3415Z"
      fill="#211F26"
    />
    <Path
      opacity="0.08"
      d="M32.298 18.3262C31.2419 16.708 29.6926 15.4732 27.8795 14.8049C29.0662 14.0056 29.9037 12.7841 30.2214 11.389C30.5392 9.99396 30.3135 8.53024 29.5901 7.29578C28.8667 6.06132 27.7001 5.14891 26.3277 4.74428C24.9553 4.33965 23.4803 4.4732 22.203 5.11775C22.1541 5.14297 22.1114 5.17862 22.0779 5.22218C22.0443 5.26574 22.0208 5.31613 22.0089 5.3698C21.997 5.42347 21.997 5.4791 22.009 5.53275C22.021 5.5864 22.0447 5.63675 22.0783 5.68025C23.0281 6.86507 23.5736 8.32291 23.6348 9.84023C23.6961 11.3576 23.2699 12.8546 22.4186 14.1121C22.3636 14.1943 22.3432 14.2949 22.362 14.392C22.3808 14.4891 22.4372 14.5748 22.5189 14.6306C23.6288 15.4052 24.5789 16.3865 25.3173 17.5209C25.6151 17.9769 25.7368 18.5258 25.6595 19.0649C25.6508 19.1186 25.6539 19.1735 25.6685 19.2258C25.6831 19.2781 25.7089 19.3266 25.7441 19.368C25.7794 19.4094 25.8232 19.4426 25.8725 19.4654 25.9218 19.4882 25.9755 19.5 26.0298 19.4999H31.683C31.8481 19.5 32.0087 19.4455 32.1397 19.345C32.2707 19.2445 32.3649 19.1035 32.4076 18.944C32.4337 18.8391 32.4374 18.7299 32.4185 18.6234C32.3996 18.517 32.3586 18.4157 32.298 18.3262Z"
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

// Custom hook for drag handlers (similar to transit page)
const useDragHandlers = () => {
  const [containerHeight, setContainerHeight] = React.useState(39); // Start at 39%
  const [tempHeight, setTempHeight] = React.useState<number | null>(null);
  const startHeight = React.useRef(39);
  const dragStartY = React.useRef(0);
  const dragStartTime = React.useRef(0);
  const isDragging = React.useRef(false);

  const MIN_HEIGHT = 5; // Minimum height - just frame visible
  const MAX_HEIGHT = 75; // Maximum height - reduced to better fit content
  const DEFAULT_HEIGHT = 39; // Default state

  const handleDragMove = (dy: number) => {
    // Store the starting height when drag begins
    if (tempHeight === null) {
      startHeight.current = containerHeight;
    }

    // Convert dy (pixels) to percentage of screen height
    const screenHeight =
      typeof window !== 'undefined' ? window.innerHeight : 800;
    const heightChange = (dy / screenHeight) * 100;

    // Calculate new height (dragging down increases dy, so we subtract)
    let newHeight = startHeight.current - heightChange;

    // Clamp between MIN and MAX
    newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));

    setTempHeight(newHeight);
    setContainerHeight(newHeight);
  };

  const handleDrag = (gestureState: { dy: number; vy: number }) => {
    // This is called on drag end with velocity
    const currentHeight = tempHeight ?? containerHeight;
    const { dy, vy } = gestureState;

    // Consider velocity for more natural snapping
    // Negative dy means dragging up, positive means dragging down
    // Negative vy means fast upward movement, positive means fast downward
    
    let targetHeight = DEFAULT_HEIGHT;

    console.log('[NAV DRAG] 📏 Drag ended at height:', currentHeight, 'velocity:', vy);

    // Smart snapping based on current position and velocity
    // Consider both where we are and where we're going
    // Three states: MIN (5%) -> DEFAULT (39%) -> MAX (75%)
    
    if (Math.abs(vy) > 0.5) {
      // Fast swipe detected
      if (vy < 0) {
        // Fast upward swipe
        if (currentHeight < DEFAULT_HEIGHT - 5) {
          // From collapsed/below DEFAULT - snap to DEFAULT
          targetHeight = DEFAULT_HEIGHT;
          console.log('[NAV DRAG] ⬆️ Fast swipe UP from collapsed - Snapping to DEFAULT');
        } else if (currentHeight <= DEFAULT_HEIGHT + 5) {
          // From around DEFAULT - snap to MAX
          targetHeight = MAX_HEIGHT;
          console.log('[NAV DRAG] ⬆️ Fast swipe UP from DEFAULT - Snapping to EXPANDED (MAX_HEIGHT)');
        } else {
          // Already above DEFAULT - snap to MAX
          targetHeight = MAX_HEIGHT;
          console.log('[NAV DRAG] ⬆️ Fast swipe UP from upper position - Snapping to EXPANDED (MAX_HEIGHT)');
        }
      } else {
        // Fast downward swipe
        if (currentHeight > DEFAULT_HEIGHT + 10) {
          // From well above DEFAULT - snap to DEFAULT
          targetHeight = DEFAULT_HEIGHT;
          console.log('[NAV DRAG] ⬇️ Fast swipe DOWN from upper position - Snapping to DEFAULT');
        } else {
          // From DEFAULT or below - snap to MIN
          targetHeight = MIN_HEIGHT;
          console.log('[NAV DRAG] ⬇️ Fast swipe DOWN from DEFAULT/lower - Snapping to COLLAPSED (MIN_HEIGHT)');
        }
      }
    } else {
      // Slow drag - snap based on position
      if (currentHeight < 22) {
        targetHeight = MIN_HEIGHT;
        console.log('[NAV DRAG] ⬇️ Snapping to COLLAPSED (MIN_HEIGHT)');
      } else if (currentHeight > 50) {
        targetHeight = MAX_HEIGHT;
        console.log('[NAV DRAG] ⬆️ Snapping to EXPANDED (MAX_HEIGHT)');
      } else {
        targetHeight = DEFAULT_HEIGHT;
        console.log('[NAV DRAG] 🔄 Snapping to DEFAULT height');
      }
    }

    setContainerHeight(targetHeight);
    setTempHeight(null);
    console.log('[NAV DRAG] ✅ Final height set to:', targetHeight);
  };

  const handleDragEnd = () => {
    // Do nothing - all snapping logic is handled in handleDrag
    // This is called after handleDrag by the Frame component
    // We don't want to override the snap decision made in handleDrag
  };

  return {
    containerHeight,
    handleDrag,
    handleDragMove,
    handleDragEnd,
    dragStartY,
    dragStartTime,
    isDragging,
  };
};

/**
 * Component to display intermediate bus stops using LTA API
 */
const IntermediateStops = ({
  step,
  serviceNo,
  isExpanded,
}: {
  step: RouteStep;
  serviceNo: string;
  isExpanded: boolean;
}) => {
  const departureStop = step.transitDetails?.stopDetails?.departureStop;
  const arrivalStop = step.transitDetails?.stopDetails?.arrivalStop;

  // LTA API doesn't work on web due to CORS - only fetch on mobile
  const isWeb = Platform.OS === 'web';
  const enableFetch = isExpanded && !isWeb;

  // Find nearest LTA bus stops to the Google Maps coordinates
  const { data: fromLTAStop } = useNearestBusStop(
    departureStop?.location?.latLng?.latitude || 0,
    departureStop?.location?.latLng?.longitude || 0,
    150, // 150m radius
    enableFetch && !!departureStop
  );

  const { data: toLTAStop } = useNearestBusStop(
    arrivalStop?.location?.latLng?.latitude || 0,
    arrivalStop?.location?.latLng?.longitude || 0,
    150,
    enableFetch && !!arrivalStop
  );

  // Fetch intermediate stops if we found matching LTA stops
  const { data: intermediateStops, isLoading } = useStopsBetween(
    serviceNo,
    fromLTAStop?.BusStopCode || '',
    toLTAStop?.BusStopCode || '',
    1, // Default to direction 1 (we could make this smarter)
    enableFetch && !!fromLTAStop && !!toLTAStop
  );

  if (!isExpanded) return null;

  // Show message on web platform
  if (isWeb) {
    return (
      <View
        style={{
          paddingLeft: 24,
          paddingVertical: 8,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '400',
            color: '#999',
            fontFamily: 'Inter',
            fontStyle: 'italic',
          }}
        >
          Detailed stop list available on mobile only
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View
        style={{
          paddingLeft: 24,
          paddingVertical: 8,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: '400',
            color: '#737373',
            fontFamily: 'Inter',
            fontStyle: 'italic',
          }}
        >
          Loading stops...
        </Text>
      </View>
    );
  }

  if (!intermediateStops || intermediateStops.length === 0) {
    const numStops = step.transitDetails?.stopCount || 0;
    const boardingStop = departureStop?.name || 'Unknown';
    const alightingStop = arrivalStop?.name || 'Unknown';

    return (
      <View
        style={{
          paddingLeft: 24,
          paddingVertical: 8,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: '400',
            color: '#737373',
            fontFamily: 'Inter',
            fontStyle: 'italic',
          }}
        >
          {numStops} {numStops === 1 ? 'stop' : 'stops'} between {boardingStop}{' '}
          and {alightingStop}
        </Text>
      </View>
    );
  }

  // Display the list of intermediate stops
  return (
    <View
      style={{
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
        paddingLeft: 24,
        paddingVertical: 8,
      }}
    >
      {intermediateStops.map((stop, index) => {
        const isFirst = index === 0;
        const isLast = index === intermediateStops.length - 1;

        return (
          <View
            key={`${stop.BusStopCode}-${stop.StopSequence}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: isFirst || isLast ? '#211F26' : '#A3A3A3',
              }}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: isFirst || isLast ? '500' : '400',
                color: isFirst || isLast ? '#211F26' : '#525252',
                fontFamily: 'Inter',
              }}
            >
              {stop.stopDetails?.Description || `Stop ${stop.BusStopCode}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

export default function NavigationPage() {
  console.log('[COMPONENT] 🔄 NavigationPage rendered');
  
  const router = useRouter();
  const { destination, from, to, userLat, userLng, customOrigin, customOriginLat, customOriginLng } = useLocalSearchParams();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [routeExpanded, setRouteExpanded] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [selectedInternalRoute, setSelectedInternalRoute] = useState<InternalBusRoute | null>(null);
  const [showIntermediateStops, setShowIntermediateStops] = useState(false); // State for expanding bus stops
  
  // Internal route polylines for map display
  const [internalRoutePolylines, setInternalRoutePolylines] = useState<{
    walkToStop: google.maps.LatLngLiteral[];
    busSegment: google.maps.LatLngLiteral[];
    walkFromStop: google.maps.LatLngLiteral[];
    busRouteColor?: string;
  } | null>(null);
  
  // Search panel state - using a single state to track panel position
  const [panelState, setPanelState] = useState<'closed' | 'animating' | 'expanded'>('closed');
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<BusStation[]>([]);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [searchMode, setSearchMode] = useState<'origin' | 'destination'>('origin'); // Track what we're selecting
  
  // Log panel state changes
  useEffect(() => {
    console.log('[PANEL STATE] 🔄 State changed to:', panelState);
  }, [panelState]);
  
  // Animation for search panel slide up
  const searchPanelAnimation = React.useRef(new Animated.Value(0)).current;

  // Use drag handlers for the bottom sheet
  const {
    containerHeight,
    handleDrag,
    handleDragMove,
    handleDragEnd,
    dragStartY,
    dragStartTime,
    isDragging,
  } = useDragHandlers();
  
  // Log containerHeight changes to see if it's affecting the animation
  useEffect(() => {
    console.log('[CONTAINER HEIGHT] 📏 Height changed to:', containerHeight + '%', 'panelState:', panelState);
    if (panelState === 'expanded') {
      console.log('[CONTAINER HEIGHT] ⚠️ Height changed while panel is EXPANDED - this might cause re-render!');
    }
  }, [containerHeight, panelState]);

  // Use global location hook
  const { coords: globalUserLocation } = useLocation();

  // Get destination from URL parameter or default to "COM3"
  const currentDestination =
    typeof destination === 'string' ? destination : 'COM3';

  // Determine the origin display name and coordinates
  const originName = typeof customOrigin === 'string' ? customOrigin : 'Your location';
  const hasCustomOrigin = typeof customOrigin === 'string' && customOrigin !== '';
  
  // Parse URL user location parameters
  const urlUserLocation = React.useMemo(() => {
    // First, check if there's a named origin location (customOrigin parameter)
    if (typeof customOrigin === 'string' && customOrigin !== '') {
      // Look up the bus stop coordinates for this custom origin
      const busStation = getBusStationByName(customOrigin);
      if (busStation?.coordinates) {
        console.log('📍 [URL] Origin from customOrigin bus station:', customOrigin, {
          lat: busStation.coordinates.latitude,
          lng: busStation.coordinates.longitude
        });
        return {
          latitude: busStation.coordinates.latitude,
          longitude: busStation.coordinates.longitude
        };
      }
      // If not a bus station, might be a landmark - will handle later
      console.warn('⚠️ customOrigin not found in bus stations:', customOrigin);
    }
    
    // Otherwise use userLat/userLng coordinates
    if (typeof userLat === 'string' && typeof userLng === 'string') {
      const lat = parseFloat(userLat);
      const lng = parseFloat(userLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        console.log('📍 [URL] User location from URL coordinates:', { lat, lng });
        return { latitude: lat, longitude: lng };
      }
    }
    return null;
  }, [customOrigin, userLat, userLng]);
  
  // Parse custom origin coordinates if available
  const customOriginCoords = React.useMemo(() => {
    if (typeof customOriginLat === 'string' && typeof customOriginLng === 'string') {
      const lat = parseFloat(customOriginLat);
      const lng = parseFloat(customOriginLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
    return null;
  }, [customOriginLat, customOriginLng]);

  // Calculate the effective origin for routing - priority order:
  // 1. Custom origin from URL (customOriginLat/Lng)
  // 2. User location from URL (userLat/Lng)  
  // 3. GPS userLocation state
  // 4. Global user location from context
  const effectiveOrigin = React.useMemo(() => {
    if (customOriginCoords) {
      console.log('🎯 Using custom origin:', customOriginCoords);
      return customOriginCoords;
    }
    if (urlUserLocation) {
      console.log('🎯 Using URL user location:', urlUserLocation);
      return urlUserLocation;
    }
    if (userLocation) {
      console.log('🎯 Using GPS user location:', userLocation);
      return userLocation;
    }
    if (globalUserLocation) {
      console.log('🎯 Using global user location:', globalUserLocation);
      return {
        latitude: globalUserLocation.latitude,
        longitude: globalUserLocation.longitude,
      };
    }
    console.warn('⚠️ No user location available!');
    return null;
  }, [customOriginCoords, urlUserLocation, userLocation, globalUserLocation]);

  // Debug logging for internal route finder
  useEffect(() => {
    console.log('🔧 [DEBUG] Internal Route Finder State:', {
      effectiveOrigin,
      destinationCoords,
      enabled: !!effectiveOrigin && !!destinationCoords,
      hasRoutes: routes.length > 0,
      googleMapsTime: routes.length > 0 && routes[0].legs?.[0]?.duration 
        ? durationToMinutes(routes[0].legs[0].duration) * 60 
        : undefined
    });
  }, [effectiveOrigin, destinationCoords, routes]);

  // Use internal route finder hook
  const {
    routes: internalRoutes,
    bestRoute: bestInternalRoute,
    isLoading: isLoadingInternalRoutes,
    error: internalRouteError,
    recommendInternal,
    googleMapsTime,
  } = useInternalRouteFinder({
    origin: effectiveOrigin,
    destination: destinationCoords ? {
      latitude: destinationCoords.lat,
      longitude: destinationCoords.lng,
    } : null,
    googleMapsTimeSeconds: routes.length > 0 && routes[0].legs?.[0]?.duration 
      ? durationToMinutes(routes[0].legs[0].duration) * 60 
      : undefined,
    enabled: !!effectiveOrigin && !!destinationCoords,
  });

  // Update userLocation state when effectiveOrigin changes (for map display)
  useEffect(() => {
    if (effectiveOrigin) {
      setUserLocation(effectiveOrigin);
    }
  }, [effectiveOrigin]);

  // Animate search panel slide up/down based on panelState
  useEffect(() => {
    console.log('[PANEL STATE] useEffect triggered - panelState:', panelState);
    
    if (panelState === 'expanded') {
      // Already expanded, don't re-animate
      console.log('[PANEL STATE] ✅ Already in EXPANDED state - skipping animation');
      return;
    }
    
    if (panelState === 'animating') {
      // Start animation to expand
      console.log('[PANEL STATE] 🎬 Starting animation to EXPAND (0 → 1)');
      Animated.spring(searchPanelAnimation, {
        toValue: 1,
        useNativeDriver: false,
        tension: 65,
        friction: 10,
        velocity: 2,
      }).start(() => {
        // Mark as fully expanded after animation completes
        console.log('[PANEL STATE] ✨ Animation complete - setting state to EXPANDED');
        setPanelState('expanded');
      });
    } else if (panelState === 'closed') {
      // Animate back to closed
      console.log('[PANEL STATE] 📉 Animating back to CLOSED (1 → 0)');
      Animated.spring(searchPanelAnimation, {
        toValue: 0,
        useNativeDriver: false,
        tension: 65,
        friction: 10,
        velocity: 2,
      }).start(() => {
        console.log('[PANEL STATE] ✅ Panel fully closed');
      });
    }
  }, [panelState, searchPanelAnimation]);

  // Load recent searches on component mount
  useEffect(() => {
    const loadRecentSearches = () => {
      const stored = getRecentSearches();
      setRecentSearches(stored);
    };
    loadRecentSearches();
  }, []);

  // Handle search input changes
  useEffect(() => {
    if (searchText.trim().length > 0) {
      const results = searchBusStations(searchText);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchText]);

  // Helper function to get actual location names from route data
  const getActualLocationNames = (): { fromName: string; toName: string } => {
    // If we have route data, extract the actual stop names
    if (routes.length > 0 && routes[0].legs?.[0]?.steps) {
      const steps = routes[0].legs[0].steps;
      
      // Find the first transit step to get the departure stop name
      const firstTransitStep = steps.find(step => step.travelMode === 'TRANSIT');
      const departureStopName = firstTransitStep?.transitDetails?.stopDetails?.departureStop?.name;
      
      // Find the last transit step to get the arrival stop name
      const lastTransitStep = [...steps].reverse().find(step => step.travelMode === 'TRANSIT');
      const arrivalStopName = lastTransitStep?.transitDetails?.stopDetails?.arrivalStop?.name;
      
      return {
        fromName: departureStopName || (typeof from === 'string' ? from : 'Your location'),
        toName: arrivalStopName || toLocation,
      };
    }
    
    // Fallback to URL parameters or custom origin
    return {
      fromName: originName,
      toName: toLocation,
    };
  };

  // Get from and to for favorites - use custom origin if available
  const fromLocation = originName;
  const toLocation = typeof to === 'string' ? to : currentDestination;

  // Check if this route is already favorited - use the names consistently
  const [favorited, setFavorited] = useState(() =>
    isFavorite(fromLocation, toLocation)
  );

  // Update favorited state when routes change or location changes
  useEffect(() => {
    setFavorited(isFavorite(fromLocation, toLocation));
  }, [fromLocation, toLocation]);

  const handleSaveFavorite = () => {
    // Use the same names for consistency - fromLocation and toLocation
    // These are what we check against in isFavorite()
    
    if (!favorited) {
      // Save the favorite
      addFavorite({
        from: fromLocation,
        to: toLocation,
        fromId: fromLocation,
        toId: toLocation,
      });
      setFavorited(true);
    } else {
      // Remove the favorite
      const favorites = getFavorites();
      const existingFavorite = favorites.find(
        (f) => f.fromId === fromLocation && f.toId === toLocation
      );
      if (existingFavorite) {
        removeFavorite(existingFavorite.id);
        setFavorited(false);
      }
    }
  };

  // Helper to map destination names to coordinates (simplified for now)
  const getDestinationCoordinates = (dest: string): { lat: number; lng: number } | null => {
    const destinations: Record<string, { lat: number; lng: number }> = {
      // Residential Colleges
      'COM1': { lat: 1.29453, lng: 103.77397 },
      'COM2': { lat: 1.29453, lng: 103.77397 },
      'COM3': { lat: 1.29453, lng: 103.77397 },
      'PGP': { lat: 1.29289, lng: 103.78004 },
      'KRB': { lat: 1.29481, lng: 103.76986 },
      
      // Academic Buildings
      'LT13': { lat: 1.29464, lng: 103.77131 },
      'AS5': { lat: 1.29364, lng: 103.77253 },
      'BIZ2': { lat: 1.29363, lng: 103.77534 },
      'TCOMS': { lat: 1.29289, lng: 103.77657 },
      'YIHHT': { lat: 1.29869, lng: 103.77463 },
      'MUSEUM': { lat: 1.30120, lng: 103.77372 },
      
      // Special Locations (common names)
      'UTOWN': { lat: 1.30373, lng: 103.77434 },
      'UNIVERSITY TOWN': { lat: 1.30373, lng: 103.77434 },
      'UTown': { lat: 1.30373, lng: 103.77434 },
      'THE ICON': { lat: 1.29700, lng: 103.77300 },
      'VENTUS': { lat: 1.29400, lng: 103.77600 },
      'KENT RIDGE': { lat: 1.29400, lng: 103.77000 },
      'SCIENCE': { lat: 1.29300, lng: 103.77500 },
      'ENGINEERING': { lat: 1.29500, lng: 103.77200 },
    };
    
    // Try exact match first (case-insensitive)
    const upperDest = dest.toUpperCase();
    if (destinations[upperDest]) {
      return destinations[upperDest];
    }
    
    // Try partial match in hardcoded destinations
    for (const [key, coords] of Object.entries(destinations)) {
      if (key.includes(upperDest) || upperDest.includes(key)) {
        return coords;
      }
    }
    
    // Try to find in bus stations database
    const busStation = getBusStationByName(dest);
    if (busStation?.coordinates) {
      return {
        lat: busStation.coordinates.latitude,
        lng: busStation.coordinates.longitude,
      };
    }
    
    return null;
  };

  // Fetch routes when destination changes
  useEffect(() => {
    const fetchRoutes = async () => {
      const destCoords = getDestinationCoordinates(currentDestination);
      if (!destCoords) {
        setRouteError(`Destination coordinates not found for: "${currentDestination}"`);
        setIsLoadingRoutes(false);
        return;
      }

      setDestinationCoords(destCoords); // Store destination coords for map marker

      // If we don't have an origin yet, wait
      if (!effectiveOrigin) {
        setIsLoadingRoutes(false);
        return;
      }

      setIsLoadingRoutes(true);
      setRouteError(null);

      try {
        const origin: Waypoint = {
          location: {
            latLng: effectiveOrigin,
          },
        };

        const dest: Waypoint = {
          location: {
            latLng: {
              latitude: destCoords.lat,
              longitude: destCoords.lng,
            },
          },
        };
        
        // Call Google Routes API
        const result = await getTransitRoute(origin, dest);

        if (result && result.routes && result.routes.length > 0) {
          setRoutes(result.routes);
          setRouteError(null);
        } else {
          setRouteError('No routes found');
        }
      } catch (error) {
        setRouteError(error instanceof Error ? error.message : 'Failed to fetch routes');
      } finally {
        setIsLoadingRoutes(false);
      }
    };

    fetchRoutes();
  }, [currentDestination, effectiveOrigin]);

  // Generate internal route polylines when bestInternalRoute changes
  useEffect(() => {
    const generatePolylines = async () => {
      if (!bestInternalRoute) {
        setInternalRoutePolylines(null);
        return;
      }

      try {
        console.log('🗺️ Generating polylines for internal route:', {
          routeCode: bestInternalRoute.routeCode,
          departure: bestInternalRoute.departureStop.name,
          arrival: bestInternalRoute.arrivalStop.name
        });

        const polylines = await createInternalRoutePolylines(
          bestInternalRoute.routeCode,
          bestInternalRoute.departureStop.name, // e.g., 'PGP'
          bestInternalRoute.arrivalStop.name,   // e.g., 'UTOWN'
          bestInternalRoute.walkToStopRoute?.polyline?.encodedPolyline,
          bestInternalRoute.walkFromStopRoute?.polyline?.encodedPolyline
        );

        setInternalRoutePolylines(polylines);
        console.log('✅ Internal route polylines generated:', {
          walkToStopPoints: polylines.walkToStop.length,
          busSegmentPoints: polylines.busSegment.length,
          walkFromStopPoints: polylines.walkFromStop.length
        });
      } catch (error) {
        console.error('❌ Error generating internal route polylines:', error);
        setInternalRoutePolylines(null);
      }
    };

    generatePolylines();
  }, [bestInternalRoute]);

  // Manage all locations as a unified list
  type LocationItem = {
    id: string;
    text: string;
    type: 'origin' | 'stop' | 'destination';
    isEditable: boolean;
  };

  const [locations, setLocations] = useState<LocationItem[]>([
    { id: '1', text: originName, type: 'origin', isEditable: false },
    {
      id: '2',
      text: currentDestination,
      type: 'destination',
      isEditable: false,
    },
  ]);

  // Update locations when originName changes
  useEffect(() => {
    setLocations([
      { id: '1', text: originName, type: 'origin', isEditable: false },
      {
        id: '2',
        text: currentDestination,
        type: 'destination',
        isEditable: false,
      },
    ]);
  }, [originName, currentDestination]);

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

  // Handle location selection from search
  const handleLocationSelect = (item: BusStation) => {
    // Add to recent searches
    addRecentSearch(item);
    
    if (searchMode === 'origin') {
      // Update origin with selected location
      router.replace({
        pathname: '/navigation' as any,
        params: {
          destination: currentDestination,
          customOrigin: item.name,
          customOriginLat: item.coordinates?.latitude?.toString(),
          customOriginLng: item.coordinates?.longitude?.toString(),
          userLat,
          userLng,
        },
      });
    } else {
      // Update destination with selected location
      router.replace({
        pathname: '/navigation' as any,
        params: {
          destination: item.name,
          customOrigin: typeof customOrigin === 'string' ? customOrigin : undefined,
          customOriginLat: typeof customOriginLat === 'string' ? customOriginLat : undefined,
          customOriginLng: typeof customOriginLng === 'string' ? customOriginLng : undefined,
          userLat,
          userLng,
        },
      });
    }
    
    // Close search panel
    setPanelState('closed');
    setSearchText('');
  };

  // Show X and drag icons when there are 3+ locations (origin + at least 1 stop + destination)
  const showControls = locations.length >= 3;

  // Get bus route color for internal route display
  const getBusRouteColor = (routeCode: string): string => {
    const colorMap: Record<string, string> = {
      A1: '#FF0000', // Red
      A2: '#E3CE0B', // Yellow
      D1: '#C77DE2', // Light Purple
      D2: '#6F1B6F', // Dark Purple
      BTC: '#EF8136', // Orange
      E: '#00B050', // Green
      K: '#345A9B', // Blue
      L: '#BFBFBF', // Gray
    };
    return colorMap[routeCode] || '#6F1B6F'; // Default to D2 purple
  };

  // Memoize internal route polylines with bus route color
  const memoizedInternalRoutePolylines = useMemo(() => {
    if (!internalRoutePolylines || !bestInternalRoute) {
      return null;
    }
    // Ensure all arrays are properly defined
    return {
      walkToStop: Array.isArray(internalRoutePolylines.walkToStop) 
        ? internalRoutePolylines.walkToStop 
        : [],
      busSegment: Array.isArray(internalRoutePolylines.busSegment) 
        ? internalRoutePolylines.busSegment 
        : [],
      walkFromStop: Array.isArray(internalRoutePolylines.walkFromStop) 
        ? internalRoutePolylines.walkFromStop 
        : [],
      busRouteColor: getBusRouteColor(bestInternalRoute.routeCode),
    };
  }, [internalRoutePolylines, bestInternalRoute]);

  // Memoize visible bus stops for internal route display
  const visibleBusStops = useMemo(() => {
    if (!recommendInternal || !bestInternalRoute) {
      return undefined; // Don't filter stops if not showing internal route
    }
    // Include departure stop (extract code), all intermediate stops, and arrival stop (extract code)
    // Note: departureStop and arrivalStop are BusStop objects, intermediateStops are strings
    return [
      bestInternalRoute.departureStop.code, // Extract code from BusStop object
      ...bestInternalRoute.intermediateStops, // Already strings
      bestInternalRoute.arrivalStop.code, // Extract code from BusStop object
    ];
  }, [recommendInternal, bestInternalRoute]);

  return (
    <View className="flex-1" style={{ backgroundColor: '#FAFAFA' }}>
      <FocusAwareStatusBar />

      {/* Map Background */}
      <View className="flex-1" style={{ overflow: 'visible' }}>
        <InteractiveMap
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          routePolyline={!isLoadingRoutes && !isLoadingInternalRoutes && !recommendInternal ? routes[0]?.polyline?.encodedPolyline : undefined}
          routeSteps={!isLoadingRoutes && !isLoadingInternalRoutes && !recommendInternal ? routes[0]?.legs?.[0]?.steps : undefined}
          internalRoutePolylines={!isLoadingRoutes && !isLoadingInternalRoutes && recommendInternal ? memoizedInternalRoutePolylines : undefined}
          origin={userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : undefined}
          destination={destinationCoords || undefined}
          initialRegion={
            userLocation
              ? {
                  latitude: userLocation.latitude - 0.044,
                  longitude: userLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }
              : undefined
          }
          showLandmarks={false}
          showMapControls={false}
          activeRoute={recommendInternal && bestInternalRoute ? (bestInternalRoute.routeCode as RouteCode) : null}
          showBusStops={recommendInternal} // Show bus stops when displaying internal route
          visibleBusStops={visibleBusStops} // Only show stops on the internal route
          mapFilters={{
            important: true,
            'bus-stops': false,
            academic: false,
            residences: false,
            'bus-route-a1': false,
            'bus-route-a2': false,
            'bus-route-d1': false,
            'bus-route-d2': false,
            'bus-route-btc': false,
            'bus-route-e': false,
            'bus-route-k': false,
            'bus-route-l': false,
          }}
        />

        {/* Location Input Card */}
        <View
          style={{
            marginHorizontal: 10,
            marginTop: 40,
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            padding: 12,
            paddingHorizontal: 20,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
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
                <Pressable
                  onPress={() => {
                    // Allow clicking on both origin and destination to change them
                    if (isOrigin) {
                      console.log('[CLICK] 🎯 Origin clicked - Current panelState:', panelState);
                      setSearchMode('origin');
                      // Only trigger animation if not already expanded
                      if (panelState !== 'expanded') {
                        console.log('[CLICK] 🚀 Setting panelState to ANIMATING');
                        setPanelState('animating');
                      } else {
                        console.log('[CLICK] ⏸️ Panel already EXPANDED - not triggering animation');
                      }
                    } else if (isDestination) {
                      console.log('[CLICK] 🎯 Destination clicked - Current panelState:', panelState);
                      setSearchMode('destination');
                      // Only trigger animation if not already expanded
                      if (panelState !== 'expanded') {
                        console.log('[CLICK] 🚀 Setting panelState to ANIMATING');
                        setPanelState('animating');
                      } else {
                        console.log('[CLICK] ⏸️ Panel already EXPANDED - not triggering animation');
                      }
                    }
                  }}
                  disabled={!isOrigin && !isDestination}
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
                </Pressable>

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
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <PlusCircle />
            <Text style={{ fontSize: 16, fontWeight: '500', color: '#274F9C' }}>
              Add Stop
            </Text>
          </Pressable>
        </View>

        {/* Backdrop/Shading - only appears when in search mode */}
        {(panelState === 'animating' || panelState === 'expanded') && (
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              pointerEvents: 'none', // Allow touches to pass through
              transition: 'background-color 0.3s ease',
            } as any}
          />
        )}

        {/* Journey Details Card */}
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 20,
            paddingTop: 4,
            boxShadow: searchPanelAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [
                '0 1px 3px rgba(0, 0, 0, 0.1)',
                '0 4px 12px rgba(0, 0, 0, 0.15)',
              ],
            }) as any,
            elevation: searchPanelAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [5, 10],
            }) as any,
            maxHeight: searchPanelAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [
                panelState === 'expanded' ? '75%' : `${containerHeight}%`, 
                '75%'
              ], // If already expanded, stay at 75%, otherwise expand from containerHeight to 75%
            }) as any,
          }}
          onTouchStart={(e: any) => {
            const touch = e.nativeEvent.touches?.[0];
            if (touch && dragStartY && isDragging && dragStartTime) {
              dragStartY.current = touch.pageY;
              dragStartTime.current = Date.now();
              isDragging.current = true;
            }
          }}
          onTouchMove={(e: any) => {
            if (!isDragging || !isDragging.current) return;
            const touch = e.nativeEvent.touches?.[0];
            if (touch && dragStartY) {
              const dy = touch.pageY - dragStartY.current;
              handleDragMove(dy);
            }
          }}
          onTouchEnd={(e: any) => {
            if (!isDragging || !isDragging.current) return;
            const touch = e.nativeEvent.changedTouches?.[0];
            if (touch && dragStartY && dragStartTime) {
              const dy = touch.pageY - dragStartY.current;
              const dt = Date.now() - dragStartTime.current;
              const vy = dy / dt;
              handleDrag({ dy, vy });
              isDragging.current = false;
            }
          }}
        >
          <Frame 
            onDrag={handleDrag}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          />
          <ScrollView
            scrollEnabled={containerHeight > 50}
            showsVerticalScrollIndicator={containerHeight > 50}
            style={{ marginTop: 12 }}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {(panelState === 'animating' || panelState === 'expanded') ? (
              // SEARCH PANEL
              <Animated.View
                style={{
                  opacity: searchPanelAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                }}
              >
                {/* Search Header */}
                <View
                  style={{
                    marginBottom: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#E5E5E5',
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                      elevation: 1,
                    }}
                  >
                    <SearchIcon />
                    <TextInput
                      placeholder={
                        searchMode === 'origin'
                          ? 'Search for starting location...'
                          : 'Search for destination...'
                      }
                      placeholderTextColor="#737373"
                      value={searchText}
                      onChangeText={setSearchText}
                      autoFocus={true}
                      style={{
                        flex: 1,
                        fontSize: 16,
                        color: '#211F26',
                        padding: 0,
                        outlineWidth: 0,
                      }}
                    />
                  </View>
                  <Pressable
                    onPress={() => {
                      setPanelState('closed');
                      setSearchText('');
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '500',
                        color: '#274F9C',
                      }}
                    >
                      Cancel
                    </Text>
                  </Pressable>
                </View>

                {/* Search Results or Recent Searches */}
                {searchText.trim().length > 0 ? (
                  // Search Results
                  <View>
                    {searchResults.length > 0 ? (
                      <View>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '500',
                            color: '#737373',
                            marginBottom: 12,
                          }}
                        >
                          Search Results ({searchResults.length})
                        </Text>
                        {searchResults.map((item, index) => {
                          const IconComponent = item.icon;
                          return (
                            <Pressable
                              key={item.id}
                              onPress={() => handleLocationSelect(item)}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 12,
                                paddingVertical: 12,
                                borderBottomWidth: index < searchResults.length - 1 ? 1 : 0,
                                borderBottomColor: '#E5E5E5',
                              }}
                            >
                              <View
                                style={{
                                  width: 36,
                                  height: 36,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderRadius: 18,
                                  backgroundColor: '#F5F5F5',
                                  padding: 8,
                                }}
                              >
                                <IconComponent style={{ width: 20, height: 20 }} />
                              </View>
                              <Text
                                style={{
                                  flex: 1,
                                  fontSize: 16,
                                  fontWeight: '500',
                                  color: '#211F26',
                                }}
                              >
                                {item.name}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                        <Text style={{ fontSize: 16, color: '#737373' }}>
                          No results found for "{searchText}"
                        </Text>
                        <Text
                          style={{
                            marginTop: 8,
                            fontSize: 14,
                            color: '#A3A3A3',
                            textAlign: 'center',
                          }}
                        >
                          Try searching with different keywords
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  // Recent Searches
                  <View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: '#737373',
                        marginBottom: 12,
                      }}
                    >
                      Recents
                    </Text>
                    {recentSearches.slice(0, 5).map((item, index) => {
                      const IconComponent = item.icon || Van;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => handleLocationSelect(item)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            paddingVertical: 12,
                            borderBottomWidth: index < recentSearches.slice(0, 5).length - 1 ? 1 : 0,
                            borderBottomColor: '#E5E5E5',
                          }}
                        >
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 18,
                              backgroundColor: '#F5F5F5',
                              padding: 8,
                            }}
                          >
                            <IconComponent style={{ width: 20, height: 20 }} />
                          </View>
                          <Text
                            style={{
                              flex: 1,
                              fontSize: 16,
                              fontWeight: '500',
                              color: '#211F26',
                            }}
                          >
                            {item.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </Animated.View>
            ) : (
              // JOURNEY DETAILS (original content)
              <Animated.View
                style={{
                  opacity: searchPanelAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                }}
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
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
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
              {/* Loading/Error States */}
              {(isLoadingRoutes || isLoadingInternalRoutes) && (
                <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="large" color="#274F9C" />
                </View>
              )}
              {routeError && !isLoadingRoutes && !isLoadingInternalRoutes && (
                <View style={{ padding: 16, backgroundColor: '#FFE5E5', borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, color: '#F00', fontWeight: '600', marginBottom: 8 }}>
                    ❌ Error: {routeError}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                    Destination: {currentDestination}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>
                    Check the browser console for more details
                  </Text>
                </View>
              )}

              {/* Show Internal Route if it's faster, otherwise show Google Maps route */}
              {!isLoadingRoutes && !isLoadingInternalRoutes && !routeError && bestInternalRoute ? (
                // DISPLAY INTERNAL BUS ROUTE - Using same format as Google Maps
                <>
                  {/* Step 1: Origin location - SAME FORMAT AS GOOGLE MAPS */}
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
                        {originName}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, color: '#09090B' }}>
                      {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </Text>
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
                    <View style={{ height: 1, flex: 1, backgroundColor: '#E4E7E7' }} />
                  </View>

                  {/* Walking step to bus stop - SAME FORMAT AS GOOGLE MAPS */}
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
                        Walk {Math.ceil(bestInternalRoute.walkToStopTime / 60)} min{Math.ceil(bestInternalRoute.walkToStopTime / 60) !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, color: '#09090B' }} />
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
                    <View style={{ height: 1, flex: 1, backgroundColor: '#E4E7E7' }} />
                  </View>

                  {/* Bus transit step - SAME FORMAT AS GOOGLE MAPS */}
                  {(() => {
                    // Get route color based on route code - MATCHING API COLORS
                    const routeColor = bestInternalRoute.routeCode === 'A1' ? '#FF0000' : // Red
                                     bestInternalRoute.routeCode === 'A2' ? '#E3CE0B' : // Yellow
                                     bestInternalRoute.routeCode === 'D1' ? '#C77DE2' : // Light Purple
                                     bestInternalRoute.routeCode === 'D2' ? '#6F1B6F' : // Dark Purple
                                     bestInternalRoute.routeCode === 'BTC' ? '#EF8136' : // Orange
                                     bestInternalRoute.routeCode === 'E' ? '#00B050' : // Green
                                     bestInternalRoute.routeCode === 'K' ? '#345A9B' : // Blue
                                     '#BFBFBF'; // L (Gray) or fallback

                    const lineName = bestInternalRoute.routeCode;
                    const boardingStop = bestInternalRoute.departureStop.caption;
                    const alightingStop = bestInternalRoute.arrivalStop.caption;
                    const waitMinutes = Math.ceil(bestInternalRoute.waitingTime / 60);
                    const rideMinutes = Math.ceil(bestInternalRoute.busTravelTime / 60);

                    return (
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
                            alignItems: 'flex-start',
                            gap: 16,
                            flex: 1,
                          }}
                        >
                          <BusIndicator expanded={false} color={routeColor} />

                          <View
                            style={{
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: 24,
                              flex: 1,
                            }}
                          >
                            {/* Boarding stop */}
                            <View style={{ alignSelf: 'stretch' }}>
                              <Text style={{ fontSize: 16, fontWeight: '500', color: '#211F26' }}>
                                {boardingStop}
                              </Text>

                              <View
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  height: 37,
                                  borderRadius: 5,
                                  marginTop: 8,
                                }}
                              >
                                <View
                                  style={{
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                    minWidth: 38,
                                    height: 37,
                                    backgroundColor: routeColor,
                                    borderTopLeftRadius: 5,
                                    borderBottomLeftRadius: 5,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    paddingHorizontal: 8,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 14,
                                      fontWeight: '600',
                                      color: '#FFFFFF',
                                      fontFamily: 'Inter',
                                    }}
                                  >
                                    {lineName}
                                  </Text>
                                </View>
                                <View
                                  style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    height: 37,
                                    borderTopWidth: 1,
                                    borderRightWidth: 1,
                                    borderBottomWidth: 1,
                                    borderColor: '#E5E5E5',
                                    borderTopRightRadius: 5,
                                    borderBottomRightRadius: 5,
                                    backgroundColor: '#FFFFFF',
                                    overflow: 'hidden',
                                    marginLeft: -1,
                                  }}
                                >
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      paddingVertical: 7,
                                      paddingHorizontal: 10,
                                      backgroundColor: '#FFFFFF',
                                      gap: 8,
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: 14,
                                        fontWeight: '500',
                                        color: '#211F26',
                                        fontFamily: 'Inter',
                                      }}
                                    >
                                      {waitMinutes} Min
                                    </Text>
                                    <CapacityIcons opacity={1} />
                                  </View>
                                </View>
                              </View>

                              <Pressable
                                onPress={() => setShowIntermediateStops(!showIntermediateStops)}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 4,
                                  marginTop: 8,
                                }}
                              >
                                <View style={{ transform: [{ rotate: showIntermediateStops ? '180deg' : '0deg' }] }}>
                                  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                                    <Path
                                      d="M4 6L8 10L12 6"
                                      stroke="#737373"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </Svg>
                                </View>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: '500',
                                    color: '#211F26',
                                    fontFamily: 'Inter',
                                  }}
                                >
                                  {bestInternalRoute.intermediateStops.length > 0 
                                    ? `${bestInternalRoute.intermediateStops.length} stop${bestInternalRoute.intermediateStops.length !== 1 ? 's' : ''} in between • ${rideMinutes} min${rideMinutes !== 1 ? 's' : ''}`
                                    : `Direct ride • ${rideMinutes} min${rideMinutes !== 1 ? 's' : ''}`
                                  }
                                </Text>
                              </Pressable>

                              {/* Intermediate stops list */}
                              {showIntermediateStops && bestInternalRoute.intermediateStops.length > 0 && (
                                <View style={{ paddingLeft: 24, paddingTop: 8, gap: 8 }}>
                                  {bestInternalRoute.intermediateStops.map((stopName, index) => (
                                    <View
                                      key={index}
                                      style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 8,
                                      }}
                                    >
                                      <View
                                        style={{
                                          width: 6,
                                          height: 6,
                                          borderRadius: 3,
                                          backgroundColor: '#A3A3A3',
                                        }}
                                      />
                                      <Text
                                        style={{
                                          fontSize: 13,
                                          fontWeight: '400',
                                          color: '#525252',
                                          fontFamily: 'Inter',
                                        }}
                                      >
                                        {stopName}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>

                            {/* Alighting stop */}
                            <View style={{ alignSelf: 'stretch' }}>
                              <Text style={{ fontSize: 16, fontWeight: '500', color: '#211F26' }}>
                                {alightingStop}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Live bus tracking info */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingTop: 12,
                      paddingLeft: 36,
                    }}
                  >
                    <Svg width={14} height={14} viewBox="0 0 20 20" fill="none">
                      <Circle cx="10" cy="10" r="8" fill="#00B050" opacity={0.2} />
                      <Circle cx="10" cy="10" r="4" fill="#00B050" />
                    </Svg>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '400',
                        color: '#737373',
                        fontFamily: 'Inter',
                        fontStyle: 'italic',
                      }}
                    >
                      Live bus position shown on map
                    </Text>
                  </View>

                  {/* Connecting line before walking */}
                  {bestInternalRoute.walkFromStopTime > 0 && (
                    <>
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
                        <View style={{ height: 1, flex: 1, backgroundColor: '#E4E7E7' }} />
                      </View>

                      {/* Walking step from bus stop */}
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
                            Walk {Math.ceil(bestInternalRoute.walkFromStopTime / 60)} min{Math.ceil(bestInternalRoute.walkFromStopTime / 60) !== 1 ? 's' : ''}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, color: '#09090B' }} />
                      </View>
                    </>
                  )}

                  {/* Connecting line before destination */}
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
                    <View style={{ height: 1, flex: 1, backgroundColor: '#E4E7E7' }} />
                  </View>

                  {/* Final Destination - SAME FORMAT AS GOOGLE MAPS */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <MapPin />
                      <Text style={{ fontSize: 16, fontWeight: '500', color: '#211F26' }}>
                        {currentDestination}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, color: '#09090B' }}>
                      {new Date(Date.now() + bestInternalRoute.totalTime * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </Text>
                  </View>
                </>
              ) : !isLoadingRoutes && !isLoadingInternalRoutes && !routeError && routes.length > 0 && routes[0].legs ? (
                // DISPLAY GOOGLE MAPS ROUTE (original code)
                <>
                  {/* Step 1: Origin location */}
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
                        {originName}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, color: '#09090B' }}>
                      {routes[0].legs[0]?.steps?.[0]?.transitDetails?.stopDetails?.departureTime
                        ? formatTime(routes[0].legs[0].steps[0].transitDetails.stopDetails.departureTime)
                        : ''}
                    </Text>
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

              {/* Map through route steps */}
              {!isLoadingRoutes && !routeError && routes.length > 0 && routes[0].legs?.[0]?.steps && (
                <>
                  {(() => {
                    // Combine consecutive walking steps
                    const steps = routes[0].legs[0].steps;
                    const combinedSteps: Array<{
                      type: 'WALK' | 'TRANSIT';
                      duration: number;
                      step?: RouteStep;
                    }> = [];

                    let i = 0;
                    while (i < steps.length) {
                      const step = steps[i];
                      
                      if (step.travelMode === 'WALK') {
                        // Collect all consecutive walk steps
                        let totalDuration = step.staticDuration ? durationToMinutes(step.staticDuration) : 0;
                        
                        let j = i + 1;
                        while (j < steps.length && steps[j].travelMode === 'WALK') {
                          totalDuration += steps[j].staticDuration ? durationToMinutes(steps[j].staticDuration) : 0;
                          j++;
                        }
                        
                        combinedSteps.push({
                          type: 'WALK',
                          duration: totalDuration,
                        });
                        
                        i = j; // Skip all the walk steps we just combined
                      } else {
                        combinedSteps.push({
                          type: 'TRANSIT',
                          duration: step.staticDuration ? durationToMinutes(step.staticDuration) : 0,
                          step,
                        });
                        i++;
                      }
                    }

                    return combinedSteps.map((combinedStep, stepIndex) => {
                      if (combinedStep.type === 'WALK') {
                        return (
                          <React.Fragment key={`step-${stepIndex}`}>
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
                                  Walk {combinedStep.duration} min{combinedStep.duration !== 1 ? 's' : ''}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 14, color: '#09090B' }} />
                            </View>

                            {stepIndex < combinedSteps.length - 1 && (
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
                            )}
                          </React.Fragment>
                        );
                      }

                      // Transit step
                      const step = combinedStep.step!;
                      const lineName = step.transitDetails?.transitLine?.name || 'Bus';
                      const boardingStop = step.transitDetails?.stopDetails?.departureStop?.name || 'Unknown';
                      const alightingStop = step.transitDetails?.stopDetails?.arrivalStop?.name || currentDestination;
                      const numStops = step.transitDetails?.stopCount || 3;
                      const isExpanded = expandedSteps[stepIndex] || false;
                      const toggleExpanded = () => {
                        setExpandedSteps(prev => ({
                          ...prev,
                          [stepIndex]: !prev[stepIndex]
                        }));
                      };

                      // Get the color from Google Maps API (already includes #)
                      // If not provided, fall back to our helper function
                      const apiColor = step.transitDetails?.transitLine?.color;
                      const lineColor = apiColor && apiColor.startsWith('#') 
                        ? apiColor 
                        : apiColor 
                          ? `#${apiColor}` 
                          : getTransitLineColor(lineName);

                      return (
                        <React.Fragment key={`step-${stepIndex}`}>
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
                                alignItems: 'flex-start',
                                gap: 16,
                                flex: 1,
                              }}
                            >
                              <BusIndicator expanded={isExpanded} color={lineColor} />

                              <View
                                style={{
                                  flexDirection: 'column',
                                  alignItems: 'flex-start',
                                  gap: 24,
                                  flex: 1,
                                }}
                              >
                                {/* Start Bus Stop */}
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
                                    {boardingStop}
                                  </Text>

                                  {/* Bus Route Badge with Timing */}
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      height: 37,
                                      borderRadius: 5,
                                    }}
                                  >
                                    {/* Bus Number Badge */}
                                    <View
                                      style={{
                                        minWidth: 38,
                                        height: 37,
                                        backgroundColor: lineColor,
                                        borderTopLeftRadius: 5,
                                        borderBottomLeftRadius: 5,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        paddingHorizontal: 8,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 2,
                                        elevation: 1,
                                      }}
                                    >
                                      <Text
                                        numberOfLines={1}
                                        style={{
                                          fontSize: 14,
                                          fontWeight: '600',
                                          color: '#FFFFFF',
                                          fontFamily: 'Inter',
                                        }}
                                      >
                                        {lineName}
                                      </Text>
                                    </View>

                                    {/* Timing Info */}
                                    <View
                                      style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        flex: 1,
                                        height: 37,
                                        borderTopWidth: 1,
                                        borderRightWidth: 1,
                                        borderBottomWidth: 1,
                                        borderColor: '#E5E5E5',
                                        borderTopRightRadius: 5,
                                        borderBottomRightRadius: 5,
                                        backgroundColor: '#FFFFFF',
                                        overflow: 'hidden',
                                        marginLeft: -1,
                                      }}
                                    >
                                      <View
                                        style={{
                                          flexDirection: 'row',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          paddingHorizontal: 10,
                                          paddingVertical: 7,
                                          flex: 1,
                                          backgroundColor: '#FFFFFF',
                                          gap: 8,
                                        }}
                                      >
                                        <Text
                                          style={{
                                            fontSize: 14,
                                            fontWeight: '500',
                                            color: '#211F26',
                                            fontFamily: 'Inter',
                                          }}
                                        >
                                          1 Min
                                        </Text>
                                        <CapacityIcons opacity={1} />
                                      </View>
                                    </View>
                                  </View>

                                  {/* Expandable Ride Info */}
                                  <Pressable
                                    onPress={toggleExpanded}
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      gap: 4,
                                    }}
                                  >
                                    <View
                                      style={{
                                        transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
                                      }}
                                    >
                                      <ChevronDown />
                                    </View>
                                    <Text
                                      style={{
                                        fontSize: 12,
                                        fontWeight: '500',
                                        color: '#211F26',
                                        fontFamily: 'Inter',
                                      }}
                                    >
                                      Ride {numStops} stop{numStops !== 1 ? 's' : ''} ({combinedStep.duration} mins)
                                    </Text>
                                  </Pressable>

                                  {/* Expanded Stops List - Using LTA API */}
                                  <IntermediateStops 
                                    step={step} 
                                    serviceNo={lineName} 
                                    isExpanded={isExpanded} 
                                  />
                                </View>

                                {/* End Bus Stop */}
                                <View
                                  style={{
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
                                    {alightingStop}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>

                          {stepIndex < combinedSteps.length - 1 && (
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
                          )}
                        </React.Fragment>
                      );
                    });
                  })()}
                </>
              )}

              {/* Final Destination */}
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
                    <Text style={{ fontSize: 14, color: '#09090B' }}>
                      {routes[0].legs?.[0]?.steps?.[routes[0].legs[0].steps.length - 1]?.transitDetails?.stopDetails?.arrivalTime
                        ? formatTime(routes[0].legs[0].steps[routes[0].legs[0].steps.length - 1].transitDetails?.stopDetails?.arrivalTime!)
                        : ''}
                    </Text>
                  </View>
                </>
              ) : (
                // Fallback for no data
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
                      {originName}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, color: '#09090B' }}>9:44AM</Text>
                </View>
              )}
            </View>

            {/* Internal Shuttle Routes Section - Shows AS alternative if Google Maps is shown */}
            {!isLoadingRoutes && !isLoadingInternalRoutes && !routeError && routes.length > 0 && internalRoutes.length > 0 && !recommendInternal && (
              <InternalRoutesSection
                routes={internalRoutes}
                bestRoute={bestInternalRoute}
                recommendInternal={recommendInternal}
                googleMapsTimeSeconds={googleMapsTime}
                isLoading={isLoadingInternalRoutes}
                onSelectRoute={(route) => {
                  setSelectedInternalRoute(route);
                  // Optionally show the selected route on the map or expand details
                }}
              />
            )}

            {/* Divider */}
            <View
              style={{
                alignSelf: 'stretch',
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

            {/* Action Buttons Row */}
            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                alignSelf: 'stretch',
              }}
            >
              {/* Start Navigation Button */}
              <Pressable
                onPress={() => {
                  // Navigate to the new turn-by-turn navigation page
                  router.push({
                    pathname: '/turn-by-turn-navigation',
                    params: {
                      destination: currentDestination,
                      destinationLat: destinationCoords?.lat,
                      destinationLng: destinationCoords?.lng,
                      userLat,
                      userLng,
                    },
                  });
                }}
                style={{
                  flex: 1,
                  height: 36,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 4,
                  borderRadius: 8,
                  backgroundColor: '#274F9C',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  elevation: 1,
                  flexDirection: 'row',
                }}
              >
                <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                  <NavigationArrowWhite />
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: '#FFFFFF',
                  }}
                >
                  Start Navigation
                </Text>
              </Pressable>

              {/* Save as Favorite Button */}
              <Pressable
                onPress={handleSaveFavorite}
                style={{
                  flex: 1,
                  height: 36,
                  paddingVertical: 8,
                  paddingLeft: 16,
                  paddingRight: 13,
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 4,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: favorited ? '#6B7280' : '#E5E5E5',
                  backgroundColor: favorited ? '#6B7280' : '#FFFFFF',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                  elevation: 1,
                  flexDirection: 'row',
                }}
              >
                <BookmarkIcon fill={favorited ? '#FFFFFF' : '#000000'} />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: favorited ? '#FFFFFF' : '#211F26',
                  }}
                >
                  {favorited ? 'Unsave' : 'Save'}
                </Text>
              </Pressable>
            </View>
            </Animated.View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}
