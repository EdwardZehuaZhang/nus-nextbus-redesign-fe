# iOS Navigation Page Crash — Impossible Route Search

**Date Started**: February 25, 2026  
**Last Updated**: February 25, 2026  
**Status**: ✅ **ROOT CAUSE IDENTIFIED** — Out of Memory (OOM) crash when searching impossible routes  
**Platform**: iOS (adhoc/production IPA, Release config)  
**App**: NUS Maps (nus-nextbus-redesign-fe)

---

## ✅ ROOT CAUSE DISCOVERED

**Console.app output revealed:**
```
Process NUSMaps [21760] killed by jetsam reason per-process-limit
```

This is an **Out of Memory (OOM) crash**. iOS's jetsam memory manager killed the app because it exceeded its per-process memory limit.

**Why this happens:**
- When searching "San Francisco → UTown", the app processes a route spanning **~15,000 km** across the Pacific Ocean
- Either:
  1. Google Routes API returns massive polyline/response data that gets held in memory
  2. The map rendering (`react-native-maps`) tries to allocate huge tile buffers for a polyline spanning half the globe
  3. Multiple concurrent API calls (internal route finding, Google Routes, etc.) each hold large response objects
  4. Hermes garbage collection doesn't run fast enough in the tight loop

**Why previous fixes didn't work:**
- None of the attempted fixes addressed memory consumption
- Try/catch, distance checks, cancelled flags — all irrelevant to memory pressure
- Sentry cannot capture OOM kills (iOS sends SIGKILL directly, no exception is thrown)

**Why dev mode works but production doesn't:**
- Dev builds (Debug config) have higher memory limits
- Production builds (Release config) have stricter limits

---

## 🔧 ACTUAL SOLUTIONS TO IMPLEMENT

Since this is an OOM crash, we need memory-focused fixes:

### Solution 1: Reject Impossible Routes Before API Call ⭐ **CRITICAL**
**File**: `src/app/(app)/navigation.tsx` — in the `fetchRoutes` function

Calculate straight-line distance between origin and destination. If > 1000 km (or pick reasonable threshold), immediately show "Route too far" error WITHOUT calling the API.

```typescript
import { calculateDistance } from '@/lib/route-finding';

// Inside fetchRoutes, before calling getTransitRoute:
const straightLineDistance = calculateDistance(
  effectiveOrigin,
  { latitude: destCoords.lat, longitude: destCoords.lng }
);

// Reject routes > 1000km (adjustable)
if (straightLineDistance > 1_000_000) { // meters
  setRouteError({ 
    code: 'ROUTE_TOO_FAR',
    details: `Route distance (${Math.round(straightLineDistance / 1000)}km) exceeds maximum searchable range.`
  });
  setIsLoadingRoutes(false);
  return;
}
```

Add new error code to UI:
```typescript
// In the error rendering section:
case 'ROUTE_TOO_FAR':
  return (
    <View>
      <Text>Route is too far away</Text>
      <Text>{routeError.details}</Text>
    </View>
  );
```

**Impact**: Prevents API call entirely for impossible routes. Zero memory consumption.

---

### Solution 2: Limit Polyline Point Count in Map Rendering ⭐ **HIGH PRIORITY** ✅ **IMPLEMENTED**
**File**: `src/components/interactive-map.native.tsx` (line ~1579)

Google Maps SDK can OOM when rendering polylines with 10,000+ points. Downsample large polylines:

```typescript
const MAX_POLYLINE_POINTS = 500;

const routeCoordinates = React.useMemo(() => {
  if (!routePolyline) return [];
  try {
    const decoded = polyline
      .decode(routePolyline)
      .map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
    
    // If polyline is massive, downsample it
    if (decoded.length > MAX_POLYLINE_POINTS) {
      const step = Math.ceil(decoded.length / MAX_POLYLINE_POINTS);
      return decoded.filter((_, i) => i % step === 0);
    }
    
    return decoded;
  } catch {
    return [];
  }
}, [routePolyline]);
```

