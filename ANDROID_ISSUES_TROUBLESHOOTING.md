# Android Issues Troubleshooting Log

**Date Started**: February 12, 2026  
**Last Updated**: February 12, 2026 (Issue 3 Resolved - Emulator Network)  
**Status**: ⚠️ **PARTIALLY RESOLVED** - Issue 3 resolved (emulator network); Issue 2 requires development build; Issue 1 remains
**Platform**: Android (Expo Go on Medium_Phone_API_36.1)  
**App**: NUS NextBus (nus-nextbus-redesign-fe)

---

## Critical Issues

### Issue 2: MMKV Initialization Failure
**Severity**: High  
**Platform**: Android  
**Description**: Native MMKV module not properly linked, causing fallback to in-memory storage

**Current Log Output**:
```
WARN  MMKV initialization failed, using in-memory fallback: [Error: Failed to create a new MMKV instance: The native MMKV Module could not be found.
* Make sure react-native-mmkv is correctly autolinked (run `npx react-native config` to verify)
* Make sure gradle is synced.
* Make sure you rebuilt the app.]
```

**Status**: ❌ UNFIXED - Issue still present

**Impact**:
- Favorites not persisting (stored in memory only, lost on app restart)
- Storage operations falling back to memory: `[Storage] Using memory fallback for getString`
- Every storage call shows deprecation: "Using memory fallback for get..."

---

### Issue 3: Location Shows "Unavailable" Despite Successful Retrieval
**Severity**: Critical  
**Platform**: Android  
**Description**: Despite permission being granted and location successfully retrieved, UI shows "location unavailable" and map remains stuck loading with darkened overlay

**Current Log Output**:
```
LOG  [Location] Permission status: granted
LOG  [Location] Permission granted, clearing any previous errors
LOG  [Location] Requesting current position...
LOG  [Location] Got current position: {"accuracy": 5, "altitude": 5, "altitudeAccuracy": 0.25999999046325684, "heading": 0, "latitude": 37.4219983, "longitude": -122.084, "speed": 0}
LOG  [Location] Location set successfully {"lat": 37.4219983, "lng": -122.084}
LOG  [Location] Starting location watch...
LOG  [Location] Location watcher started successfully
LOG  [Location] Location watch updated
```

**Key Observation**: Logs show location **IS** successfully retrieved (lat: 37.4219983, lng: -122.084), but UI still displays error

**Status**: ✅ **RESOLVED** - Emulator had no internet connection

**Root Cause** (Identified):
The Android emulator was offline. With no network, map tiles failed to load and the app appeared stuck on loading with a "Location Unavailable" message. Once the emulator was connected to the internet, the map loaded correctly and location state behaved as expected.

---

## Attempted Fixes and Results

### Attempt 1: Splash Screen `resizeMode` Fix
**File**: `app.config.ts`  
**Change**: Modified expo-splash-screen plugin config
```typescript
// From:
"resizeMode": "cover"

// To:
"resizeMode": "contain"
```

**Rationale**: Different rendering behavior between iOS and Android; `contain` should fit entire image  
**Result**: ❌ **FAILED** - Splash screen still shows circular container cutting off image  
**Why Failed**: Issue may not be in resizeMode; could be platform-specific rendering in expo-splash-screen itself or custom splash implementation

---

### Attempt 2: MMKV Autolink Plugin
**File**: `app.config.ts`  
**Change**: Added MMKV to plugins array for Android autolink
```typescript
plugins: [
  // ... other plugins
  'react-native-mmkv',  // ← Added this
]
```

**Rationale**: MMKV requires native module linking during Android build; Expo plugins auto-link via gradle  
**Result**: ❌ **FAILED** - MMKV initialization still fails with same error message  
**Why Failed**: 
- Change is in app.config.ts only (JavaScript configuration)
- Expo Go doesn't compile native modules; uses pre-built binaries
- Plugin directive only applies to development builds (created with `eas build`)
- Current testing environment uses Expo Go which doesn't support MMKV native linking

---

### Attempt 3: Location Permission Error Handling
**File**: `src/lib/hooks/use-location.native.ts`  
**Changes**:
- Added try-catch blocks around permission requests
- Enhanced error logging with specific error types
- Added timeout to `getCurrentPositionAsync` (10000ms)
- Improved error propagation to store

**Result**: ❌ **FAILED** - Permission handling improved but UI still shows "unavailable" despite logs showing location retrieved  
**Why Failed**: Logs confirm location IS being retrieved successfully; problem is UI state timing, not permission handling

---

### Attempt 4: ReferenceError Fix - locationError Scope
**File**: `src/app/(app)/transit.tsx`  
**Change**: Extracted `locationError` from hook at component root level
```typescript
const { error: locationError, loading: locationLoading } = useLocation();
```

