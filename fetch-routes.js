#!/usr/bin/env node
// Script to fetch all bus route checkpoints and save as JSON backup
const https = require('https');
const fs = require('fs');
const path = require('path');

const BACKEND_API = 'https://nus-nextbus-redesign-be.onrender.com';
const routes = ['A1', 'A2', 'D1', 'D2', 'K', 'R1', 'R2', 'P']; // Removed: E, BTC, L
const allRoutes = {};

function fetchRoute(routeCode) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'nus-nextbus-redesign-be.onrender.com',
      path: `/api/bus/checkpoint?route_code=${routeCode}`,
      method: 'GET',
      headers: {}
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const checkpoints = json?.CheckPointResult?.CheckPoint || [];
          resolve({
            routeCode,
            success: true,
            checkpoints,
            count: checkpoints.length
          });
        } catch (e) {
          reject({ routeCode, error: data || e.message });
        }
      });
    });

    req.on('error', (e) => {
      reject({ routeCode, error: e.message });
    });

    req.end();
  });
}

async function fetchAllRoutes() {
  console.log('Fetching route checkpoints from NUS NextBus API...\n');
  
  for (const route of routes) {
    try {
      console.log(`Fetching ${route}...`);
      const result = await fetchRoute(route);
      allRoutes[route] = result.checkpoints;
      console.log(`✓ Fetched ${route} - ${result.count} points`);
    } catch (e) {
      console.log(`✗ Failed ${route} - ${e.error}`);
    }
  }
  
  // Save to JSON files
  const json = JSON.stringify(allRoutes, null, 2);
  
  // Save to root directory
  const rootPath = path.join(__dirname, 'route-checkpoints.json');
  fs.writeFileSync(rootPath, json, 'utf8');
  console.log(`\n✅ Saved to ${rootPath}`);
  
  // Save to src/data directory
  const dataPath = path.join(__dirname, 'src', 'data', 'route-checkpoints.json');
  fs.writeFileSync(dataPath, json, 'utf8');
  console.log(`✅ Saved to ${dataPath}`);
  
  // Print summary
  console.log('\n📊 Summary:');
  console.log(`Total routes: ${Object.keys(allRoutes).length}`);
  const totalPoints = Object.values(allRoutes).reduce((sum, points) => sum + points.length, 0);
  console.log(`Total checkpoints: ${totalPoints}`);
  console.log('\nRoutes included: ' + Object.keys(allRoutes).join(', '));
  console.log('Routes removed: E, BTC, L (discontinued)');
}

fetchAllRoutes().catch(console.error);
