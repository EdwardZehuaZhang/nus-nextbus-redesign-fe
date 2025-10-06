import React, { useRef } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import {
  Animated,
  PanResponder,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { XIcon } from '@/components/ui/icons/x-icon';

import { CircleIcon } from './circle-icon';
import { DragIcon } from './drag-icon';

const NavigationArrow = () => (
  <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <path
      d="M10 1.875C8.39303 1.875 6.82214 2.35152 5.486 3.24431C4.14985 4.1371 3.10844 5.40605 2.49348 6.8907C1.87852 8.37535 1.71762 10.009 2.03112 11.5851C2.34463 13.1612 3.11846 14.6089 4.25476 15.7452C5.39106 16.8815 6.8388 17.6554 8.4149 17.9689C9.99099 18.2824 11.6247 18.1215 13.1093 17.5065C14.594 16.8916 15.8629 15.8502 16.7557 14.514C17.6485 13.1779 18.125 11.607 18.125 10C18.1227 7.84581 17.266 5.78051 15.7427 4.25727C14.2195 2.73403 12.1542 1.87727 10 1.875ZM10 16.875C8.64026 16.875 7.31105 16.4718 6.18046 15.7164C5.04987 14.9609 4.16868 13.8872 3.64833 12.6309C3.12798 11.3747 2.99183 9.99237 3.2571 8.65875C3.52238 7.32513 4.17716 6.10013 5.13864 5.13864C6.10013 4.17716 7.32514 3.52237 8.65876 3.2571C9.99238 2.99183 11.3747 3.12798 12.631 3.64833C13.8872 4.16868 14.9609 5.04987 15.7164 6.18045C16.4718 7.31104 16.875 8.64025 16.875 10C16.8729 11.8227 16.1479 13.5702 14.8591 14.8591C13.5702 16.1479 11.8227 16.8729 10 16.875Z"
      fill="#211F26"
    />
    <path
      d="M13.125 10C13.125 10.0748 13.1103 10.1489 13.0817 10.2181C13.0531 10.2872 13.0113 10.3501 12.9587 10.4033L9.70872 13.6533C9.65552 13.7065 9.5925 13.7489 9.52318 13.778C9.45387 13.807 9.37959 13.8221 9.30454 13.8224C9.22948 13.8227 9.15508 13.8082 9.08551 13.7797C9.01594 13.7512 8.9525 13.7094 8.8989 13.6566C8.84529 13.6038 8.80257 13.541 8.77325 13.4719C8.74393 13.4028 8.72861 13.3286 8.72814 13.2536C8.72768 13.1785 8.74209 13.1042 8.77054 13.0348C8.79898 12.9653 8.84091 12.902 8.89391 12.8486L11.3679 10.3747H7.5C7.3342 10.3747 7.17527 10.3088 7.05806 10.1916C6.94085 10.0744 6.875 9.91544 6.875 9.74964C6.875 9.58384 6.94085 9.42491 7.05806 9.3077C7.17527 9.19049 7.3342 9.12464 7.5 9.12464H11.3679L8.89375 6.65011C8.83896 6.59695 8.79524 6.53335 8.76517 6.46295C8.7351 6.39255 8.71928 6.31672 8.71862 6.24004C8.71795 6.16336 8.73245 6.08728 8.7614 6.01641C8.79035 5.94554 8.83312 5.88126 8.88707 5.82731C8.94102 5.77336 9.0053 5.73059 9.07617 5.70164C9.14704 5.67269 9.22312 5.65819 9.2998 5.65885C9.37648 5.65952 9.45231 5.67534 9.52271 5.70541C9.59311 5.73548 9.65671 5.7792 9.70987 5.83399L12.9599 9.08399C13.0125 9.13717 13.0543 9.20005 13.0829 9.26922C13.1115 9.33838 13.1263 9.41241 13.1263 9.48717C13.1263 9.56193 13.1115 9.63596 13.0829 9.70512C13.0543 9.77429 13.0125 9.83717 12.9599 9.89036L13.125 10Z"
      fill="#211F26"
    />
  </svg>
);

const MapPin = () => (
  <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <path
      d="M10 1.25C7.67944 1.25276 5.45493 2.17464 3.81282 3.81675C2.17071 5.45886 1.24883 7.68337 1.24607 10.0039C1.24332 11.8408 1.86325 13.6224 3.00076 15.0625L9.15451 17.9297C9.42326 18.0664 9.73982 18.0664 10.0086 17.9297L16.1672 15.0625C17.3064 13.6216 17.9271 11.8386 17.9243 10.0008C17.9215 7.68022 17.0001 5.45549 15.3582 3.81307C13.7164 2.17064 11.4918 1.24833 9.17123 1.24506L10 1.25ZM10 12.5C9.25842 12.5 8.5333 12.2801 7.91663 11.868C7.29995 11.4559 6.81928 10.8703 6.53545 10.1851C6.25162 9.49984 6.17736 8.74584 6.32206 8.01841C6.46675 7.29098 6.8239 6.6228 7.34835 6.09835C7.8728 5.5739 8.54098 5.21675 9.26841 5.07206C9.99584 4.92736 10.7498 5.00162 11.4351 5.28545C12.1203 5.56928 12.7059 6.04996 13.118 6.66664C13.5301 7.28331 13.75 8.00832 13.75 8.75C13.7489 9.74402 13.3534 10.6972 12.6504 11.4004C11.9472 12.1035 10.994 12.4989 10 12.5Z"
      fill="#211F26"
    />
  </svg>
);

interface DraggableLocationProps {
  id: string;
  text: string;
  type: 'origin' | 'stop' | 'destination';
  isEditable: boolean;
  showControls: boolean;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDragMove?: (id: string, y: number) => void;
  onDragEnd?: (id: string) => void;
}

export const DraggableLocation: React.FC<DraggableLocationProps> = ({
  id,
  text,
  type,
  isEditable,
  showControls,
  onUpdate,
  onRemove,
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  const isOrigin = type === 'origin';
  const isDestination = type === 'destination';
  const isStop = type === 'stop';

  const pan = useRef(new Animated.ValueXY()).current;
  const inputRef = useRef<RNTextInput>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isStop && showControls,
      onPanResponderGrant: () => {
        onDragStart?.(id);
      },
      onPanResponderMove: (_, gesture) => {
        pan.setValue({ x: 0, y: gesture.dy });
        onDragMove?.(id, gesture.dy);
      },
      onPanResponderRelease: () => {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
        onDragEnd?.(id);
      },
    })
  ).current;

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
    <Animated.View
      style={{
        transform: [{ translateY: pan.y }],
      }}
      {...(isStop && showControls ? panResponder.panHandlers : {})}
    >
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
          {isEditable ? (
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={(newText: string) => onUpdate(id, newText)}
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
              {text}
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
            {/* X button - show for all locations except destination */}
            {!isDestination && (
              <Pressable onPress={() => onRemove(id)}>
                <XIcon width={20} height={20} fill="#737373" />
              </Pressable>
            )}

            {/* Drag icon - show only for middle stops */}
            {isStop && (
              <View>
                <DragIcon />
              </View>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
};
