# Bus Stop Field Reference

## ⚠️ CRITICAL: Which field to use for API calls

The `BusStop` type has multiple name fields. **Use the CORRECT field** to avoid API errors!

### Field Breakdown

```typescript
{
  name: "UHC-OPP",                        // ✅ USE THIS for /ShuttleService API calls
  caption: "Opp University Health Centre", // ✅ USE THIS for display in UI
  ShortName: "Opp UHC",                   // ❌ DO NOT use for API (has spaces!)
  LongName: "Opp University Health Centre" // Display only
}
```

### Examples

| Bus Stop | `name` (API) | `caption` (UI Display) | `ShortName` (Display) |
|----------|-------------|----------------------|---------------------|
| Central Library | `CLB` | Central Library | CLB |
| Yusof Ishak House | `YIH` | Yusof Ishak House | YIH |
| Opp UHC | `UHC-OPP` | Opp University Health Centre | Opp UHC ⚠️ |
| PGP | `PGP` | Prince George's Park | PGP |
| Kent Ridge MRT | `KR-MRT` | Kent Ridge MRT | KR MRT ⚠️ |

### Common Mistakes

❌ **WRONG** - Using ShortName:
```tsx
useShuttleService(stop.ShortName) // "Opp UHC" → API Error!
```

✅ **CORRECT** - Using name:
```tsx
useShuttleService(stop.name) // "UHC-OPP" → Works!
```

### API Endpoints

| Endpoint | Parameter | Use Field |
|----------|-----------|-----------|
| `/ShuttleService` | `busstopname` | `stop.name` |
| `/PickupPoint` | `route_code` | Route code |
| `/ActiveBus` | `route_code` | Route code |

### Rule of Thumb

- **API calls**: Always use `stop.name` 
- **User display**: Always use `stop.caption`
- **Never use**: `stop.ShortName` or `stop.LongName` for API calls

## Testing

To verify a bus stop code works:

```powershell
# Test the API
$cred = [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes("NUSnextbus:13dL?zY,3feWR^`"T"))
Invoke-RestMethod -Uri "https://nnextbus.nus.edu.sg/ShuttleService?busstopname=UHC-OPP" -Headers @{Authorization="Basic $cred"}
```

Expected result: JSON response with shuttle data  
Error result: "Bus stop not found!"
