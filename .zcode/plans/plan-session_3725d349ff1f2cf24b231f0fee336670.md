# EcoLoop Route Optimizer — Build & Fix Plan

Decisions applied: **Mapbox Matrix API** for road distances · **time windows deferred** · **fallback simulation removed** · **engine folded into main repo**.

Work is split into 6 parts, each independently committable and verifiable. Order matters: Part 0 → 1 → 2 → 3 → 4 → 5. Part 6 is deferred documentation only.

---

## PART 0 — Repo consolidation & runtime hygiene (no behavior change)

**Goal:** the repo clones and runs from scratch; the C++ engine is actually in git.

1. **Fold engine into main repo**
   - `git rm route-engine` (tracked dangling symlink, committed in 1a5eda2).
   - Move `optimise routes/*` → `route-engine/` as plain files; **delete the nested `.git`** inside it (its separate history is discarded, per your choice).
   - Delete stray empty dir `route-optimiser/` at repo root and the vestigial 3-line stub `ecoloop-app/OptimizerPage.jsx` (imported by nothing).
2. **Stop committing node_modules**
   - `git rm -r --cached ecoloop-backend/node_modules` (593 tracked files; `.gitignore` already covers `node_modules/`). Root `node_modules/` belongs to the main marketplace app — left untouched.
