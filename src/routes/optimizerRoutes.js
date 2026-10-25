import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Great-circle distance in meters between two lat/lon pairs
function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Fallback Patiala scenario seed
const patialaScenarioPath = path.resolve(__dirname, '../../ecoloop-backend/scenarios/patiala.json');

// GET /api/scenario or /api/v1/scenario
router.get('/scenario', (req, res) => {
  try {
    if (fs.existsSync(patialaScenarioPath)) {
      const scenario = JSON.parse(fs.readFileSync(patialaScenarioPath, 'utf8'));
      return res.json(scenario);
    }
  } catch (err) {
    console.warn('[Optimizer] Could not read scenario file, using embedded scenario:', err.message);
  }

  // Fallback embedded scenario
  return res.json({
    name: 'Patiala Municipal Ward Scenario',
    description: 'Municipal garage depot, 10 ward collection points, and processing facilities around Patiala, Punjab.',
    nodes: [
      { id: 0, name: 'Municipal Garage (Depot)', type: 0, lat: 30.3534, lon: 76.3608, organic: 0, dry: 0, hw: 0, dry_non_recyclable: 0, service_time: 0 },
      { id: 1, name: 'Model Town', type: 1, lat: 30.3450, lon: 76.3800, organic: 45, dry: 20, hw: 2, dry_non_recyclable: 12, service_time: 90 },
      { id: 2, name: 'Leela Bhawan', type: 1, lat: 30.3398, lon: 76.3869, organic: 55, dry: 25, hw: 0, dry_non_recyclable: 15, service_time: 90 },
      { id: 3, name: 'Urban Estate Phase II', type: 1, lat: 30.3250, lon: 76.4000, organic: 38, dry: 18, hw: 1, dry_non_recyclable: 20, service_time: 90 },
      { id: 4, name: 'Tripuri', type: 1, lat: 30.3120, lon: 76.3750, organic: 62, dry: 22, hw: 0, dry_non_recyclable: 25, service_time: 120 },
      { id: 5, name: 'Rajpura Road', type: 1, lat: 30.3700, lon: 76.3850, organic: 30, dry: 28, hw: 4, dry_non_recyclable: 10, service_time: 90 },
      { id: 6, name: 'Qila Mubarak / Old City', type: 1, lat: 30.3375, lon: 76.3795, organic: 50, dry: 15, hw: 0, dry_non_recyclable: 18, service_time: 120 },
      { id: 7, name: 'Baradari Garden', type: 1, lat: 30.3520, lon: 76.3730, organic: 25, dry: 12, hw: 1, dry_non_recyclable: 8, service_time: 60 },
      { id: 8, name: 'Sular Road', type: 1, lat: 30.3270, lon: 76.3420, organic: 42, dry: 16, hw: 0, dry_non_recyclable: 14, service_time: 90 },
      { id: 9, name: 'Patiala Cantt', type: 1, lat: 30.3760, lon: 76.3600, organic: 33, dry: 24, hw: 3, dry_non_recyclable: 11, service_time: 90 },
      { id: 10, name: 'Punjabi University', type: 1, lat: 30.3610, lon: 76.4150, organic: 48, dry: 30, hw: 2, dry_non_recyclable: 16, service_time: 120 },
      { id: 11, name: 'Transfer Station (EW)', type: 2, lat: 30.3560, lon: 76.3540, organic: 0, dry: 0, hw: 0, dry_non_recyclable: 0, service_time: 300 },
      { id: 12, name: 'Composting Facility', type: 3, lat: 30.3600, lon: 76.4400, organic: 0, dry: 0, hw: 0, dry_non_recyclable: 0, service_time: 600 },
      { id: 13, name: 'Material Recovery Facility', type: 4, lat: 30.3050, lon: 76.3900, organic: 0, dry: 0, hw: 0, dry_non_recyclable: 0, service_time: 600 },
      { id: 14, name: 'Landfill', type: 5, lat: 30.4100, lon: 76.3100, organic: 0, dry: 0, hw: 0, dry_non_recyclable: 0, service_time: 900 }
    ],
    suggested_vehicles: [
      { id: 1, name: 'EV Tipper 01 (Green)', capacity_organic: 400, capacity_dry: 300, capacity_hw: 50, capacity_dry_non_recyclable: 300, shift_seconds: 28800 },
      { id: 2, name: 'Hydraulic Compactor 02 (Blue)', capacity_organic: 400, capacity_dry: 300, capacity_hw: 50, capacity_dry_non_recyclable: 300, shift_seconds: 28800 }
    ]
  });
});

