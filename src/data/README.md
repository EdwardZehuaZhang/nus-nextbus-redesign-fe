# Route Checkpoints Data

This directory contains a local backup of NUS NextBus route checkpoint data.

## Files

### `route-checkpoints.json`
Contains GPS checkpoint coordinates for all bus routes (A1, A2, D1, D2, E, K, L).

**Data structure:**
```json
{
  "A1": [
    {
      "PointID": "1",
      "latitude": 1.294046,
      "longitude": 103.769727,
      "routeid": 90287
    },
    ...
  ],
  "D1": [...],
  ...
}
```

**Route Statistics:**
- A1: 516 checkpoints
- A2: 593 checkpoints
- D1: 491 checkpoints
- D2: 751 checkpoints
- E: 334 checkpoints
- K: 681 checkpoints
- L: 261 checkpoints

## Usage

The application automatically uses this data as a fallback when the API is unavailable.

**Priority:**
1. Live API data (preferred)
2. Local JSON backup (fallback)

## Updating

To refresh the checkpoint data, run:

```powershell
.\fetch-routes.ps1
```

This script fetches the latest checkpoint data from the NUS NextBus API and saves it to `route-checkpoints.json`.

## Last Updated

Generated on: October 25, 2025

## Data Source

NUS NextBus API: `https://nnextbus.nus.edu.sg/CheckPoint?route_code={route}`