**Result**: ✅ **SUCCESS** - Compilation error fixed, no more ReferenceError  
**However**: Fixed compilation but didn't fix the underlying issue of location showing unavailable

---

### Attempt 5: Race Condition - Promise-Based Locking (Complex)
**File**: `src/lib/hooks/use-location.native.ts`  
**Changes**:
- Implemented promise-based initialization locking
- Added `initializationInProgress` flag with promise tracking
- Added complex promise resolution logic to prevent multiple simultaneous initializations

**Logs Showed**:
```
LOG  [Location] Subscriber count: 1
LOG  [Location] Subscriber count: 2
LOG  [Location] Initialization already started/completed, skipping
LOG  [Location] Subscriber count: 3
LOG  [Location] Initialization already started/completed, skipping
LOG  [Location] Subscriber count: 4
LOG  [Location] Initialization already started/completed, skipping
```

**Result**: ❌ **FAILED** - Race condition logging reduced but UI issue persisted  
**Why Failed**: While race condition prevented multiple initializations, the real issue was not the initialization itself but the UI state check happening too early

---

### Attempt 6: Loading-Aware Error Display (Current)
**Files**: `src/lib/hooks/use-location.native.ts`, `src/app/(app)/transit.tsx`  
**Changes**:
- Simplified initialization from promise-based to boolean flag
- Extracted both `error` and `loading` from useLocation hook
- Added `shouldShowLocationError = !locationLoading && locationError` flag
- Updated map rendering: `{!shouldShowLocationError && <InteractiveMap />}`
- Updated backdrop rendering: `{!shouldShowLocationError && <Animated.View />}`

**Rationale**: Only show error after loading completes, preventing premature "unavailable" message  
**Result**: ❌ **FAILED** - No visible improvement in UI behavior  
**Why Failed**: The real issue was not the loading flag timing, but aggressive error handling in the location watch callback

---

### Attempt 7: Watch Position Error Handler Fix (FAILED - PARTIAL FIX ONLY)
**Files**: `src/lib/hooks/use-location.native.ts`  
**Changes**:
- **Removed**: `store.setError('Location service error')` from watchPositionAsync error callback
- **Added**: Non-critical error logging instead: `debugWarn('[Location] Watch position error (non-critical):', error)`
- **Removed**: Generic `store.setError('Failed to initialize location')` from catch block
- **Added**: Conditional error setting only for permission denied

**Root Cause Hypothesis**:
1. Location WAS being successfully retrieved via `getCurrentPositionAsync`
2. `setLocation()` correctly called, setting `loading: false` and `error: null`
3. BUT then `watchPositionAsync` error callback was being triggered by a transient error
4. This callback called `store.setError('Location service error')`
5. This error state persisted, showing "Location Unavailable"

**Result**: ⚠️ **PARTIALLY FIXED** - Black overlay is gone, but map still stuck on loading and "Location Unavailable" still shows

**What Changed**:
- ✅ Black overlay backdrop is now gone (meaning `shouldShowLocationError` is false, so watch errors are no longer setting error state)
- ❌ Interactive map still stuck on loading state
- ❌ "Location Unavailable" error message still displays
- ✅ Logs confirm location IS retrieved: `[Location] Location set successfully {"lat": 37.4219983, "lng": -122.084}`

**Why Partially Failed**:
The removal of watch error callback `setError()` worked (overlay gone proves this), but the UI was still stuck because the emulator had no internet connection. This was not an app bug.

**Next Investigation Required**:
- Verify emulator has internet access before testing location/map
- Re-test location/map behavior after reconnecting

---

## Root Cause Analysis Status

### Issue 1: Splash Screen
**Possible Root Causes** (in order of likelihood):
1. Expo-splash-screen uses platform-specific image rendering that clips on Android
2. The custom splash screen image dimensions are incorrect for Android layout
3. Android's SafeAreaView/native layout system forcing circular container
4. Custom asset configuration in app.config.ts causing circular container rendering

**Not Yet Tested**:
- Checking actual splash image dimensions vs device screen
- Verifying image asset configuration in app.config.ts
- Testing with different image file formats (PNG vs other)
- Native Android layout inspector to verify actual rendering

---

### Issue 2: MMKV
**Confirmed Root Cause**: MMKV requires native Android module compilation

**Evidence**:
- Error explicitly states: "The native MMKV Module could not be found"
- Plugin configuration in JavaScript alone is insufficient
- Expo Go (current testing environment) doesn't compile native modules

**Solution Path** (requires development build):
```bash
eas build -p android --profile development --clean
```

**Status**: Cannot fix in Expo Go; requires development build testing