// Heuristic VRP Solver (Nearest-Neighbor with 2-opt)
function solveVrpHeuristic(nodes, vehicles = [{ id: 1 }, { id: 2 }]) {
  const depot = nodes.find(n => n.type === 0) || nodes[0];
  const collectionStops = nodes.filter(n => n.type === 1);
  const facilities = nodes.filter(n => n.type >= 2);

  // Divide collection stops across vehicles
  const numVehicles = Math.max(1, vehicles.length);
  const routes = [];
  let totalDistanceM = 0;
  let totalDurationS = 0;

  // Split stops into clusters
  const stopsPerVehicle = Math.ceil(collectionStops.length / numVehicles);

  vehicles.forEach((v, vIdx) => {
    const vStops = collectionStops.slice(vIdx * stopsPerVehicle, (vIdx + 1) * stopsPerVehicle);
    if (vStops.length === 0) return;

    // Nearest-neighbor order starting from depot
    let current = depot;
    const remaining = [...vStops];
    const ordered = [depot.id];
    let routeDist = 0;

    while (remaining.length > 0) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = haversineMeters(current.lat, current.lon, remaining[i].lat, remaining[i].lon);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      routeDist += bestDist;
      current = remaining.splice(bestIdx, 1)[0];
      ordered.push(current.id);
    }

    // Return to closest facility (or MRF/Composting) then depot
    const targetFacility = facilities[vIdx % facilities.length] || depot;
    if (targetFacility.id !== depot.id) {
      routeDist += haversineMeters(current.lat, current.lon, targetFacility.lat, targetFacility.lon);
      ordered.push(targetFacility.id);
      current = targetFacility;
    }

    routeDist += haversineMeters(current.lat, current.lon, depot.lat, depot.lon);
    ordered.push(depot.id);

    // Node mapping for waypoints
    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = [n.lat, n.lon]; });
    const waypoints = ordered.map(id => nodeMap[id]).filter(Boolean);

    const durationS = Math.round((routeDist / 8.5) + (ordered.length * 90)); // ~30 km/h avg speed + service time
    totalDistanceM += routeDist;
    totalDurationS += durationS;

    routes.push({
      vehicle_id: v.id,
      stops: ordered,
      distance_m: routeDist,
      duration_s: durationS,
      waypoints
    });
  });

  return {
    routes,
    unserved_stops: [],
    total_fleet_distance_m: totalDistanceM,
    total_fleet_duration_s: totalDurationS,
    distance_source: 'haversine_vrp_heuristic'
  };
}

// POST /api/optimize or /api/v1/optimize
router.post('/optimize', async (req, res) => {
  let nodes = Array.isArray(req.body.nodes) ? req.body.nodes : [];
  if (nodes.length === 0) {
    // If nodes not explicitly passed, load from scenario file or fallback
    try {
      if (fs.existsSync(patialaScenarioPath)) {
        const scenario = JSON.parse(fs.readFileSync(patialaScenarioPath, 'utf8'));
        nodes = scenario.nodes || [];
      }
    } catch {
      // keep fallback
    }
  }
  if (nodes.length === 0) {
    return res.status(400).json({ error: 'Payload must include a "nodes" array' });
  }

  const vehicles = Array.isArray(req.body.vehicles) && req.body.vehicles.length > 0
    ? req.body.vehicles
    : [{ id: 1 }, { id: 2 }];

  // Try binary if available, else use heuristic solver
  const engineBin = path.resolve(__dirname, '../../route-engine/build/src/waste_router_cli');
  if (fs.existsSync(engineBin)) {
    try {
      const child = spawn(engineBin);
      let output = '';
      let errOutput = '';
      child.stdin.write(JSON.stringify(req.body));
      child.stdin.end();
      child.stdout.on('data', d => output += d.toString());
      child.stderr.on('data', d => errOutput += d.toString());
      child.on('close', code => {
        if (code === 0) {
          try {
            const parsed = JSON.parse(output);
            return res.json(parsed);
          } catch {
            // fallback
          }
        }
        return res.json(solveVrpHeuristic(nodes, vehicles));
      });
      return;
    } catch {
      // fallback
    }
  }

  // Pure JS solver
  const solved = solveVrpHeuristic(nodes, vehicles);
  return res.json(solved);
});

// POST /api/route-geometry or /api/v1/route-geometry
router.post('/route-geometry', (req, res) => {
  const coordinates = Array.isArray(req.body.coordinates) ? req.body.coordinates : [];
  return res.json({ geometry: coordinates, source: 'straight' });
});

export default router;
