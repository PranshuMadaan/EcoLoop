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
    // routes[].stops as an ordered array of NodeId integers.
    // We reconstruct [lat, lon] waypoints by joining stop IDs → input nodes.
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

    // Flatten all stops across all routes into an ordered [lat, lon] array
    const routes = Array.isArray(result.routes) ? result.routes : [];

    let optimized_waypoints = routes.flatMap((route) =>
      (route.stops || [])
        .filter((stopId) => nodeMap[stopId] !== undefined)
        .map((stopId) => nodeMap[stopId])
    );

    // If the engine returned routes with stops but we have no node map (e.g.
    // the caller did not send a nodes array), surface the raw stop IDs so the
    // frontend still gets a non-empty signal and can handle it.
    if (optimized_waypoints.length === 0 && routes.some((r) => r.stops && r.stops.length > 0)) {
      console.warn('[server] Routes have stops but no lat/lon node map was found in the request. ' +
        'Include a "nodes" array with { id, lat, lon } in your payload for coordinate mapping.');
    }

    const normalized = {
      optimized_waypoints,            // [[lat, lon], ...] – what the React map needs
      routes: result.routes,          // raw route objects with node IDs and metrics
      total_fleet_distance_m: result.total_fleet_distance_m,
      total_fleet_duration_s: result.total_fleet_duration_s
    };

    console.log(`[server] Responding with ${optimized_waypoints.length} waypoints across ${routes.length} route(s).`);
    return res.json(normalized);
  });
});

app.listen(PORT, () => {
  console.log(`EcoLoop API Bridge running on port ${PORT}`);
});

module.exports = app;