**Impact**: Prevents map SDK from allocating massive tile buffers for cross-ocean polylines.
### Solution 2.5: Prevent Extreme-Distance Fallback Connector ⭐ **HIGH PRIORITY** ✅ **IMPLEMENTED**
**File**: `src/components/interactive-map.native.tsx` (line ~1870)

When no route polyline exists, the map renders a direct connector line from origin to destination. For impossible routes like "San Francisco → UTown", this creates a polyline spanning the entire Pacific Ocean, causing OOM.

**Change**: Added haversine distance calculation before rendering the fallback connector. If distance > 100km, skip rendering entirely.

```typescript
if (!routeEndpoints) {
  const originPoint = { latitude: connectorOrigin.lat, longitude: connectorOrigin.lng };
  const destPoint = { latitude: connectorDestination.lat, longitude: connectorDestination.lng };
  
  // Calculate distance using haversine formula
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371e3; // Earth radius in meters
  const φ1 = toRad(originPoint.latitude);
  const φ2 = toRad(destPoint.latitude);
  const Δφ = toRad(destPoint.latitude - originPoint.latitude);
  const Δλ = toRad(destPoint.longitude - originPoint.longitude);
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  // Don't render connector if distance > 100km
  if (distance > 100_000) {
    return segments; // Skip rendering
  }
  
  // ... rest of connector rendering
}
```

**Impact**: Prevents memory-intensive rendering of cross-ocean connector lines. This addresses the exact scenario the user identified.

---


---

### Solution 3: Add Response Size Limits to API Client
**File**: `src/api/google-routes.ts`

Abort responses that exceed a reasonable size (e.g., 5 MB):

```typescript
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5 MB

const response = await fetch(url, {
  method: 'POST',
  headers: requestHeaders,
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(30000), // 30s timeout
});

// Check content length before reading body
const contentLength = response.headers.get('content-length');
if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
  throw new Error(`Response too large: ${contentLength} bytes`);
}

const data: ComputeRoutesResponse = await response.json();
```

**Impact**: Prevents massive API responses from being loaded into memory.

---

### Solution 4: Add Memory Warning Handler
**File**: `src/app/_layout.tsx` — in RootLayout

React Native exposes memory warnings on iOS. Listen and warn user:

```typescript
import { AppState, Alert } from 'react-native';

useEffect(() => {
  const subscription = AppState.addEventListener('memoryWarning', () => {
    if (__DEV__) console.warn('[MEMORY] Low memory warning received');
    // Optionally show user a warning or clear caches
    Alert.alert(
      'Low Memory',
      'Your device is running low on memory. Some features may not work correctly.',
      [{ text: 'OK' }]
    );
  });
  
  return () => subscription.remove();
}, []);
```

**Impact**: Gives visibility into memory pressure before OOM kill.

---

### Solution 5: Optimize `useInternalRouteFinder` Memory
**File**: `src/lib/route-finding.ts`

The distance check (Fix 2) helps but doesn't fully prevent memory usage. Add explicit cleanup:

```typescript
// Inside findInternalBusRoutes, after early exit check:
const nearestOriginStops = nearbyOriginStops.slice(0, 3);
const nearestDestStops = nearbyDestinationStops.slice(0, 3);

// Explicitly null out large arrays we don't need anymore
nearbyOriginStops.length = 0;
nearbyDestinationStops.length = 0;
```

**Impact**: Helps Hermes GC reclaim memory faster.

---

## Implementation Priority

1. **Solution 1** (distance check before API) — implement FIRST, solves 90% of the problem
2. **Solution 2** (polyline downsampling) — implement SECOND, prevents map rendering OOM
3. **Solution 3** (response size limits) — nice to have
4. **Solution 4** (memory warning) — for monitoring only
5. **Solution 5** (explicit cleanup) — minor optimization

---

## Problem Description

When searching an impossible route on the **Navigation page** — for example, "San Francisco" to "UTown" — the app:

- **In Expo dev mode**: Works correctly. Shows loading spinner → displays error message "Can't seem to find a way there" ✅
- **In production IPA (adhoc/production build)**: Shows loading spinner → **hard crashes** (app force-closes). No error screen is shown. ❌

