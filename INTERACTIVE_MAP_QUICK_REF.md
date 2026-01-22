# Interactive Map - Developer Quick Reference

## Do's and Don'ts

### ✅ DO: Keep things stable

```typescript
// ✅ GOOD: Always mounted, property changes
<Polygon
  key="academic-orange"
  coordinates={ORANGE_AREA_BOUNDARY}
  strokeColor={shouldShowAcademic ? '#FF0000' : 'transparent'}
  strokeWidth={shouldShowAcademic ? 2 : 0}
  fillColor={shouldShowAcademic ? 'rgba(255, 0, 0, 0.2)' : 'transparent'}
/>

// ✅ GOOD: Opacity hiding for markers
<Marker
  key="printer-0"
  opacity={shouldShowPrinters ? 1 : 0}
/>

// ✅ GOOD: Deferred state updates
routeToggleTimeoutRef.current = setTimeout(() => {
  setDeferredActiveRoute(effectiveActiveRoute);
}, 0);
```

### ❌ DON'T: Trigger child reordering

```typescript
// ❌ BAD: Conditional mount (causes crash)
{shouldShowAcademic && <Polygon ... />}

// ❌ BAD: IIFE rendering (causes crash)
{(() => {
  if (shouldShowAcademic) return <Polygon ... />;
  return null;
})()}

// ❌ BAD: Dynamic keys (triggers reordering)
<Polygon
  key={`polygon-${shouldShowAcademic}`}  // Key changes!
  {...}
/>

// ❌ BAD: Rapid state cascades (slow sync)
setActiveRoute(newRoute);
setDeferredRoute(newRoute);  // Triggers immediate re-render + cascading updates
```

---

## Key Variables & Their Purposes

### State
| Variable | Purpose | Updates | Used For |
|----------|---------|---------|----------|
| `currentRegion` | Real-time map bounds | Every pan/zoom | Viewport windowing, clustering bounds |
| `currentZoom` | Real-time zoom level (from latitudeDelta) | Every pan/zoom | Bounds filtering, shouldShowStop() |
| `effectiveZoomLevel` | Deferred zoom (after gesture stops) | 350ms after gesture | Label SVG sizing, visual effects |
| `effectiveActiveRoute` | Selected route (priority: filters > prop) | On filter/prop change | Polling gate, route color |
| `deferredActiveRoute` | Synced route (batched updates) | 0ms timeout | Map children visibility |
| `isGestureActiveRef` | Gesture in progress? | On region change | Polling pause, deferred updates |

### Constants
```typescript
// Viewport windowing padding (~2km around visible area)
const BOUNDS_PADDING = 0.02;

// Gesture timeout: wait 350ms after pan/zoom stops before updating visual effects
const GESTURE_TIMEOUT = 350;

// Route toggle batching: 0ms timeout to batch multiple filter changes
const ROUTE_TOGGLE_TIMEOUT = 0;

// Region change debounce: 150ms throttle on final sync after gesture
const REGION_CHANGE_DEBOUNCE = 150;
```

---

## When Things Lag or Crash

### Problem: Route toggle causes crash
**Root Cause**: Conditional polygon rendering or child reordering  
**Fix**:
```typescript
// WRONG
{deferredActiveRoute === 'A1' && <Polygon ... />}

// RIGHT
<Polygon
  strokeColor={deferredActiveRoute === 'A1' ? '#FF0000' : 'transparent'}
  strokeWidth={deferredActiveRoute === 'A1' ? 2 : 0}
/>
```

### Problem: Labels flicker during pan
**Root Cause**: `effectiveZoomLevel` updating during gesture (no debounce)  
**Fix**: Check that `handleRegionChange` uses 350ms timeout before updating `effectiveZoomLevel`

### Problem: Live buses stutter when zooming
**Root Cause**: Polling not paused during gestures  
**Fix**: Verify `useActiveBuses(..., !isGestureActiveRef.current)` gate is in place

### Problem: Slow with 100+ bus stops
**Root Cause**: No viewport windowing (clustering all stops)  
**Fix**: Check `clusteredInputMarkers` includes viewport bounds filter before clustering

---

## Console Log Cheatsheet

```typescript
// Viewport windowing working?
[BusStopsVisibility] Zoom 14: 4 stops visible (out of 147 total)

// Route toggle batching?
[RouteToogle] Deferred active route update: A1

// Gesture detection?
[ZoomGesture] Active: currentZoom=17, effectiveZoomLevel=15 (deferred)
[RegionChangeComplete] Gesture finished, syncing region if needed

// Bearing cache working?
🚌 [BUS] Route A1: bearing=45.3°, arrow=315.3°, dir=1

// Label visibility?
🗺️ [VISIBLE] Central Library: true (A1 members: 18)
🗺️ [CIRCLE] Central Library: color=#BE1E2D (route=A1)
```

---

## Performance Checklist

Before committing changes to interactive map:

- [ ] No new conditional Polygon/Polyline rendering (`{...&& <Polygon />}`)
- [ ] No new dynamic keys that include props (`key={bus.id}-${bus.lat}`)
- [ ] All markers use `opacity` hiding instead of conditional mounting
- [ ] Live bus data doesn't trigger `deferredActiveRoute` updates
- [ ] Route toggle goes through batching timeout (0ms `setDeferredActiveRoute`)
- [ ] `tracksViewChanges={false}` on markers that don't need live updates
- [ ] Console logs check: no spike in `[BusStopsVisibility]` messages during pan
- [ ] Frame rate stable (use React Native FPS indicator) during zoom/pan

---

## Future Architectural Changes

If you need to add new overlay layers (e.g., bike paths, congestion, etc.):

1. **Add to stable children order** (before live buses):
   ```typescript
   <MapView>
     {/* ... existing polygons ... */}
     
     {/* NEW: Bike path layer (always mounted, visibility via opacity) */}
     {bikePaths.map((path) => (
       <Polyline
         key={`bike-${path.id}`}  // Stable key
         coordinates={path.coords}
         strokeColor={shouldShowBikePaths ? '#00AA00' : 'transparent'}
         strokeWidth={shouldShowBikePaths ? 2 : 0}
       />
     ))}
     
     {/* ... live buses at END ... */}
   </MapView>
   ```

2. **Use visibility properties**, not conditional mounting:
   ```typescript
   const shouldShowBikePaths = mapFilters?.['bike-paths'] ?? false;
   ```

3. **Test with rapid filter toggles**: If crashes occur, you've broken stable ordering

---

## Resources

- **File**: `src/components/interactive-map.native.tsx` (3117 lines)
- **Architecture Doc**: `MAP_PERFORMANCE_FIXES.md` (this directory)
- **Test Plan**: See "Testing Checklist" in architecture doc
- **Crash Prevention**: See "CRITICAL: MapView Children Stable Ordering" comment (line ~2305)

---

## Questions?

1. Check console logs for context (`[RouteToogle]`, `[ZoomGesture]`, etc.)
2. Review relevant section in `MAP_PERFORMANCE_FIXES.md`
3. Look at the architectural overview at top of `interactive-map.native.tsx` (lines 1-59)
