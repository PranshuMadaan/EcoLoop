const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// C++ routing engine binary produced by CMake (route-engine/README.md has build steps)
const ENGINE_BIN = path.resolve(__dirname, '../route-engine/build/src/waste_router_cli');

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// POST /api/optimize endpoint
app.post('/api/optimize', (req, res) => {
  const inputData = JSON.stringify(req.body);

  console.log('[server] POST /api/optimize received. Request body keys:', Object.keys(req.body));

  if (!fs.existsSync(ENGINE_BIN)) {
    console.error(`[server] Route engine binary not found at ${ENGINE_BIN}`);
    return res.status(500).json({
      error: 'Route engine binary not found. Build it first — see route-engine/README.md'
    });
  }

  const engineProcess = spawn(ENGINE_BIN);

  let outputData = '';
  let errorData = '';

  // Watchdog: the engine normally finishes in well under a second; a hang
  // (e.g. a pathological payload) must not hold the request open forever
  const ENGINE_TIMEOUT_MS = 12000;
  const engineTimeout = setTimeout(() => {
    engineProcess.kill('SIGKILL');
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Routing engine timed out',
        details: `Engine produced no result within ${ENGINE_TIMEOUT_MS} ms`
      });
    }
  }, ENGINE_TIMEOUT_MS);

  // Pipe req.body as a stringified JSON into the spawned process's stdin
  engineProcess.stdin.write(inputData);
  engineProcess.stdin.end();

  // Capture stdout
  engineProcess.stdout.on('data', (data) => {
    outputData += data.toString();
  });

  // Capture stderr for error handling
  engineProcess.stderr.on('data', (data) => {
    errorData += data.toString();
  });

  // Handle spawn and process errors
  engineProcess.on('error', (err) => {
    console.error('[server] Failed to spawn routing engine process:', err);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Failed to execute routing engine process',
        details: err.message
      });
    }
  });

  // Handle process completion
  engineProcess.on('close', (code) => {
    clearTimeout(engineTimeout);
    if (res.headersSent) return;

    if (code !== 0) {
      console.error(`[server] C++ Routing Engine exited with code ${code}:`, errorData);
      return res.status(500).json({
        error: 'Routing engine failed',
        details: errorData || `Process exited with code ${code}`
      });
    }

    let result;
    try {
      result = JSON.parse(outputData);
    } catch (parseErr) {
      console.error('[server] Failed to parse C++ stdout as JSON. Raw output:', outputData, parseErr);
      return res.status(500).json({
        error: 'Failed to parse C++ output',
        details: outputData
      });
    }

    // ── Inspect raw output ──────────────────────────────────────────────────
    console.log('[server] Raw C++ engine output keys:', Object.keys(result));
    console.log('[server] Raw C++ engine output:', JSON.stringify(result, null, 2));

    // ── Build a node-id → [lat, lon] lookup from the input payload ─────────
    // The C++ engine accepts nodes as { id, lat, lon, ... } and returns
    // routes[].stops as an ordered array of NodeId integers. Each route keeps
    // its own ordered waypoints so the map can draw one polyline per vehicle.
    const inputNodes = Array.isArray(req.body.nodes) ? req.body.nodes : [];
    const nodeMap = {};
    for (const n of inputNodes) {
      if (n.id !== undefined) {
        nodeMap[n.id] = [
          typeof n.lat === 'number' ? n.lat : 0,
          typeof n.lon === 'number' ? n.lon : 0
        ];
      }
    }
    console.log(`[server] Input node map built: ${Object.keys(nodeMap).length} nodes`);

    const engineRoutes = Array.isArray(result.routes) ? result.routes : [];
    const routes = engineRoutes.map((route) => ({
      vehicle_id: route.vehicle_id,
      stops: route.stops || [],
      distance_m: route.distance_m,
      duration_s: route.duration_s,
      waypoints: (route.stops || [])
        .filter((stopId) => nodeMap[stopId] !== undefined)
        .map((stopId) => nodeMap[stopId])
    }));

    const normalized = {
      routes,
      unserved_stops: Array.isArray(result.unserved_stops) ? result.unserved_stops : [],
      total_fleet_distance_m: result.total_fleet_distance_m,
      total_fleet_duration_s: result.total_fleet_duration_s
    };

    console.log(`[server] Responding with ${routes.length} route(s), ` +
      `${normalized.unserved_stops.length} unserved stop(s).`);
    return res.json(normalized);
  });
});

app.listen(PORT, () => {
  console.log(`EcoLoop API Bridge running on port ${PORT}`);
});

module.exports = app;