Additionally, the crash does **not** appear in the Sentry dashboard at https://edwardzehuazhang.sentry.io/issues/ — meaning either Sentry is not initialized properly, or the crash happens at the native layer before Sentry can capture it.

### Steps to Reproduce

1. Build adhoc IPA: `set -a; source .env.local; set +a && pnpm exec cross-env APP_ENV=production EXPO_NO_DOTENV=1 eas build -p ios --profile adhoc --local`
2. Install IPA on physical iOS device
3. Open app → go to Navigation page
4. Search for **origin**: "San Francisco" (or any far-away location)
5. Search for **destination**: "UTown" (or any NUS location)
6. Tap search / confirm route
7. **Expected**: Loading spinner → "Can't seem to find a way there" error
8. **Actual**: Loading spinner → app crashes (force-close, no error UI)

### Environment

- Expo SDK 52, React Native 0.76
- Hermes engine (production builds)
- `@sentry/react-native` ~7.2.0
- `@mapbox/polyline` for route decoding
- Google Routes API via backend proxy
- Xcode with iPhoneOS26.2.sdk

---

## Attempted Fixes (February 25, 2026) — ALL FAILED

### Fix 1: Wrapped `polyline.decode()` in try/catch + useMemo

**File**: `src/components/interactive-map.native.tsx` (~line 1579)

**Hypothesis**: Raw `polyline.decode(routePolyline)` could crash on corrupt/empty polyline data returned by Google Routes API for impossible routes.

**Change**:
```tsx
// BEFORE:
const routeCoordinates = routePolyline
  ? polyline.decode(routePolyline).map(([lat, lng]) => ({ latitude: lat, longitude: lng }))
  : [];

// AFTER:
const routeCoordinates = React.useMemo(() => {
  if (!routePolyline) return [];
  try {
    return polyline
      .decode(routePolyline)
      .map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
  } catch {
    return [];
  }
}, [routePolyline]);
```

**Result**: ❌ Did not prevent crash.

---

### Fix 2: Early-exit distance check in `findInternalBusRoutes()`

**File**: `src/lib/route-finding.ts` (~line 336)

**Hypothesis**: When both origin and destination are very far from NUS campus (e.g., San Francisco), `useInternalRouteFinder` fires dozens of parallel Google Routes API calls (one per bus stop combination), overwhelming Hermes engine memory in production.

**Change**: Added `NUS_CAMPUS_CENTER` constant and `MAX_ORIGIN_DISTANCE_FROM_CAMPUS = 50_000` meters. If both origin AND destination are >50km from NUS campus center (1.2966°N, 103.7764°E), skip internal route search entirely and return empty array.

```typescript
const NUS_CAMPUS_CENTER: LatLng = {
  latitude: 1.2966,
  longitude: 103.7764,
};
const MAX_ORIGIN_DISTANCE_FROM_CAMPUS = 50_000; // meters

// Inside findInternalBusRoutes():
const originDistFromCampus = calculateDistance(origin, NUS_CAMPUS_CENTER);
const destDistFromCampus = calculateDistance(destination, NUS_CAMPUS_CENTER);
if (originDistFromCampus > MAX_ORIGIN_DISTANCE_FROM_CAMPUS && destDistFromCampus > MAX_ORIGIN_DISTANCE_FROM_CAMPUS) {
  return routes; // empty
}
```

**Result**: ❌ Did not prevent crash. The issue may not be related to internal route finding at all — the crash likely occurs in the Google Routes API / transit route flow or during route rendering.

---

### Fix 3: Gated `console.log`/`console.error` behind `__DEV__`

**Files**: `src/lib/route-finding.ts`, `src/api/google-routes.ts`, `src/app/(app)/navigation.tsx`

**Hypothesis**: In Hermes production builds, `console.log` with large objects (full API responses, route arrays) causes memory pressure and can trigger OOM crashes. Dev mode uses JSC which handles this differently.

**Change**: Wrapped 30+ `console.log` and `console.error` calls across these files with `if (__DEV__)` guards.

