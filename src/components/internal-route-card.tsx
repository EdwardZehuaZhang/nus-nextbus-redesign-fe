import React from 'react';
import { View, Text, Pressable } from '@/components/ui';
import { formatDuration, type InternalBusRoute } from '@/lib/route-finding';
import Svg, { Path, Circle } from 'react-native-svg';

// Bus Icon
const BusIcon = ({ color = '#274F9C' }: { color?: string }) => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M3.75 5.625C3.75 4.79657 4.42157 4.125 5.25 4.125H14.75C15.5784 4.125 16.25 4.79657 16.25 5.625V14.375C16.25 15.2034 15.5784 15.875 14.75 15.875H5.25C4.42157 15.875 3.75 15.2034 3.75 14.375V5.625Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3.75 8.125H16.25"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <Circle cx="7" cy="12.5" r="0.75" fill={color} />
    <Circle cx="13" cy="12.5" r="0.75" fill={color} />
    <Path
      d="M6.25 15.875V17.5M13.75 15.875V17.5"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </Svg>
);

// Walking Icon
const WalkingIcon = ({ color = '#737373' }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M8 2.5C8.41421 2.5 8.75 2.16421 8.75 1.75C8.75 1.33579 8.41421 1 8 1C7.58579 1 7.25 1.33579 7.25 1.75C7.25 2.16421 7.58579 2.5 8 2.5Z"
      fill={color}
      stroke={color}
      strokeWidth="0.5"
    />
    <Path
      d="M9.5 5L8.5 4L7 6.5L6 7L4.5 11L5.5 11.5L6.5 8.5L7.5 8L8 10.5L7 14.5H8L9 10L10 8.5L11.5 9.5L12 8.5L9.5 7V5Z"
      fill={color}
    />
  </Svg>
);

// Clock Icon
const ClockIcon = ({ color = '#737373' }: { color?: string }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle
      cx="8"
      cy="8"
      r="6"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    <Path
      d="M8 4V8L10.5 10.5"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface InternalRouteCardProps {
  route: InternalBusRoute;
  isRecommended?: boolean;
  onSelect?: () => void;
}

export function InternalRouteCard({ 
  route, 
  isRecommended = false,
  onSelect 
}: InternalRouteCardProps) {
  const walkToStopMinutes = Math.ceil(route.walkToStopTime / 60);
  const waitingMinutes = Math.ceil(route.waitingTime / 60);
  const busMinutes = Math.ceil(route.busTravelTime / 60);
  const walkFromStopMinutes = Math.ceil(route.walkFromStopTime / 60);

  return (
    <Pressable
      onPress={onSelect}
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        padding: 16,
        marginBottom: 12,
        borderWidth: isRecommended ? 2 : 1,
        borderColor: isRecommended ? '#274F9C' : '#E4E7E7',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {/* Recommended Badge */}
      {isRecommended && (
        <View
          style={{
            backgroundColor: '#274F9C',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: '6px',
            alignSelf: 'flex-start',
            marginBottom: 12,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600', fontFamily: 'Inter' }}>
            ‚ö?Fastest with Internal Bus
          </Text>
        </View>
      )}

      {/* Route Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              backgroundColor: '#274F9C',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: '8px',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'Inter' }}>
              {route.routeCode}
            </Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#09090B', fontFamily: 'Inter' }}>
            Internal Shuttle
          </Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#274F9C', fontFamily: 'Inter' }}>
          {formatDuration(route.totalTime)}
        </Text>
      </View>

      {/* Route Steps */}
      <View style={{ gap: 8 }}>
        {/* Step 1: Walk to stop */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <WalkingIcon />
          <Text style={{ fontSize: 14, color: '#737373', flex: 1, fontFamily: 'Inter', fontWeight: '500' }}>
            Walk {walkToStopMinutes} min to {route.departureStop.code}
          </Text>
        </View>

        {/* Step 2: Wait for bus */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ClockIcon />
          <Text style={{ fontSize: 14, color: '#737373', flex: 1, fontFamily: 'Inter', fontWeight: '500' }}>
            Wait {waitingMinutes} min for bus
          </Text>
        </View>

        {/* Step 3: Bus ride */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <BusIcon />
          <Text style={{ fontSize: 14, color: '#274F9C', flex: 1, fontWeight: '500', fontFamily: 'Inter' }}>
            {route.routeCode} bus ‚Ä?{busMinutes} min to {route.arrivalStop.code}
          </Text>
        </View>

        {/* Step 4: Walk from stop */}
        {walkFromStopMinutes > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <WalkingIcon />
            <Text style={{ fontSize: 14, color: '#737373', flex: 1, fontFamily: 'Inter', fontWeight: '500' }}>
              Walk {walkFromStopMinutes} min to destination
            </Text>
          </View>
        )}
      </View>

      {/* Warning if can't catch bus */}
      {!route.canCatchBus && (
        <View
          style={{
            marginTop: 12,
            backgroundColor: '#FEF3C7',
            padding: 8,
            borderRadius: '6px',
          }}
        >
          <Text style={{ fontSize: 12, color: '#92400E', fontFamily: 'Inter', fontWeight: '500' }}>
            ‚ö†Ô∏è You may not reach the bus stop in time for this bus
          </Text>
        </View>
      )}
    </Pressable>
  );
}

interface InternalRoutesSectionProps {
  routes: InternalBusRoute[];
  bestRoute: InternalBusRoute | null;
  recommendInternal: boolean;
  googleMapsTimeSeconds: number | null;
  isLoading: boolean;
  onSelectRoute?: (route: InternalBusRoute) => void;
}

export function InternalRoutesSection({
  routes,
  bestRoute,
  recommendInternal,
  googleMapsTimeSeconds,
  isLoading,
  onSelectRoute,
}: InternalRoutesSectionProps) {
  if (isLoading) {
    return (
      <View style={{ padding: 16, backgroundColor: '#F9FAFB', borderRadius: 12 }}>
        <Text style={{ fontSize: 14, color: '#737373', textAlign: 'center', fontFamily: 'Inter', fontWeight: '500' }}>
          Finding internal bus routes...
        </Text>
      </View>
    );
  }

  if (routes.length === 0) {
    return null;
  }

  return (
    <View style={{ marginTop: 16 }}>
      {/* Section Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#09090B', fontFamily: 'Inter' }}>
          üöå Internal Shuttle Routes
        </Text>
        {googleMapsTimeSeconds && (
          <Text style={{ fontSize: 12, color: '#737373', fontFamily: 'Inter', fontWeight: '500' }}>
            Google: {formatDuration(googleMapsTimeSeconds)}
          </Text>
        )}
      </View>

      {/* Comparison Message */}
      {recommendInternal && googleMapsTimeSeconds && (
        <View
          style={{
            backgroundColor: '#DCFCE7',
            padding: 12,
            borderRadius: '8px',
            marginBottom: 12,
            borderLeftWidth: 4,
            borderLeftColor: '#16A34A',
          }}
        >
          <Text style={{ fontSize: 14, color: '#166534', fontWeight: '500', fontFamily: 'Inter' }}>
            ‚ú?Taking the internal shuttle is faster than external transport!
          </Text>
        </View>
      )}

      {/* Route Cards */}
      {routes.map((route, index) => (
        <InternalRouteCard
          key={`${route.routeCode}-${route.departureStop.code}-${index}`}
          route={route}
          isRecommended={recommendInternal && route === bestRoute}
          onSelect={() => onSelectRoute?.(route)}
        />
      ))}
    </View>
  );
}
