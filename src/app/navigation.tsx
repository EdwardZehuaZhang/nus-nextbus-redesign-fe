import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Switch } from 'react-native';
import Svg, { Path, Circle, G, ClipPath, Rect, Defs } from 'react-native-svg';

import {
  FocusAwareStatusBar,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from '@/components/ui';

// Status Bar Icons
const CellularIcon = () => (
  <Svg width={19} height={12} viewBox="0 0 20 13" fill="none">
    <Path
      d="M2.41296 7.90222C3.04622 7.90222 3.56038 8.41546 3.56042 9.04871V11.3417C3.56042 11.975 3.04625 12.4891 2.41296 12.4891H1.26648C0.633276 12.489 0.119995 11.9749 0.119995 11.3417V9.04871C0.120043 8.41552 0.633306 7.90232 1.26648 7.90222H2.41296ZM7.76453 5.60925C8.39775 5.60933 8.91101 6.1225 8.91101 6.75574V11.3417C8.91101 11.9749 8.39775 12.4891 7.76453 12.4891H6.61804C5.98476 12.4891 5.47058 11.975 5.47058 11.3417V6.75574C5.47058 6.12245 5.98476 5.60925 6.61804 5.60925H7.76453ZM13.1151 2.93347C13.7484 2.93347 14.2625 3.44669 14.2626 4.07996V11.3427C14.2623 11.9757 13.7483 12.4891 13.1151 12.4891H11.9686C11.3356 12.489 10.8224 11.9756 10.8221 11.3427V4.07996C10.8222 3.44679 11.3355 2.93363 11.9686 2.93347H13.1151ZM18.4667 0.25769C19.0999 0.257699 19.613 0.770996 19.6132 1.40417V11.3427C19.6129 11.9757 19.0998 12.4891 18.4667 12.4891H17.3202C16.6871 12.4891 16.174 11.9757 16.1737 11.3427V1.40417C16.1738 0.770991 16.687 0.25769 17.3202 0.25769H18.4667Z"
      fill="#27272A"
    />
  </Svg>
);

const WifiIcon = () => (
  <Svg width={18} height={13} viewBox="0 0 18 14" fill="none">
    <Path
      d="M6.59473 10.535C8.06312 9.29429 10.2132 9.29433 11.6816 10.535C11.7555 10.6018 11.7987 10.6963 11.8008 10.7958C11.8028 10.8952 11.7634 10.9908 11.6924 11.0604L9.39355 13.3798C9.32627 13.4477 9.23432 13.4861 9.13867 13.4862C9.04284 13.4862 8.95021 13.4478 8.88281 13.3798L6.58301 11.0604C6.5122 10.9907 6.47356 10.8951 6.47559 10.7958C6.47769 10.6963 6.52079 10.6017 6.59473 10.535ZM3.52637 7.44226C6.6902 4.50179 11.5891 4.50179 14.7529 7.44226C14.8244 7.51121 14.8652 7.60573 14.8662 7.70496C14.8672 7.80403 14.8286 7.89927 14.7588 7.9696L13.4297 9.31238C13.2927 9.44934 13.0712 9.45162 12.9307 9.31824C11.8918 8.37831 10.5402 7.85828 9.13867 7.85828C7.73798 7.85886 6.3869 8.37885 5.34863 9.31824C5.20814 9.45162 4.9866 9.44933 4.84961 9.31238L3.52148 7.9696C3.45135 7.89933 3.41216 7.8042 3.41309 7.70496C3.41402 7.6057 3.4549 7.51121 3.52637 7.44226ZM0.458008 4.3573C5.31062 -0.288962 12.9659 -0.289159 17.8184 4.3573C17.8886 4.42633 17.9281 4.52059 17.9287 4.61902C17.9293 4.71741 17.8907 4.81188 17.8213 4.88171L16.4902 6.22351C16.3531 6.36122 16.1304 6.363 15.9912 6.22742C14.1425 4.4715 11.6894 3.49228 9.13867 3.49207C6.58748 3.49206 4.13323 4.47118 2.28418 6.22742C2.14504 6.36321 1.92219 6.36143 1.78516 6.22351L0.454102 4.88171C0.384796 4.81184 0.346049 4.71739 0.34668 4.61902C0.347328 4.52058 0.387715 4.42628 0.458008 4.3573Z"
      fill="#27272A"
    />
  </Svg>
);

const BatteryIcon = () => (
  <View className="relative">
    <View
      style={{
        width: 25,
        height: 13,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: '#27272A',
        opacity: 0.35,
      }}
    />
    <Svg
      style={{
        position: 'absolute',
        right: -2,
        top: 4,
        width: 2,
        height: 5,
      }}
      width="2"
      height="5"
      viewBox="0 0 2 5"
      fill="none"
    >
      <Path
        opacity="0.4"
        d="M0.0354004 0.0799561V4.66662C0.958159 4.27816 1.55822 3.37448 1.55822 2.37329C1.55822 1.3721 0.958159 0.46842 0.0354004 0.0799561Z"
        fill="#27272A"
      />
    </Svg>
    <View
      style={{
        position: 'absolute',
        left: 2,
        top: 2,
        width: 21,
        height: 8,
        borderRadius: 1.5,
        backgroundColor: '#27272A',
      }}
    />
  </View>
);

// Navigation Icons
const NavigationArrow = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M19.375 9.4984C19.3731 9.7625 19.2863 10.019 19.1275 10.23C18.9687 10.441 18.7462 10.5954 18.4929 10.6703L18.4773 10.675L12.3836 12.3812L10.6773 18.475L10.6726 18.4906C10.5976 18.7438 10.4432 18.9662 10.2323 19.125C10.0213 19.2838 9.76483 19.3706 9.50076 19.3726H9.47732C9.21837 19.375 8.96524 19.2958 8.75389 19.1462C8.54254 18.9965 8.38372 18.7841 8.29998 18.539L3.20311 4.79762C3.20146 4.79357 3.20015 4.78938 3.1992 4.78512C3.12303 4.56389 3.11048 4.32573 3.16297 4.09772C3.21546 3.86972 3.3309 3.66102 3.49613 3.49538C3.66137 3.32973 3.86978 3.21379 4.09766 3.16073C4.32553 3.10768 4.56373 3.11965 4.78514 3.19527L4.79764 3.19918L18.5414 8.29762C18.7902 8.38268 19.0054 8.54509 19.1553 8.76113C19.3053 8.97717 19.3823 9.23551 19.375 9.4984Z"
      fill="#737373"
    />
  </Svg>
);

const MenuIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M17.5 10C17.5 10.1658 17.4342 10.3247 17.3169 10.4419C17.1997 10.5592 17.0408 10.625 16.875 10.625H3.125C2.95924 10.625 2.80027 10.5592 2.68306 10.4419C2.56585 10.3247 2.5 10.1658 2.5 10C2.5 9.83424 2.56585 9.67527 2.68306 9.55806C2.80027 9.44085 2.95924 9.375 3.125 9.375H16.875C17.0408 9.375 17.1997 9.44085 17.3169 9.55806C17.4342 9.67527 17.5 9.83424 17.5 10ZM3.125 5.625H16.875C17.0408 5.625 17.1997 5.55915 17.3169 5.44194C17.4342 5.32473 17.5 5.16576 17.5 5C17.5 4.83424 17.4342 4.67527 17.3169 4.55806C17.1997 4.44085 17.0408 4.375 16.875 4.375H3.125C2.95924 4.375 2.80027 4.44085 2.68306 4.55806C2.56585 4.67527 2.5 4.83424 2.5 5C2.5 5.16576 2.56585 5.32473 2.68306 5.44194C2.80027 5.55915 2.95924 5.625 3.125 5.625ZM16.875 14.375H3.125C2.95924 14.375 2.80027 14.4408 2.68306 14.5581C2.56585 14.6753 2.5 14.8342 2.5 15C2.5 15.1658 2.56585 15.3247 2.68306 15.4419C2.80027 15.5592 2.95924 15.625 3.125 15.625H16.875C17.0408 15.625 17.1997 15.5592 17.3169 15.4419C17.4342 15.3247 17.5 15.1658 17.5 15C17.5 14.8342 17.4342 14.6753 17.3169 14.5581C17.1997 14.4408 17.0408 14.375 16.875 14.375Z"
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

const VanIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M19.8492 8.34297L16.2914 4.19766C16.1741 4.05749 16.0274 3.94476 15.8618 3.86741C15.6962 3.79007 15.5156 3.74999 15.3328 3.75H2.5C2.16848 3.75 1.85054 3.8817 1.61612 4.11612C1.3817 4.35054 1.25 4.66848 1.25 5V13.75C1.25 14.0815 1.3817 14.3995 1.61612 14.6339C1.85054 14.8683 2.16848 15 2.5 15H3.82812C3.96581 15.5378 4.27856 16.0144 4.71707 16.3548C5.15557 16.6952 5.69489 16.8799 6.25 16.8799C6.80511 16.8799 7.34443 16.6952 7.78293 16.3548C8.22144 16.0144 8.53419 15.5378 8.67188 15H12.5781C12.7158 15.5378 13.0286 16.0144 13.4671 16.3548C13.9056 16.6952 14.4449 16.8799 15 16.8799C15.5551 16.8799 16.0944 16.6952 16.5329 16.3548C16.9714 16.0144 17.2842 15.5378 17.4219 15H18.75C19.0815 15 19.3995 14.8683 19.6339 14.6339C19.8683 14.3995 20 14.0815 20 13.75V8.75C20 8.60067 19.9465 8.45628 19.8492 8.34297ZM2.5 8.125V5H6.875V8.125H2.5ZM6.25 15.625C6.00277 15.625 5.7611 15.5517 5.55554 15.4143C5.34998 15.277 5.18976 15.0818 5.09515 14.8534C5.00054 14.6249 4.97579 14.3736 5.02402 14.1311C5.07225 13.8887 5.1913 13.6659 5.36612 13.4911C5.54093 13.3163 5.76366 13.1972 6.00614 13.149C6.24861 13.1008 6.49995 13.1255 6.72835 13.2201C6.95676 13.3148 7.15199 13.475 7.28934 13.6805C7.42669 13.8861 7.5 14.1278 7.5 14.375C7.5 14.7065 7.3683 15.0245 7.13388 15.2589C6.89946 15.4933 6.58152 15.625 6.25 15.625ZM12.5 8.125H8.125V5H12.5V8.125ZM15 15.625C14.7528 15.625 14.5111 15.5517 14.3055 15.4143C14.1 15.277 13.9398 15.0818 13.8451 14.8534C13.7505 14.6249 13.7258 14.3736 13.774 14.1311C13.8222 13.8887 13.9413 13.6659 14.1161 13.4911C14.2909 13.3163 14.5137 13.1972 14.7561 13.149C14.9986 13.1008 15.2499 13.1255 15.4784 13.2201C15.7068 13.3148 15.902 13.475 16.0393 13.6805C16.1767 13.8861 16.25 14.1278 16.25 14.375C16.25 14.7065 16.1183 15.0245 15.8839 15.2589C15.6495 15.4933 15.3315 15.625 15 15.625ZM13.75 8.125V5H15.3328L18.0148 8.125H13.75Z"
      fill="#274F9C"
    />
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