```typescript
// BEFORE:
console.log('[ROUTE] Result:', JSON.stringify(result));

// AFTER:
if (__DEV__) console.log('[ROUTE] Result:', JSON.stringify(result));
```

**Result**: ❌ Did not prevent crash.

---

### Fix 4: Normalized Google Routes API empty response

**File**: `src/api/google-routes.ts` (~line 211)

**Hypothesis**: Google Routes API returns `{}` (empty object, no `routes` property) when no route is found. Code accessing `data.routes.length` would throw on `undefined.length`.

**Change**:
```typescript
const data: ComputeRoutesResponse = await response.json();
// Normalize: Google returns {} (no routes property) when no route found
data.routes = data.routes ?? [];
```

**Result**: ❌ Did not prevent crash.

---

### Fix 5: Added `cancelled` flag to `fetchRoutes` useEffect

**File**: `src/app/(app)/navigation.tsx` (~line 1361)

**Hypothesis**: If the user navigates away while async route fetching is in-flight, `setState` is called on an unmounted component, causing a native crash in React Native production builds.

**Change**: Added `let cancelled = false` at the start of the useEffect, `if (cancelled) return` after each `await`, and `return () => { cancelled = true }` cleanup.

**Result**: ❌ Did not prevent crash.

---

### Fix 6: Rewrote Sentry configuration

**File**: `src/lib/sentry.ts` (complete rewrite)

**Hypothesis**: Sentry was misconfigured — used `feedbackIntegration` (web-only) instead of `reactNavigationIntegration`, missing `enableNativeCrashHandling`.

**Change**:
```typescript
// BEFORE:
Sentry.init({
  dsn: '...',
  integrations: [Sentry.feedbackIntegration(...)],
});

// AFTER:
const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

Sentry.init({
  dsn: '...',
  enabled: !__DEV__,
  tracesSampleRate: 0.2,
  integrations: [navigationIntegration],
  enableNativeCrashHandling: true,
  enableAutoSessionTracking: true,
});

export const useSentryNavigationConfig = () => {
  const navigationRef = useNavigationContainerRef();
  useEffect(() => {
    if (navigationRef) {
      navigationIntegration.registerNavigationContainer(navigationRef);
    }
  }, [navigationRef]);
};
```

**Result**: ❌ Sentry still not receiving crash reports.

---

### Fix 7: Added `Sentry.wrap()` to root layout

**File**: `src/app/_layout.tsx` (~line 78)

**Hypothesis**: Without `Sentry.wrap()` on the root component, Sentry's native crash handler hooks are never installed. This is the most critical missing piece per Sentry docs.

**Change**:
```tsx
// BEFORE:
export default function RootLayout() { ... }

// AFTER:
function RootLayout() { ... }
export default Sentry.wrap(RootLayout);
```

Also added `useSentryNavigationConfig()` hook call inside RootLayout.

**Result**: ❌ Sentry still not receiving crash reports after building with this change.

---

### Fix 8: Enabled Sentry source map uploads for adhoc builds

**File**: `eas.json` (adhoc profile)

**Change**: Removed `"SENTRY_DISABLE_AUTO_UPLOAD": "true"` from the adhoc build profile env section. Also fixed `.env.local` to remove `SENTRY_DISABLE_AUTO_UPLOAD=true`. Set `SENTRY_AUTH_TOKEN` as EAS environment variable.

