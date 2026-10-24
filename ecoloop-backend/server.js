require('dotenv').config();

const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// C++ routing engine binary produced by CMake (route-engine/README.md has build steps)
const ENGINE_BIN = path.resolve(__dirname, '../route-engine/build/src/waste_router_cli');
const ENGINE_TIMEOUT_MS = 12000;

// Mapbox Directions Matrix API — max coordinates per request
const MAPBOX_MAX_COORDS = 25;
const MAPBOX_MATRIX_URL = 'https://api.mapbox.com/directions-matrix/v1/mapbox/driving/';
const MAPBOX_TIMEOUT_MS = 8000;

// Middleware — the client sends only nodes and vehicles; the distance matrix is
// built here, so payloads stay in the low kilobytes
app.use(cors());
app.use(express.json({ limit: '256kb' }));

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

async function fetchMapboxMatrix(coords, token) {
  const coordStr = coords.map((c) => `${c[0]},${c[1]}`).join(';');
  const url = `${MAPBOX_MATRIX_URL}${coordStr}?annotations=distance,duration&access_token=${token}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(MAPBOX_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`Mapbox responded ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data.distances) || data.distances.length !== coords.length) {
    throw new Error('Mapbox returned a malformed matrix');
  }
  return data;
}

/**
 * Builds the engine's `edges` array (both directions) for the given nodes.
 *
 * Road distances come from the Mapbox Directions Matrix API when a token is
 * configured: one request for up to 25 coordinates; for larger node sets the
 * stops are chunked (depot included in every chunk) and cross-chunk pairs fall
 * back to haversine. Without a token — or on any API failure — everything falls
 * back to haversine straight lines so the optimizer still solves.
 *
 * @returns {{ edges: Array, source: 'mapbox'|'mapbox+partial'|'haversine' }}
 */
async function buildEdges(nodes) {
  const n = nodes.length;
  const dist = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      i === j ? 0 : haversineMeters(nodes[i].lat, nodes[i].lon, nodes[j].lat, nodes[j].lon)
    )
  );
  const duration = Array.from({ length: n }, () => new Array(n).fill(0));

  const applyMatrix = (indices, data) => {
    for (let a = 0; a < indices.length; a++) {
      for (let b = 0; b < indices.length; b++) {
        if (a === b) continue;
        const i = indices[a];
        const j = indices[b];
        const d = data.distances?.[a]?.[b];
        const t = data.durations?.[a]?.[b];
        if (Number.isFinite(d) && d !== null && d >= 0) {
          dist[i][j] = Math.round(d);
          if (Number.isFinite(t) && t !== null && t > 0) {
            duration[i][j] = t;
          }
        }
      }
    }
  };

  let source = 'haversine';
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token || n < 2) {
    return finishEdges(nodes, dist, duration, source);
  }

  try {
    if (n <= MAPBOX_MAX_COORDS) {
      const data = await fetchMapboxMatrix(
        nodes.map((nd) => [Number(nd.lon), Number(nd.lat)]),
        token
      );
      applyMatrix(nodes.map((_, i) => i), data);
      source = 'mapbox';
    } else {
      // Chunked requests: depot (index 0 assumed) joins every chunk so every
      // route's depot legs use road distances; cross-chunk pairs stay haversine
      source = 'mapbox+partial';
      const depotIdx = 0;
      const chunkSize = MAPBOX_MAX_COORDS - 1;
      for (let start = 1; start < n; start += chunkSize) {
        const chunk = [];
        for (let i = start; i < Math.min(start + chunkSize, n); i++) chunk.push(i);
        const indices = [depotIdx, ...chunk];
        const data = await fetchMapboxMatrix(
          indices.map((i) => [Number(nodes[i].lon), Number(nodes[i].lat)]),
          token
        );
        applyMatrix(indices, data);
      }
    }
  } catch (err) {
    console.warn('[server] Mapbox matrix unavailable, using haversine fallback:', err.message);
    // dist/duration already hold the haversine baseline
  }

  return finishEdges(nodes, dist, duration, source);
}