// Capacity Icons with people
const CapacityIcons = ({ opacity = 1 }: { opacity?: number }) => (
  <Svg width={30} height={23} viewBox="0 0 30 23" fill="none" style={{ opacity }}>
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
  const { destination } = useLocalSearchParams();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [routeExpanded, setRouteExpanded] = useState(false);

  // Get destination from URL parameter or default to "COM3"
  const currentDestination =
    typeof destination === 'string' ? destination : 'COM3';

  return (
    <View className="flex-1" style={{ backgroundColor: '#FAFAFA' }}>
      <FocusAwareStatusBar />

      {/* Status Bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 24,
          paddingTop: 8,
          height: 50,
        }}
      >
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: '#27272A',
            letterSpacing: -0.344,
          }}
        >
          9:41
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <CellularIcon />
          <WifiIcon />
          <BatteryIcon />
        </View>
      </View>

      {/* Map Background */}
      <View className="flex-1">
        <Image
          source={{
            uri: 'https://api.builder.io/api/v1/image/assets/TEMP/6c3b3b210b3413e5845c48ced02b558bbfe555a7?width=864',
          }}
          className="absolute inset-0 h-full w-full"
          style={{ resizeMode: 'cover' }}
        />

        {/* Location Input Card */}
        <View
          style={{
            marginHorizontal: 10,
            marginTop: 0,
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
          {/* Your Location */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <NavigationArrow />
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#211F26' }}>
                Your location
              </Text>
            </View>
            <MenuIcon />
          </View>

          {/* Divider with dots */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, paddingLeft: 9, height: 10, justifyContent: 'center' }}>
            <DotDivider />
            <View style={{ height: 1, flex: 1, backgroundColor: '#E4E7E7' }} />
          </View>

          {/* Destination */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <MapPin />
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#211F26' }}>
                {currentDestination}
              </Text>
            </View>
            <MenuIcon />
          </View>

          {/* Divider with dots */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, paddingLeft: 9, height: 10, justifyContent: 'center' }}>
            <DotDivider />
            <View style={{ height: 1, flex: 1, backgroundColor: '#E4E7E7' }} />
          </View>

          {/* Add Stop */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <PlusCircle />
            <Text style={{ fontSize: 16, fontWeight: '500', color: '#274F9C' }}>
              Add Stop
            </Text>
          </View>
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
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 5,
            height: 744,
          }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Journey Time Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: 24, fontWeight: '500', color: '#211F26' }}>
                28 Mins
              </Text>
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
                <Text style={{ fontSize: 14, color: '#09090B' }}>Arrive 9:15PM</Text>
                <ChevronDown />
              </View>
            </View>

            {/* Journey Steps */}
            <View style={{ marginBottom: 16 }}>
              {/* Step 1: Your location */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <NavigationArrow />
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#211F26' }}>
                    Your location
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: '#09090B' }}>9:44AM</Text>
              </View>

              {/* Connecting line */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, paddingLeft: 9, height: 10, justifyContent: 'center' }}>
                <DotDivider />
                <View style={{ height: 1, flex: 1, backgroundColor: '#E4E7E7' }} />
              </View>

              {/* Step 2: Walk */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <PersonIcon />
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#211F26' }}>
                    Walk 10 min
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: '#09090B' }}>9:44AM</Text>
              </View>

              {/* Connecting line */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, paddingLeft: 9, height: 10, justifyContent: 'center' }}>
                <DotDivider />
                <View style={{ height: 1, flex: 1, backgroundColor: '#E4E7E7' }} />
              </View>

              {/* Step 3: Bus Journey */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
                  {/* Blue line indicator with bus icons */}
                  <View style={{ width: 21, height: 230, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                    <View
                      style={{
                        width: 13,
                        paddingHorizontal: 16,
                        paddingVertical: 4,
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderRadius: 58,
                        backgroundColor: '#274F9C',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 1,
                        alignSelf: 'stretch',
                        flexShrink: 0,
                      }}
                    />
                    <View
                      style={{
                        height: 280,
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        position: 'absolute',
                        right: -6,
                        top: -26,
                      }}
                    >
                      <View
                        style={{
                          padding: 6,
                          borderRadius: 97,
                          borderWidth: 1,
                          borderColor: '#E5E5E5',
                          backgroundColor: '#F5F5F5',
                        }}
                      >
                        <VanIcon />
                      </View>
                      <View
                        style={{
                          padding: 6,
                          borderRadius: 97,
                          borderWidth: 1,
                          borderColor: '#E5E5E5',
                          backgroundColor: '#F5F5F5',
                        }}
                      >
                        <VanIcon />
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 16, flex: 1 }}>
                    {/* Ventus */}
                    <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8, alignSelf: 'stretch' }}>
                      <Text style={{ fontSize: 16, fontWeight: '500', color: '#211F26' }}>
                        Ventus
                      </Text>

                      {/* Bus Routes */}
                      <View style={{ gap: 2 }}>
                        {/* A1 Route */}
                        <View style={{ width: 353, height: 37, alignItems: 'center', gap: -0.881, borderRadius: 5.286, borderWidth: 0, borderColor: '#E5E5E5' }}>
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
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' }}>
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
                                borderRightWidth: 0.881,
                                borderBottomWidth: 0.881,
                                borderColor: '#E5E5E5',
                                backgroundColor: '#FFFFFF',
                                flexDirection: 'row',
                              }}
                            >
                              <Text style={{ fontSize: 14, fontWeight: '500', color: '#211F26', textAlign: 'center' }}>
                                1 Min
                              </Text>
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
                                borderRightWidth: 0.881,
                                borderBottomWidth: 0.881,
                                borderColor: '#E5E5E5',
                                backgroundColor: '#FFFFFF',
                                flexDirection: 'row',
                              }}
                            >
                              <Text style={{ fontSize: 14, fontWeight: '500', color: '#737373', textAlign: 'center' }}>
                                5 Min
                              </Text>
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
                                borderBottomWidth: 0.881,
                                borderColor: '#E5E5E5',
                                backgroundColor: '#FFFFFF',
                                flexDirection: 'row',
                              }}
                            >
                              <Text style={{ fontSize: 14, fontWeight: '500', color: '#737373', textAlign: 'center' }}>
                                10 Min
                              </Text>
                              <CapacityIcons opacity={0.6} />
                            </View>
                          </View>
                        </View>

                        {/* D2 Route */}
                        <View style={{ width: 353, height: 37, alignItems: 'center', gap: -0.881, borderRadius: 5.286, borderWidth: 0, borderColor: '#E5E5E5' }}>
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
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' }}>
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
                                borderRightWidth: 0.881,
                                borderBottomWidth: 0.881,
                                borderColor: '#E5E5E5',
                                backgroundColor: '#FFFFFF',
                                flexDirection: 'row',
                              }}
                            >
                              <Text style={{ fontSize: 14, fontWeight: '500', color: '#211F26', textAlign: 'center' }}>
                                3 Min
                              </Text>
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
                                borderRightWidth: 0.881,
                                borderBottomWidth: 0.881,
                                borderColor: '#E5E5E5',
                                backgroundColor: '#FFFFFF',
                                flexDirection: 'row',
                              }}
                            >
                              <Text style={{ fontSize: 14, fontWeight: '500', color: '#737373', textAlign: 'center' }}>
                                7 Min
                              </Text>
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
                                borderBottomWidth: 0.881,
                                borderColor: '#E5E5E5',
                                backgroundColor: '#FFFFFF',
                                flexDirection: 'row',
                              }}
                            >
                              <Text style={{ fontSize: 14, fontWeight: '500', color: '#737373', textAlign: 'center' }}>
                                12 Min
                              </Text>
                              <CapacityIcons opacity={0.6} />
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Route Details - Expandable */}
                    <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10, alignSelf: 'stretch' }}>
                      <Pressable
                        onPress={() => setRouteExpanded(!routeExpanded)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'stretch' }}
                      >
                        <ChevronExpand expanded={routeExpanded} />
                        <Text style={{ fontSize: 12, fontWeight: '500', color: '#09090B' }}>
                          Ride 5 stops (9 mins)
                        </Text>
                      </Pressable>

                      {routeExpanded && (
                        <>
                          <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10, paddingHorizontal: 24 }}>
                            <Text style={{ fontSize: 12, color: '#09090B' }}>LT13</Text>
                          </View>
                          <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10, paddingHorizontal: 24 }}>
                            <Text style={{ fontSize: 12, color: '#09090B' }}>AS5</Text>
                          </View>
                          <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10, paddingHorizontal: 24 }}>
                            <Text style={{ fontSize: 12, color: '#09090B' }}>Opp NUSS</Text>
                          </View>
                        </>
                      )}
                    </View>

                    {/* Final Stop */}
                    <View style={{ height: 36, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 16, fontWeight: '500', color: '#211F26' }}>
                        {currentDestination}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Connecting line */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, paddingLeft: 9, height: 10, justifyContent: 'center' }}>
                <DotDivider />
                <View style={{ height: 1, flex: 1, backgroundColor: '#E4E7E7' }} />
              </View>

              {/* Step 4: Final Walk */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <PersonIcon />
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#211F26' }}>
                    Walk 10 min
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: '#09090B' }}>9:44AM</Text>
              </View>

              {/* Connecting line */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, paddingLeft: 9, height: 10, justifyContent: 'center' }}>
                <DotDivider />
                <View style={{ height: 1, flex: 1, backgroundColor: '#E4E7E7' }} />
              </View>

              {/* Step 5: Destination */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <MapPin />
                  <Text style={{ fontSize: 16, fontWeight: '500', color: '#211F26' }}>
                    {currentDestination}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: '#09090B' }}>9:50AM</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={{ width: 390, height: 1, backgroundColor: '#E4E7E7', marginBottom: 16 }} />

            {/* Reminder Toggle */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', alignSelf: 'stretch', marginBottom: 16 }}>
              <Text style={{ fontSize: 14, color: '#09090B' }}>
                Remind you to leave on time
              </Text>
              <Svg width={44} height={35} viewBox="0 0 44 35" fill="none">
                <Rect x="8" y="0.00561523" width="36" height="19.9944" rx="9.99719" fill="#D9D9D9" />
                <G filter="url(#filter0_dd_530_1562)">
                  <Circle cx="17.9972" cy="10.0027" r="8.51613" fill="white" />
                </G>
                <Defs>
                  <filter
                    id="filter0_dd_530_1562"
                    x="0.594686"
                    y="0.00550699"
                    width="34.805"
                    height="34.805"
                    filterUnits="userSpaceOnUse"
                    colorInterpolationFilters="sRGB"
                  >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix
                      in="SourceAlpha"
                      type="matrix"
                      values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                      result="hardAlpha"
                    />
                    <feMorphology radius="2.96213" operator="erode" in="SourceAlpha" result="effect1_dropShadow_530_1562" />
                    <feOffset dy="2.96213" />
                    <feGaussianBlur stdDeviation="2.2216" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_530_1562" />
                    <feColorMatrix
                      in="SourceAlpha"
                      type="matrix"
                      values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                      result="hardAlpha"
                    />
                    <feMorphology radius="2.2216" operator="erode" in="SourceAlpha" result="effect2_dropShadow_530_1562" />
                    <feOffset dy="7.40533" />
                    <feGaussianBlur stdDeviation="5.554" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0" />
                    <feBlend mode="normal" in2="effect1_dropShadow_530_1562" result="effect2_dropShadow_530_1562" />
                    <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_530_1562" result="shape" />
                  </filter>
                </Defs>
              </Svg>
            </View>

            {/* Save as Favorite Button */}
            <Pressable
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
                borderColor: '#E5E5E5',
                backgroundColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 1,
                flexDirection: 'row',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#211F26' }}>
                Save as favorite
              </Text>
              <BookmarkIcon />
            </Pressable>
          </ScrollView>
        </View>
      </View>

      {/* Home Indicator */}
      <View
        style={{
          position: 'absolute',
          bottom: 34,
          left: 138,
          width: 154,
          height: 6,
          borderRadius: 114.667,
          opacity: 0.4,
          backgroundColor: '#E4E4E7',
        }}
      />
    </View>
  );
}
