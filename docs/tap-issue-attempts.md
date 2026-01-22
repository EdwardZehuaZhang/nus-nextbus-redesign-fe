
# Map Marker Tap Issue – Attempt Log

Context: React Native Maps in `interactive-map.native.tsx`. Goal: first-tap selection for visible markers while hidden markers are non-interactive.

## Problem Summary

**Issue 1 (FIXED):** Double-tap requirement – landmarks and other markers on the interactive map needed to be tapped twice to trigger the bottom panel update.

**Issue 2 (CURRENT):** Hidden components are tappable – markers that should not be interactive (filtered out, wrong zoom level, opacity 0) still respond to taps.

**The Cycle:** We successfully fixed Issue 1 (double-tap), which is the current state of the code. However, every attempt to fix Issue 2 (hidden tappable markers) reintroduces Issue 1 (double-tap). All attempts to add visibility guards, conditional identifiers, or handler filtering have resulted in reverting back to the current state where single-tap works but hidden markers remain interactive.

## Latest findings (Jan 22, 2026)
- Tried adding visibility guards inside the map-level `onMarkerPress` to suppress clicks on hidden markers. This did block hidden bus stops, but it reintroduced the double-tap symptom for landmarks, so the change was reverted.
- After reverting, confirmed that the double-tap issue applies only to landmarks. Other marker types (printers, sports, canteens, bus stops) respond to single-tap under the current configuration.
- Hidden bus stops due to zoom-level priority continue to be clickable because their `identifier` remains set and the map-level handler routes by identifier regardless of per-marker `onPress` being undefined.

## Attempts (chronological highlights)
- Added map-level `onMarkerPress` dispatch with marker identifiers (landmark/printer/sports/canteen/bus-stop-circle/bus-stop-label/origin/waypoint/destination) to force first-tap handling. Result: first tap worked, but hidden markers (filtered/opacity 0 or off-zoom) still responded.
- Added visibility guards inside map-level handler (shouldShow* flags, bus stop visibility via `isStopVisibleForActiveRoutes`, `shouldShowStop`, zoom). Result: reduced hidden taps but reintroduced double-tap symptom on some markers.
- Removed identifiers/onPress for hidden markers (only assign identifier and handlers when visible). Result: hidden markers ignored, but double-tap returned for some marker types.
- Switched markers from onPress to onSelect (to avoid double triggers). Result: double-tap persisted for landmarks; visibility gating intact.
- Removed map-level `onMarkerPress` entirely; relied on per-marker `onSelect`. Result: hidden markers respected, but double-tap persisted for landmarks.
- Landmark-specific tweaks:
  - Swapped back to `onPress` for landmarks only.
  - Removed debouncer/pending delay for landmarks; executed immediately with AbortController guard.
  - Tried immediate basic selection emit + optional details fetch. Result: still reported as requiring double tap.
- Bus stop/label handling: kept `identifier` plus per-marker `onSelect`; visibility via opacity and `isStopVisibleForActiveRoutes`/`shouldShowStop`. Earlier attempts to strip identifiers when hidden were undone.
- Polygon tappable disabled to avoid overlay interception (academic/residence overlays). Map `moveOnMarkerPress={false}` retained.

## Current reverted state (per user)
- Back to version where single-tap works for printers/sports/canteens/bus stops. Hidden bus stops (off-zoom/non-priority) still respond because identifiers are always set and the map-level handler routes by identifier.
- Double-tap is now confirmed to apply only to landmarks; other marker types do not exhibit double-tap.

## Suspected root causes considered
- Map-level vs per-marker handler conflicts (`onSelect` vs `onPress`).
- React Native Maps press propagation quirks when opacity=0 markers remain mounted.
- Debouncer and pending state blocking second trigger.
- Identifiers on hidden markers causing map-level dispatch despite visual hiding.

## Attempt: Remove onSelect + conditional identifier + visibility guard (Jan 22, 2026, FAILED)
**Strategy:** Remove `onSelect` from landmarks (keep only `onPress`), make `identifier` conditional based on `shouldShowLandmarks`, and add visibility guard in map-level handler.
**Rationale:** Dual `onPress`/`onSelect` handlers on landmarks were hypothesized to cause double-tap; other markers with both handlers work fine, so the dual-handler isn't inherently broken. Conditional identifier would prevent map-level dispatch when hidden.
**What was changed:**
- Removed `onSelect={(e) => handleLandmarkPress(landmark)(e as MarkerPressEvent)}` from landmark markers
- Changed `identifier={`landmark:${index}`}` to `identifier={shouldShowLandmarks ? `landmark:${index}` : undefined}`
- Changed `onPress={handleLandmarkPress(landmark)}` to `onPress={shouldShowLandmarks ? handleLandmarkPress(landmark) : undefined}`
- Added `if (!shouldShowLandmarks) return;` guard in map-level `handleMapMarkerPress` before landmark routing
**Result:** ❌ NO CHANGE. Hidden landmarks still clickable (identifiers are re-set on visibility toggle), single-tap on visible landmarks still works. Suggests conditional identifier approach doesn't work because identifiers may be re-evaluated and re-set during re-renders, or map maintains reference to old identifiers.

