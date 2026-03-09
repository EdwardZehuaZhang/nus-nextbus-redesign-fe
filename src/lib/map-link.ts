import { Alert, Linking, Platform } from 'react-native';

/**
 * Opens a bus stop location in Google Maps.
 * Properly encodes the stop name to avoid URL parsing failures on iOS.
 * Falls back gracefully if the Maps app or web URL cannot be opened.
 */
export async function openBusStopInMaps(
  lat: number,
  lng: number,
  stopName: string
): Promise<void> {
  const encodedQuery = encodeURIComponent(`${lat},${lng}(${stopName})`);
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  // On iOS try the native Google Maps deep link first
  if (Platform.OS === 'ios') {
    const nativeUrl = `comgooglemaps://?q=${encodedQuery}&center=${lat},${lng}`;
    try {
      const canOpen = await Linking.canOpenURL(nativeUrl);
      if (canOpen) {
        await Linking.openURL(nativeUrl);
        return;
      }
    } catch {
      // Google Maps not installed — fall through to web URL
    }
  }

  // Web fallback (works on all platforms)
  try {
    await Linking.openURL(webUrl);
  } catch {
    // If the full URL fails, try plain coordinates without the label
    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    try {
      await Linking.openURL(fallbackUrl);
    } catch {
      Alert.alert(
        'Unable to Open Maps',
        'The Maps link could not be opened. Please try again later.'
      );
    }
  }
}
