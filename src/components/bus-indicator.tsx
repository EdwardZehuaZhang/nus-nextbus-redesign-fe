import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const BusIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <Path
      d="M19.8492 8.34297L16.2914 4.19766C16.1741 4.05749 16.0274 3.94476 15.8618 3.86741C15.6962 3.79007 15.5156 3.74999 15.3328 3.75H2.5C2.16848 3.75 1.85054 3.8817 1.61612 4.11612C1.3817 4.35054 1.25 4.66848 1.25 5V13.75C1.25 14.0815 1.3817 14.3995 1.61612 14.6339C1.85054 14.8683 2.16848 15 2.5 15H3.82812C3.96581 15.5378 4.27856 16.0144 4.71707 16.3548C5.15557 16.6952 5.69489 16.8799 6.25 16.8799C6.80511 16.8799 7.34443 16.6952 7.78293 16.3548C8.22144 16.0144 8.53419 15.5378 8.67188 15H12.5781C12.7158 15.5378 13.0286 16.0144 13.4671 16.3548C13.9056 16.6952 14.4449 16.8799 15 16.8799C15.5551 16.8799 16.0944 16.6952 16.5329 16.3548C16.9714 16.0144 17.2842 15.5378 17.4219 15H18.75C19.0815 15 19.3995 14.8683 19.6339 14.6339C19.8683 14.3995 20 14.0815 20 13.75V8.75C20 8.60067 19.9465 8.45628 19.8492 8.34297ZM2.5 8.125V5H6.875V8.125H2.5ZM6.25 15.625C6.00277 15.625 5.7611 15.5517 5.55554 15.4143C5.34998 15.277 5.18976 15.0818 5.09515 14.8534C5.00054 14.6249 4.97579 14.3736 5.02402 14.1311C5.07225 13.8887 5.1913 13.6659 5.36612 13.4911C5.54093 13.3163 5.76366 13.1972 6.00614 13.149C6.24861 13.1008 6.49995 13.1255 6.72835 13.2201C6.95676 13.3148 7.15199 13.475 7.28934 13.6805C7.42669 13.8861 7.5 14.1278 7.5 14.375C7.5 14.7065 7.3683 15.0245 7.13388 15.2589C6.89946 15.4933 6.58152 15.625 6.25 15.625ZM12.5 8.125H8.125V5H12.5V8.125ZM15 15.625C14.7528 15.625 14.5111 15.5517 14.3055 15.4143C14.1 15.277 13.9398 15.0818 13.8451 14.8534C13.7505 14.6249 13.7258 14.3736 13.774 14.1311C13.8222 13.8887 13.9413 13.6659 14.1161 13.4911C14.2909 13.3163 14.5137 13.1972 14.7561 13.149C14.9986 13.1008 15.2499 13.1255 15.4784 13.2201C15.7068 13.3148 15.902 13.475 16.0393 13.6805C16.1767 13.8861 16.25 14.1278 16.25 14.375C16.25 14.7065 16.1183 15.0245 15.8839 15.2589C15.6495 15.4933 15.3315 15.625 15 15.625ZM13.75 8.125V5H15.3328L18.0148 8.125H13.75Z"
      fill="#274F9C"
    />
  </Svg>
);

export const BusIndicator = () => {
  return (
    <View
      style={{
        flexDirection: 'column',
        width: 21,
        height: 212,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Top Bus Icon with negative margin */}
      <View
        style={{
          marginTop: -2.5,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 6,
          marginLeft: -5.5,
          marginRight: -5.5,
          backgroundColor: '#F5F5F5',
          borderRadius: 97,
          borderWidth: 1,
          borderColor: '#E5E5E5',
        }}
      >
        <View style={{ width: 20, height: 20, aspectRatio: 1 }}>
          <BusIcon />
        </View>
      </View>

      {/* Blue vertical line */}
      <View
        style={{
          width: 13,
          height: 153,
          backgroundColor: '#274F9C',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 1,
        }}
      />

      {/* Bottom Bus Icon with negative margin */}
      <View
        style={{
          marginBottom: -2.5,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 6,
          marginLeft: -5.5,
          marginRight: -5.5,
          backgroundColor: '#F5F5F5',
          borderRadius: 97,
          borderWidth: 1,
          borderColor: '#E5E5E5',
        }}
      >
        <View style={{ width: 20, height: 20, aspectRatio: 1 }}>
          <BusIcon />
        </View>
      </View>
    </View>
  );
};