## Attempt: Remove landmark map-level routing + conditional identifier + remove onSelect (Jan 22, 2026, FAILED)
**Strategy:** Remove `landmark:` routing from `handleMapMarkerPress`, make landmark `identifier` conditional on `shouldShowLandmarks`, and remove `onSelect` handler, keeping only per-marker `onPress`.
**Rationale:** Dual handlers and map-level dispatch were hypothesized to cause double-tap and hidden marker tappability. Isolating landmarks to per-marker `onPress` only should eliminate dual-handler conflicts.
**What was changed:**
- Removed entire `if (markerId.startsWith('landmark:'))` block from `handleMapMarkerPress` (lines 1874-1880)
- Changed landmark `identifier={`landmark:${index}`}` to `identifier={shouldShowLandmarks ? `landmark:${index}` : undefined}`
- Changed landmark `onPress={handleLandmarkPress(landmark)}` to `onPress={shouldShowLandmarks ? handleLandmarkPress(landmark) : undefined}`
- Removed `onSelect={(e) => handleLandmarkPress(landmark)(e as MarkerPressEvent)}` from landmark marker
**Result:** ❌ COMPLETE FAILURE. Hidden bus stops, sports facilities, printers, canteens, AND landmarks are still all tappable. The issue appears to be **ecosystem-wide**, not landmark-specific. Hidden markers of all types remain interactive despite visibility hiding.
**Key finding:** The problem is not isolated to landmarks or dual handlers. All marker types with both `onPress` and `onSelect` remain tappable when hidden (opacity=0, invisible but mounted). This suggests the issue is a fundamental react-native-maps behavior: **markers mounted on the map remain interactive regardless of opacity, and both onPress and onSelect handlers fire despite visibility hiding.**

## Attempt: Add conditional tappable prop to all marker types (Jan 22, 2026, FAILED)
**Strategy:** Use the react-native-maps `tappable` prop to explicitly set interactivity based on visibility for all marker types (landmarks, printers, sports, canteens, bus stops, bus stop labels).
**Rationale:** The `tappable` prop is a native control that directly manages whether the marker can receive touch events. Setting `tappable={false}` should hard-block the marker from all interaction, regardless of opacity or mounted state.
**What was changed:**
- Added `tappable={shouldShowLandmarks}` to landmark markers
- Added `tappable={shouldShowPrinters}` to printer markers
- Added `tappable={shouldShowSports}` to sports facility markers
- Added `tappable={shouldShowCanteens}` to canteen markers
- Added `tappable={isCircleClickable}` to bus stop circle markers
- Added `tappable={isLabelClickable}` to bus stop label markers in BusStopLabelMarker component
**Result:** ❌ FAILED. Hidden markers are still tappable despite `tappable={false}`. Same issue persists across all marker types (landmarks, printers, sports, canteens, bus stops). 
**Key finding:** The `tappable` prop does NOT prevent interaction with markers that have `opacity={0}`. Either the prop doesn't work as expected in react-native-maps, OR the markers are receiving touch events through a different path (possibly the map-level `onMarkerPress` handler which routes by identifier regardless of per-marker tappable state). This suggests the issue is deeper than marker-level props and may require removing markers from the render tree entirely or blocking at the handler level.

## Attempt: Conditional rendering + visibility guards + landmark handler simplification (Jan 22, 2026, FAILED)
**Strategy:** Remove markers from the native layer entirely when not visible using conditional rendering (`{shouldShow && <Marker>}</Marker>`), add visibility guards in `handleMapMarkerPress` for all marker types, and simplify landmark handlers by removing `onSelect` (keep only `onPress`).
**Rationale:** Unmounting markers entirely should prevent native layer from receiving any touch events. Removing dual handlers on landmarks might fix double-tap. Visibility guards provide defense-in-depth at the router level.
**What was changed:**
- Changed all marker rendering from `opacity={visibility ? 1 : 0}` to `{visibility ? <Marker>...</Marker> : null}`
- Removed `onSelect` handler from landmarks (kept only `onPress`)
- Removed conditional handler assignment for printers/sports/canteens (handlers always present since marker unmounts when not visible)
- Removed `isCircleClickable`, `isPrinterClickable`, etc. variables since conditionals now at render level
- Added visibility guards in `handleMapMarkerPress` before each marker type routing:
  - Landmarks: check `shouldShowLandmarks`
  - Printers: check `shouldShowPrinters`
  - Sports: check `shouldShowSports`
  - Canteens: check `shouldShowCanteens`
  - Bus stops: check `shouldShowBusStops && currentZoom >= 17 && isStopVisibleForActiveRoutes(stop)`
  - Bus stop labels: check `isStopVisibleForActiveRoutes(stop)`