function finishEdges(nodes, dist, duration, source) {
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const meters = dist[i][j];
      const seconds = duration[i][j];
      const speed = seconds > 0 ? meters / seconds : 10.0;
      edges.push({
        from: nodes[i].id,
        to: nodes[j].id,
        distance_m: meters,
        speed_mps: Math.min(33.33, Math.max(1.0, Number(speed.toFixed(2))))
      });
    }
  }
  return { edges, source };
}

// POST /api/optimize endpoint
app.post('/api/optimize', async (req, res) => {
  console.log('[server] POST /api/optimize received. Request body keys:', Object.keys(req.body));

  if (!fs.existsSync(ENGINE_BIN)) {
    console.error(`[server] Route engine binary not found at ${ENGINE_BIN}`);
    return res.status(500).json({
      error: 'Route engine binary not found. Build it first — see route-engine/README.md'
    });
  }

  // Distance matrix: client-supplied edges win (compat); otherwise built here
  let edges = Array.isArray(req.body.edges) ? req.body.edges : null;
  let distanceSource = 'client';
  if (!edges || edges.length === 0) {
    const inputNodes = Array.isArray(req.body.nodes) ? req.body.nodes : [];
    if (inputNodes.length === 0) {
      return res.status(400).json({ error: 'Payload must include a "nodes" array' });
    }
    try {
      const built = await buildEdges(inputNodes);
      edges = built.edges;
      distanceSource = built.source;
    } catch (err) {
      console.error('[server] Failed to build distance matrix:', err);
      return res.status(500).json({ error: 'Failed to build distance matrix', details: err.message });
    }
  }

  const enginePayload = { ...req.body, edges };
  const inputData = JSON.stringify(enginePayload);
  console.log(`[server] Solving with ${edges.length} edges (distance source: ${distanceSource})`);

  const engineProcess = spawn(ENGINE_BIN);

  let outputData = '';
  let errorData = '';

  // Watchdog: the engine normally finishes in well under a second; a hang
  // (e.g. a pathological payload) must not hold the request open forever
  const engineTimeout = setTimeout(() => {
    engineProcess.kill('SIGKILL');
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Routing engine timed out',
        details: `Engine produced no result within ${ENGINE_TIMEOUT_MS} ms`
      });
    }
  }, ENGINE_TIMEOUT_MS);

  // Pipe the payload into the spawned process's stdin
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
    clearTimeout(engineTimeout);
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

    // ── Build a node-id → [lat, lon] lookup from the input payload ─────────
    // The C++ engine accepts nodes as { id, lat, lon, ... } and returns
    // routes[].stops as an ordered array of NodeId integers. Each route keeps
    // its own ordered waypoints so the map can draw one polyline per vehicle.
    const inputNodes = Array.isArray(req.body.nodes) ? req.body.nodes : [];
    const nodeMap = {};
    for (const nd of inputNodes) {
      if (nd.id !== undefined) {
        nodeMap[nd.id] = [
          typeof nd.lat === 'number' ? nd.lat : 0,
          typeof nd.lon === 'number' ? nd.lon : 0
        ];
      }
    }

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
      total_fleet_duration_s: result.total_fleet_duration_s,
      distance_source: distanceSource
    };

    console.log(`[server] Responding with ${routes.length} route(s), ` +
      `${normalized.unserved_stops.length} unserved stop(s).`);
    return res.json(normalized);
  });
});

// Demo scenario seed (Patiala wards + processing facilities)
app.get('/api/scenario', (req, res) => {
  try {
    const scenario = JSON.parse(fs.readFileSync(path.join(__dirname, 'scenarios/patiala.json'), 'utf8'));
    return res.json(scenario);
  } catch (err) {
    console.error('[server] Failed to load scenario:', err);
    return res.status(500).json({ error: 'Failed to load scenario seed' });
  }
});

app.listen(PORT, () => {
  console.log(`EcoLoop API Bridge running on port ${PORT} ` +
    `(Mapbox matrix ${process.env.MAPBOX_ACCESS_TOKEN ? 'enabled' : 'NOT configured — haversine fallback'})`);
});

module.exports = app;
