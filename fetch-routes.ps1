# Script to fetch all bus route checkpoints and save as JSON backup
$cred = [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes("NUSnextbus:13dL?zY,3feWR^`"T"))
$headers = @{Authorization="Basic $cred"}
$routes = @('A1', 'A2', 'D1', 'D2', 'BTC', 'E', 'K', 'L')
$allRoutes = @{}

foreach ($route in $routes) {
    try {
        Write-Host "Fetching $route..."
        $response = Invoke-RestMethod -Uri "https://nnextbus.nus.edu.sg/CheckPoint?route_code=$route" -Headers $headers
        $allRoutes[$route] = $response.CheckPointResult.CheckPoint
        Write-Host "✓ Fetched $route - $($response.CheckPointResult.CheckPoint.Count) points"
    }
    catch {
        Write-Host "✗ Failed $route - $($_.Exception.Message)"
    }
}

# Save to JSON
$json = $allRoutes | ConvertTo-Json -Depth 10
$json | Out-File -FilePath ".\src\data\route-checkpoints.json" -Encoding UTF8
Write-Host "`nSaved all routes to src\data\route-checkpoints.json"