- Wrapped `BusStopLabelMarker` with `{isLabelVisible ? <BusStopLabelMarker>...</BusStopLabelMarker> : null}`
**Result:** ❌ COMPLETE FAILURE. Hidden markers are STILL tappable despite being unmounted from the render tree. The issue persists exactly as before—clicking on an area with a hidden bus stop still triggers the bus stop handler even though the marker should not exist in the native layer.
**Key finding:** The problem is **NOT** in React layer visibility or rendering. This strongly suggests:
1. The native map layer may be **caching marker references** before unmounting
2. React Native Maps 1.20.1 may have a bug where identifiers persist on the native layer even after component unmount
3. There may be a race condition between React unmounting and native layer event propagation
4. The touch event system in react-native-maps may not respect React render tree changes in real-time

**New hypothesis:** Attempting to fix at the React layer (visibility guards, unmounting) is ineffective. The issue is at the **native map layer level**, where markers or their identifiers may persist in the gesture recognizer/touch handler registry even after React unmounts them.

## Workaround Implementation: Landmark Priority via Z-index + Render Order (Jan 22, 2026, IMPLEMENTED)
**Strategy:** Increase landmark z-index from 20 to 70 (above bus stops at 50/60) AND move landmark rendering to the END of the marker list (after bus stop labels). This ensures landmarks have both visual and native layer priority.
**Rationale:** Since React Native Maps caches marker references and hidden markers remain tappable despite visibility guards, prioritizing landmarks by both z-index and render order may allow them to capture taps BEFORE the underlying hidden bus stops do. This won't prevent hidden marker taps entirely, but will ensure that when a user clicks on a landmark location, the landmark is triggered first (single-tap), not a hidden bus stop (which would trigger double-tap symptom).

**Implementation details:**
1. **Z-index increase:** Changed landmark `zIndex` from 20 to 70 (located in interactive-map.native.tsx around line 2495)
2. **Render order:** Moved entire landmark rendering block from its original position (after residence polygons, around line 2288) to the END of the marker rendering section (after bus stop labels, before user location marker, around line 2480)
3. **Comment added:** "Rendered LAST to ensure highest priority for tap capture" explains the reasoning

**Current marker rendering order (highest priority = rendered last):**
1. Residence polygons
2. Printer markers (zIndex 20)
3. Sports facility markers (zIndex 20)
4. Canteen markers (zIndex 20)
5. Bus stop circle markers (zIndex 50)
6. Bus stop label markers (zIndex 60)
7. **Landmark markers (zIndex 70) ← RENDERED LAST, HIGHEST PRIORITY**
8. User location marker (zIndex 1000)
9. Origin/destination/waypoint markers

**How it works:**
- In React Native Maps, rendering order affects native layer touch priority
- Later-rendered markers are added to top of the gesture recognizer stack
- Combined with higher z-index (70 vs 50/60), landmarks get dual priority
- When user taps an area with overlapping landmarks and bus stops, landmark gesture should be recognized first

**Expected results after implementation:**
- ✅ Landmarks should respond with single-tap (no double-tap needed)
- ✅ Landmarks should not require second tap to show details
- ⚠️ Hidden bus stops may still be tappable (root issue unsolved), but won't interfere with visible landmarks
- ✅ Bus stops should respond normally when not obscured by landmarks

**Testing checklist:**
- [ ] Single-tap on visible landmarks at zoom level 15+ (where bus stops are visible) — should open landmark details without double-tap
- [ ] Single-tap on different landmark types (hospital, library, bus-terminal, etc.)
- [ ] Tap landmark at zoom 14 (bus stops hidden) — verify landmark works as before
- [ ] Tap bus stop circles away from landmarks — verify bus stops still respond
- [ ] Zoom transitions (13→14→15→17) — verify landmarks maintain single-tap responsiveness
- [ ] Tap bus stop labels — verify labels still work and don't require double-tap
- [ ] Activate route filters — verify landmark taps still work with route filtering active
- [ ] Test on both iOS and Android if possible

**Files changed:**
- `/Users/gel/Desktop/Github/nus-nextbus-redesign/nus-nextbus-redesign-fe/src/components/interactive-map.native.tsx`
  - Line ~2495: `zIndex={70}` (was 20)
  - Lines ~2480-2505: Landmark rendering moved to end of marker list

**Known limitations of this workaround:**
- Does NOT fix the root issue (hidden marker tappability in react-native-maps 1.20.1)
- Only works around the symptom by ensuring visible landmarks get priority
- If other marker types are stacked with landmarks, they may still experience the double-tap issue
- Does not prevent hidden bus stops from being tappable when not obscured by landmarks

**Future fixes needed:**
- Upgrade react-native-maps to v1.21.0+ (if available) for native layer synchronization fixes
- File/track issue with react-native-maps maintainers about marker caching behavior
- Consider alternative map libraries if issue persists