**Build command fix**: Changed from `source .env.local` (doesn't export) to `set -a; source .env.local; set +a` (auto-exports all vars to child processes). This fixed the build-time `Auth token is required` error from sentry-cli.

**Result**: ✅ Build now succeeds with Sentry source map upload. ❌ But crash still occurs and Sentry dashboard still shows no crash reports.

---

## Summary of All Modified Files

| File | Change | Impact |
|------|--------|--------|
| `src/components/interactive-map.native.tsx` | Wrapped `polyline.decode()` in try/catch + useMemo | No effect on crash |
| `src/lib/route-finding.ts` | Added distance-from-campus early exit + `__DEV__` console guards | No effect on crash |
| `src/api/google-routes.ts` | Normalized `data.routes ?? []` + `__DEV__` console guards | No effect on crash |
| `src/app/(app)/navigation.tsx` | Added `cancelled` flag to fetchRoutes useEffect + `__DEV__` console guards | No effect on crash |
| `src/lib/sentry.ts` | Complete rewrite: `reactNavigationIntegration`, `enableNativeCrashHandling` | Sentry still not receiving |
| `src/app/_layout.tsx` | Added `Sentry.wrap(RootLayout)` + `useSentryNavigationConfig()` | Sentry still not receiving |
| `eas.json` | Removed `SENTRY_DISABLE_AUTO_UPLOAD` from adhoc env | Build uploads source maps now |
| `.env.local` | Removed `SENTRY_DISABLE_AUTO_UPLOAD=true` | N/A |

---

## Additional Findings (Post-Build Testing)

### Sentry Still Not Receiving After Reopening App
After crashing and reopening the app, no crash reports appear at https://edwardzehuazhang.sentry.io/issues/. Possible reasons:

1. **`setupGlobalErrorHandler()` may interfere**: In `src/components/crash-handler.tsx`, a custom global error handler is set via `ErrorUtils.setGlobalHandler()` **after** `Sentry.init()` runs. While it chains the previous handler, the `showCrashAlert()` function calls `RNRestart.restart()` — if Sentry's event queue hasn't flushed before the restart, the event is lost.
2. **Native crash (not JS)**: If the crash is at the native layer (SIGKILL from iOS memory pressure, or a crash inside `react-native-maps` / Google Maps SDK), `ErrorUtils` won't catch it at all. Only Sentry's native crash handler (installed via `Sentry.wrap()`) can catch these, and it writes to disk → sends on next launch. The fact that reopening doesn't send anything suggests the native handler may not be installed correctly.
3. **`sentry.properties` missing auth token**: Both `ios/sentry.properties` and `android/sentry.properties` only contain org/project/url — no `auth.token`. This only affects dSYM/source map uploads at build time (not runtime crash reporting), but without dSYMs the crash reports might be silently rejected or unprocessable.

### Key Observation
The crash shows a **loading spinner** before crashing. This means:
- The navigation page renders successfully
- The route search begins (API call fires)
- The crash happens during or after the API response — either while processing the response data or while rendering the route result

This rules out crashes during page mount / initial render.

---

## How to Check iOS Device Crash Logs

Since crashes aren't appearing in Sentry, check the native iOS crash logs directly.

⚠️ **IMPORTANT**: The app's process name in crash logs is **`NUS-Maps`** (with hyphen), not "NUS Maps" or "NUSMaps".

### Method 1: Xcode (Recommended)
1. **Connect your iPhone** to your Mac via USB cable
2. Open **Xcode**
3. Go to **Window → Devices and Simulators** (or press ⇧⌘2)
4. Select your iPhone in the left sidebar
5. Click **"View Device Logs"** button (for crash reports archive)
6. In **Device Logs** window:
   - Look for entries with **Process = "NUS-Maps"** (note the hyphen!)
   - Sort by **Date and Time** (most recent first)
   - Look for **Type = "Crash"** (not just "Log")
7. If you don't see "NUS-Maps", try searching:
   - In the search box at top-right, type: **`NUS-Maps`**
   - Or filter by: **`com.edwardzhang.nusnextbus`** (bundle identifier)
8. Double-click a crash report to view the full log
9. The crash log will show:
   - **Exception Type**: EXC_BAD_ACCESS (memory violation), EXC_CRASH (SIGABRT), EXC_RESOURCE (OOM)
   - **Thread backtrace**: which code was executing when it crashed
   - **Binary Images**: which frameworks/libraries were loaded

**If no crash reports appear in Xcode**:
- The crash might be logged as a different process name
- Try clicking **"Open Console"** instead and reproduce the crash live — you'll see the exact process name

### Method 2: On-Device (No Mac Needed)
1. On your iPhone, go to **Settings → Privacy & Security → Analytics & Improvements → Analytics Data**
2. **Search for**:
   - **`NUS-Maps`** (most likely)
   - Or **`nus-maps`** (lowercase)
   - Or scroll through entries with today's date
3. Crash logs are named like: `NUS-Maps-2026-02-25-123456.ips`
4. Tap on the crash log to view it
5. You can **share** it (tap the share icon top-right) to send via AirDrop/email

**Tip**: If you don't see any crash logs, iOS may not have written one yet. Try:
- Force-quit the app completely (swipe up in app switcher)
- Wait 10 seconds
- Go back to Settings → Analytics Data and check again

### TROUBLESHOOTING: No Crash Logs Appearing

If you've tried all the methods above and still see NO crash logs for "NUS-Maps", try these steps:

#### 1. Verify Analytics is Enabled on Device
Go to **Settings → Privacy & Security → Analytics & Improvements**:
- **"Share iPhone Analytics"** should be **ON** (green)
- **"Share iCloud Analytics"** can be off, that's fine
- If it was OFF, turn it ON, then wait a few minutes and reproduce the crash again

#### 2. Check for ANY Recent Crashes (Not Just NUS-Maps)
In **Settings → Privacy & Security → Analytics & Improvements → Analytics Data**:
- Do you see ANY crash logs from today? (Look for `.ips` files)
- If you see zero crash logs from today for ANY app, iOS crash logging might be disabled or delayed
- Try scrolling to the very bottom — newest logs sometimes appear at the end

#### 3. Force Sync Crash Logs
Sometimes iOS delays writing crash logs. To force it:
1. **Restart your iPhone** (hold Power + Volume Down until "slide to power off")
2. After restart, wait 2-3 minutes
3. Go back to **Settings → Analytics Data** and check again
4. If still nothing, reproduce the crash ONE MORE TIME after the restart

#### 4. Check if This is Actually a "Crash" or a "Termination"
iOS doesn't always write crash reports for every app termination. If your app is:
- **Killed by iOS memory pressure** (jetsam) — might not generate a crash log
- **Watchdog timeout** (app unresponsive for >10 seconds) — generates a log but named differently
- **Background task termination** — no crash log

To check, look for **"NUS-Maps-"** followed by any date, not just today. Look for:
- `NUS-Maps-2026-02-25-*.ips` (crash)
- `NUS-Maps.cpu_resource*` (CPU usage termination)
- `NUS-Maps.wakeups_resource*` (wakeups termination)
- `NUS-Maps-*SpinDump*` (hang report)

#### 5. Use Console.app to See LIVE Termination Reason
This bypasses crash logs entirely and shows you what's happening in real-time:

1. Connect iPhone via USB
2. Open **Console.app** (Applications → Utilities)
3. Select your iPhone in left sidebar
4. **Clear logs** (click the trash icon at top)
5. In search box, enter: `(process == "NUS-Maps") OR (process == "SpringBoard")`
6. Click **Start** to begin streaming
7. **Now reproduce the crash** in the app
8. Watch the Console — look for messages containing:
   - `terminated`
   - `killed`
   - `exit`
   - `reason:`
   - `exception`
9. The last few messages before the app disappears will show WHY iOS terminated it

**Common termination reasons in Console:**
- `exited with signal 9: Killed: 9` — killed by iOS (memory, watchdog, etc.)
- `memorystatus_kill_elevated` — killed due to memory pressure
- `EXC_BAD_ACCESS` — memory access violation (actual crash)
- `EXC_CRASH (SIGABRT)` — assertion failure (actual crash)

#### 6. Alternative: Use Xcode Organizer
If you built the IPA locally and still have the archive:
1. Open **Xcode → Window → Organizer**
2. Click **"Crashes"** tab
3. Select your device
4. Look for crashes of "NUS-Maps"
5. This sometimes shows crashes that didn't sync to Analytics Data

#### 7. Last Resort: Check Xcode Device Support Logs
1. Quit Xcode
2. In Finder, go to: `~/Library/Developer/Xcode/iOS DeviceSupport/`
3. Find folder matching your iOS version
4. Inside, look for `CrashReporter` or `DiagnosticLogs`
5. Look for files named `NUS-Maps-*`

---

**Once you see output from Console.app (step 5), copy and paste it here.** The live termination reason will tell us exactly why the app is exiting.

### Method 3: Console.app Live Debugging (macOS)
1. Connect iPhone via USB
2. Open **Console.app** (in Applications → Utilities)
3. Select your iPhone in the left sidebar under "Devices"
4. In the search box at top-right, type: **`NUS-Maps`** or **`com.edwardzhang.nusnextbus`**
5. Click **Start** to begin streaming logs
6. **Reproduce the crash** (search San Francisco → UTown in the app)
7. Look for:
   - **Error messages** in red/orange
   - **Last messages before crash** — these often contain the actual error
   - Process name to confirm it matches

**What to search for in Console.app**:
- `process:NUS-Maps`
- `subsystem:com.edwardzhang.nusnextbus`
- `eventType:logEvent eventMessage:crash`
- Look for messages containing: `error`, `exception`, `terminated`, `assertion failed`

### What to Look For in the Crash Log
- **Exception Type**: `EXC_BAD_ACCESS` = memory access violation; `EXC_CRASH (SIGABRT)` = assertion failure; `EXC_RESOURCE` = memory limit exceeded (OOM)
- **Crashing Thread**: Look at which thread crashed and its backtrace
- **If the backtrace mentions `GoogleMaps`** or `GMSMapView` → the crash is in the native maps SDK
- **If it mentions `hermes`** → Hermes JS engine crash (likely OOM or stack overflow)
- **If it shows `jetsam` or `EXC_RESOURCE`** → iOS killed the app for using too much memory

---

## Remaining Investigation Ideas

### Crash Root Cause
1. **Get the native crash log** using one of the methods above — this is the #1 priority to identify the actual crash
2. **Check if crash is in native Google Maps SDK**: The crash may be in `react-native-maps` when it tries to render a route polyline that spans the entire Pacific Ocean (San Francisco → Singapore). The map may try to allocate an enormous tile buffer.
3. **Memory profiling**: Use Xcode Instruments to profile memory during the impossible route search. Hermes OOM crashes are silent (no JS exception, just SIGKILL).
4. **Check `useInternalRouteFinder` hook**: This hook runs separately from `fetchRoutes`. Even with the distance check, it may still trigger other code paths that crash.
5. **Test with a less extreme route**: Try a route that's impossible but closer (e.g., Sentosa to UTown) to see if it's distance-specific or any no-route scenario.

### Sentry Not Receiving
1. **Test Sentry manually**: Add a test button that calls `Sentry.nativeCrash()` to verify the full pipeline works (capture → upload → dashboard). This is the fastest way to confirm whether Sentry works at all.
2. **Check `Sentry.init()` timing**: Currently `Sentry.init()` runs at module load of `sentry.ts`. If the module isn't imported early enough, native crash hooks may not be installed before the crash.
3. **Add `Sentry.flush()`**: In the crash handler, call `await Sentry.flush(2000)` before `RNRestart.restart()` to ensure events are sent before the app restarts.
4. **Verify DSN is correct**: The DSN `https://384812f105c4a5f3bfcc829c35933009@o4510941200449536.ingest.us.sentry.io/4510941206872064` — confirm this matches the project in Sentry dashboard (Settings → Client Keys (DSN)).
5. **Network/firewall**: Ensure the device has internet access and can reach `sentry.io` endpoints.
6. **Enable `debug: true` temporarily**: Set `debug: true` in `Sentry.init()` to see Sentry's internal logs. Requires a dev build to see console output.

---

## Build Commands Reference

```bash
# Local adhoc build (exports env vars for sentry-cli):
set -a; source .env.local; set +a
pnpm exec cross-env APP_ENV=production EXPO_NO_DOTENV=1 eas build -p ios --profile adhoc --local

# Cloud adhoc build (uses EAS secrets automatically):
pnpm eas build -p ios --profile adhoc
```