---

### Issue 3: Location Shows Unavailable
**Resolved**: Emulator network was disconnected.

**Evidence**:
Logs showed GPS location retrieval succeeded, but map tiles and network requests failed until the emulator was reconnected to the internet.

---

## Additional Observations

### SafeAreaView Deprecation Warning
```
WARN  SafeAreaView has been deprecated and will be removed in a future release. Please use 'react-native-safe-area-context' instead.
```

**Status**: ✅ Already correctly implemented in codebase (likely coming from dependency)  
**Action**: No immediate action needed; dependency maintainer should update

---

## Testing Environment
- **Device**: Android Medium_Phone_API_36.1 (Emulator)
- **Test Method**: Expo Go (pre-built binaries, no native compilation)
- **Expo SDK**: 52
- **React Native**: 0.76
- **Command**: `pnpm start` then open on Android emulator

---

## Next Debugging Steps

### For Issue 1 (Splash Screen):
1. Check splash screen image dimensions in [nus-nextbus-redesign-fe/assets/images](assets/images/)
2. Verify image aspect ratio matches device dimensions
3. Test with `resizeMode: 'contain'`, `'cover'`, `'stretch'`, `'native'` in isolation
4. Check if SafeAreaView padding affecting splash layout
5. Inspect native Android layout hierarchy with emulator tools

### For Issue 2 (MMKV):
1. This **requires development build** - cannot test in Expo Go
2. Create development build: `eas build -p android --profile development --clean`
3. Install built APK on device: `eas build -p android --profile development --output ./app.apk`
4. Test with development build (will have native MMKV module)

### For Issue 3 (Location Unavailable):
1. **Verify emulator internet connection** before testing location/map behavior

---

## Code Changes Made (Summary)

| Attempt | File | Change | Result |
|---------|------|--------|--------|
| 1 | app.config.ts | Changed splash resizeMode to 'contain' | ❌ Still shows circular container |
| 2 | app.config.ts | Added MMKV to plugins array | ❌ Still fails - needs dev build |
| 3 | use-location.native.ts | Enhanced permission error handling | ❌ Permission handling OK, location display fails |
| 4 | transit.tsx | Fixed locationError scope (ReferenceError) | ✅ Compilation fixed |
| 5 | use-location.native.ts | Promise-based race condition locking | ❌ Race condition improved, UI issue remains |
| 6 | transit.tsx + use-location.native.ts | Loading-aware error display | ❌ No visible improvement |
| 7 | use-location.native.ts | Removed aggressive watch error callback | ⚠️ Partial change; final cause was emulator offline |

---

## iOS Compatibility Status

All changes made to date **should not affect iOS behavior**:

✅ **app.config.ts**: Splash resizeMode change applies to both iOS and Android (no platform-specific handling)  
⚠️ **app.config.ts**: MMKV plugin addition affects both platforms but iOS MMKV works fine  
✅ **use-location.native.ts**: File is `.native.ts` suffix - only used on native platforms, no iOS-specific code modified  
✅ **transit.tsx**: Component logic changes apply to both iOS/Android but location handling identical on both  

**⚠️ CAUTION**: Need to verify iOS still works after Attempt 1 (splash resizeMode change). If iOS splash is now broken, will need to revert or add platform-specific handling.

---

## Critical Information for Next Attempt

1. **Location is being retrieved successfully** - this is confirmed by logs
2. **The issue is purely UI state related** - not a location retrieval problem
3. **Expo Go limitations**: MMKV won't work in Expo Go; must use development build for Issue 2
4. **Race condition logs**: Initialization happening 4 times still suggests state synchronization issue
5. **Next step likely requires**:
   - Zustand store state inspection during runtime
   - React component re-render cycle analysis
   - Direct state validation logging in hooks and components

---

## Resolution: Issue 3 (Emulator Network)

### Final Diagnosis
The emulator did not have internet access. With no network, map tiles failed to load and the UI appeared stuck with "Location Unavailable" even though GPS coordinates were retrieved.

### Confirmation
Once the emulator was reconnected to the internet, the map loaded normally and location status behaved as expected.

### Notes
- Attempt 7 changes removed the dark overlay, but the real issue was emulator connectivity.
- Temporary debug logging has been removed from the codebase.

---

## References

- [Expo Location API](https://docs.expo.dev/versions/latest/sdk/location/)
- [React Native MMKV Docs](https://github.com/mrousavy/react-native-mmkv)
- [Expo Splash Screen Docs](https://docs.expo.dev/versions/latest/sdk/splash-screen/)
- [Expo Go Limitations](https://docs.expo.dev/build/setup/)
- [Development Build Setup](https://docs.expo.dev/build-reference/app-config/)