3. **Ignore engine build artifacts**: add `route-engine/build/` and `.cache/` to `.gitignore`.
4. **Robust binary path**: in `ecoloop-backend/server.js` replace the CWD-relative `'../route-engine/build/optimise-routes'` with `path.resolve(__dirname, '../route-engine/build/src/waste_router_cli')` (the real binary — the `optimise-routes` symlink is manual, not created by CMake, so don't depend on it). Return a clear 500 ("route engine binary not found — see route-engine/README.md") if missing.
5. **Scripts & docs**
   - `ecoloop-backend/package.json`: add `"start": "node server.js"` and `"engines": { "node": ">=18" }` (global `fetch` needed in Part 3).
   - New `route-engine/README.md`: build steps (`cmake -B build && cmake --build build`), run tests (`ctest --test-dir build`), stdin/stdout JSON contract.
   - Short run section in `ecoloop-app/README.md` (currently stock Vite template): `npm i`, `npm run dev`, plus backend `npm start`.

**Verify:** `git clone` the branch to `/tmp`, build engine, `npm i && npm start` in backend, `curl -X POST localhost:3000/api/optimize` with the 5-node sample payload → route JSON.
**Commit:** `chore: fold route engine into repo, untrack node_modules, fix binary path`.

---

## PART 1 — C++ engine correctness fixes

**Goal:** kill the confirmed infinite-loop hang, report unserved stops, add e-waste sink, return-to-depot. All with Catch2 regression tests (framework is Catch2 v3 via FetchContent, tests auto-registered via `catch_discover_tests`).

1. **Fix overflow infinite loop** — `route-engine/src/initial_builder.cpp:111-140`
   Current bug: on capacity overflow with no reachable disposal sink, state never changes → infinite loop (reproduced: 25+30 kg organic vs 50 kg cap hangs forever).
   Fix: track whether disposal actually succeeded (`reset_load` called). If overflow remains afterward:
   - If another vehicle remains: finalize current route (append terminal sink if any, then depot), advance `vehicle_idx`, let the next vehicle retry the stop.
   - If last vehicle: erase the stop from `unassigned_stops` and record it in a new `solution.unserved_stops`, continue with the next-nearest stop.
   Either branch guarantees progress → termination.
2. **Unserved reporting**: add `std::vector<NodeId> unserved_stops` to `FleetSolution` (`include/routing/solution.hpp`) and emit `"unserved_stops": [...]` in `WasteRouteIO::export_solution` (`src/io.cpp`).
3. **E-waste sink**: in `node.hpp` `is_sink_for`, make `NodeType::TransferStation` (type 2) a sink for `HazardousEwaste` (currently *no* node type accepts e-waste, so hw overflow would hang even with facilities present).
4. **Return-to-depot**: append the starting depot as the final stop at all three route-finalization sites in `initial_builder.cpp` (shift handoff, loop exit, last-vehicle finalize), deduped if already last. Safe under optimization: the 2-opt (`optimizer.cpp`) and relocate/swap operators (`fleet_optimizer.cpp`) only touch intermediate indices, so endpoints stay pinned.
5. **Tests** (new cases alongside the existing 10):
   - overflow + no facilities + 1 vehicle → terminates, stop reported unserved
   - overflow + no facilities + 2 vehicles → handoff to vehicle 2
   - TransferStation accepts hazardous e-waste disposal
   - every route starts **and** ends at the depot

**Verify:** re-run the hang repro payload → process exits with `unserved_stops`. `ctest --test-dir route-engine/build` all green.
**Commit:** `fix(engine): terminate on unserviceable overflow, e-waste sink, depot return, unserved reporting`.

---

## PART 2 — Multi-vehicle end-to-end + honest failure UX

**Goal:** the engine's existing multi-vehicle capability becomes visible and drivable from the map; no more fake routes.

1. **Backend response shape** — `ecoloop-backend/server.js`
   Replace the `routes.flatMap(...)` flattening with per-route output:
   ```json
   { "routes": [ { "vehicle_id": 1, "stops": [0,3,1], "waypoints": [[lat,lon],...],
                  "distance_m": 9700, "duration_s": 1210 } ],
     "total_fleet_distance_m": …, "total_fleet_duration_s": …,
     "unserved_stops": [7,9] }
   ```
   Drop `optimized_waypoints` (clean break — frontend updated in same part).
2. **Frontend fleet editor** — `ecoloop-app/src/OptimizerPage.jsx`
   - Replace the hardcoded single `initialVehicles` and `vehicles[0]`-only inputs with an editable fleet list: add/remove truck buttons; per-truck inputs for `capacity_organic/dry/hw/dry_non_recyclable` + `shift_seconds`. All vehicles sent in the payload.
3. **Visual fleet segregation**
   - Render one `<Polyline>` per `data.routes` entry, color from a fixed palette (`['#2563eb','#16a34a','#d97706','#7c3aed','#dc2626','#0891b2']`) keyed by route order.
   - Legend card per truck: color swatch, stops count, distance km, duration min. Unserved stops → red circle markers + alert chip "N stops could not be served".
4. **Remove the fallback simulation** (your decision)
   - Delete `fallbackCoordinates` and the catch-branch that draws it. On error/timeout: keep the last successful polylines, show error alert with the reason (`data.error`, engine stderr detail, or timeout). Raise the fetch timeout 5 s → 15 s.

**Verify:** 2–3 trucks, ~15 clicked stops → distinct colored polylines starting/ending at depot; sum of per-route stops = nodes − 1; kill the C++ path → error alert, no green line drawn.
**Commit:** `feat: multi-vehicle fleet UI, per-route colored output, remove fallback simulation`.

---

## PART 3 — Mapbox road-distance matrix on the backend

**Goal:** real Patiala road distances; frontend sends only coordinates; payload shrinks back to KBs.

1. **Backend matrix builder** — `ecoloop-backend/server.js`
   - Accept the lightweight payload: `{ depot_id, nodes[{id,type,lat,lon,organic,dry,hw,dry_non_recyclable,service_time}], vehicles[], unassigned_stops }` — no `edges`.
   - Call Mapbox Directions Matrix API: `GET https://api.mapbox.com/directions-matrix/v1/mapbox/driving/{lon,lat;...}?annotations=distance,duration&access_token=…` (Node 18 `fetch`, 8 s timeout).
   - **25-coordinate per-request cap**: if ≤ 25 coords → single call; else partition stops into chunks (depot included in each), intra-chunk pairs from Mapbox, inter-chunk pairs haversine, and set `distance_source: "mapbox+partial"`. Full haversine fallback on any failure → `"haversine"`. Single clean call → `"mapbox"`.
   - Synthesize the engine's `edges[]` (both directions): `distance_m` from Mapbox, `speed_mps = distance/duration` (guard ÷0 → 10). Engine stdin/stdout contract unchanged.
   - `distance_source` added to the response.
2. **Credentials**: `MAPBOX_ACCESS_TOKEN` in `ecoloop-backend/.env` (already gitignored); commit a `.env.example`; add `dotenv` dependency (only dep addition).
3. **Frontend**: delete `calculateHaversineDistanceMeters` + `generateEdges` and the `edges` field from the payload (`OptimizerPage.jsx:32-68,247,275`). Add a small badge showing distance source ("road distances" / "straight-line fallback").
4. **Shrink the band-aid**: `express.json({ limit: '10mb' })` → `256kb`.

**Verify:** same stop set before/after → visibly different (road-following) route order; with an invalid token → fallback flag set, optimization still solves; payload size in devtools now ~2 KB.
**Commit:** `feat: mapbox distance matrix server-side, lightweight client payload`.

---

## PART 4 — Real Patiala scenario + disposal facilities

**Goal:** overflow → real disposal detours; nothing silently hardcoded. (Static JSON, not a DB — keeps the DB-free local dev/test convention.)

1. **Scenario seed**: `ecoloop-backend/scenarios/patiala.json` + `GET /api/scenario`: municipal garage depot, ~8–10 ward collection points with varied demands, composting facility (type 3), MRF (type 4), landfill (type 5), transfer station (type 2) at plausible Patiala coords.
2. **Frontend**:
   - "Load Patiala scenario" button replaces the initial hardcoded 5 nodes.
   - Facility markers get distinct colors/icons by type (depot blue, composting brown, MRF teal, landfill gray, TS orange).
   - Make `hw`, `dry_non_recyclable`, `service_time` editable inputs per node (today they're invisible hardcoded values) — completes the "remove hardcoded injectors" item honestly while keeping click-to-add for demo extras.
3. **Verify the full pipeline**: set a truck's organic cap low → route visibly detours to the composting facility mid-route, then continues; everything overfull → `unserved_stops` shown red.
**Commit:** `feat: patiala scenario seed with facilities, editable demand fields`.

---

## PART 5 — Driver handoff & demo polish

1. **Turn-by-turn export**: per-route "Open in Google Maps" button building `https://www.google.com/maps/dir/?api=1&origin=…&destination=…&waypoints=lat,lng|…` — Google caps ~9 waypoints per URL, so for longer routes disable the button with a tooltip (or offer the first 9) rather than silently truncating. Also copy-route-to-clipboard.
2. **Road-following polylines (stretch)**: per solved route call Mapbox Directions API (`/directions/v5/mapbox/driving/{coords}?overview=full&geometries=geojson`, same token, ≤25 coords aligns with demo scale) and draw real road geometry instead of straight segments; straight-line fallback on error.
3. **Polish**: loading state text ("solving… building road matrix…"), reset button, alert copy cleanup.
**Verify:** 8-stop route opens correctly ordered in Google Maps; polylines follow streets.
**Commit:** `feat: turn-by-turn maps export, road geometry polylines`.

---

## PART 6 — Time windows (DEFERRED, next round)

Documented sketch only, no code: `tw_open_s`/`tw_close_s` node fields → arrival feasibility + wait-until-open in `initial_builder` accept-check and `is_route_feasible`, UI time inputs, Catch2 cases.

---

## Explicitly NOT doing (this round)

- No Postgres/DB integration (static scenario JSON keeps local dev DB-free).
- No Tailwind migration (page is inline-styled; no win).
- No self-hosted OSRM (no Docker locally; Mapbox chosen instead).
- Engine stdin/stdout contract unchanged throughout — Parts 3–4 only change *who* builds `edges`.
- Click-to-add stops stays (demo value); it just stops being the only data source.

## End-to-end acceptance script (after Part 5)

Fresh clone → build engine → `npm start` (backend) + `npm run dev` (frontend) → Load Patiala scenario → fleet of 3 trucks, one with tight organic cap → Optimize → 3 colored road-following routes from/to depot, one detouring to composting facility, any overflow stops flagged red → "Open in Google Maps" on truck 2 works.