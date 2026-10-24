# EcoLoop Route Engine

C++ waste-collection fleet router (CVRP with segregated waste streams). Reads a JSON
scenario on stdin, writes the optimized solution as JSON on stdout. The Express bridge
(`ecoloop-backend/server.js`) spawns this binary via `/api/optimize`.

## Build

Requires CMake 3.21+ and a C++17 compiler. Catch2 v3 and nlohmann/json are fetched
automatically on first configure.

```bash
cmake -B build
cmake --build build
```

Binary: `build/src/waste_router_cli`

## Tests

```bash
ctest --test-dir build
```

## Input contract (stdin JSON)

```jsonc
{
  "depot_id": 0,                    // NodeId all routes start from
  "vehicles": [{
    "id": 1,
    "capacity_organic": 1000.0,     // kg per stream compartment
    "capacity_dry": 1000.0,
    "capacity_hw": 200.0,
    "capacity_dry_non_recyclable": 1000.0,
    "shift_seconds": 28800.0
  }],
  "nodes": [{
    "id": 0,
    "type": 0,                      // 0 Depot, 1 CollectionPoint, 2 TransferStation,
                                     // 3 CompostingFacility, 4 MaterialRecoveryFacility, 5 Landfill
    "lat": 30.3534, "lon": 76.3608,
    "organic": 0.0, "dry": 0.0, "hw": 0.0, "dry_non_recyclable": 0.0,   // kg demand
    "service_time": 0.0             // seconds spent at the stop
  }],
  "edges": [{ "from": 0, "to": 1, "distance_m": 2143.0, "speed_mps": 8.5, "turn_penalty": 0 }],
  "unassigned_stops": [1, 2, 3]     // collection-point NodeIds to route
}
```

## Output contract (stdout JSON)

```jsonc
{
  "routes": [{ "vehicle_id": 1, "distance_m": 9700.0, "duration_s": 1210.0, "stops": [0, 1, 2, 0] }],
  "unserved_stops": [7],
  "total_fleet_distance_m": 9700.0,
  "total_fleet_duration_s": 1210.0
}
```

Every route starts and ends at the depot, visiting a disposal facility before
returning. `unserved_stops` lists collection points no vehicle could service
(demand beyond every truck's capacity, or overflow with no reachable facility).

Errors are reported as `{"error": "..."}` on stderr with a non-zero exit code.

## Solver

1. **Initial solution** — greedy nearest-neighbour assignment across the fleet with
   per-stream capacity checks, mid-route disposal detours to the nearest facility sink
   (composting → organic, MRF → dry recyclable, landfill → dry non-recyclable,
   transfer station → hazardous e-waste), and shift-duration rollover to the next vehicle.
2. **Improvement** — intra-route 2-opt, then inter-route relocate/swap moves with
   per-vehicle feasibility checks, until no improving move remains. All moves are
   gated by disposal-aware feasibility (peak concurrent load per stream, with
   compartments reset at facility visits), so a dump can never be reordered behind
   the load that required it.
3. Leg costs use the direct edge when present, Dijkstra shortest path over the edge
   set otherwise.

## Deferred: time windows

Not yet implemented. Planned sketch when needed:

- Node schema gains `tw_open_s` / `tw_close_s` (seconds from midnight), e.g. a DWCC
  micro-depot open 08:00–18:00.
- `InitialSolutionBuilder` tracks arrival time per stop already
  (`active.current_time_seconds`); accepting a stop checks
  `arrival <= tw_close_s`, and `arrival < tw_open_s` waits until opening.
- `is_route_feasible` re-validates the whole sequence (with waits) so 2-opt and
  relocate/swap moves cannot create out-of-window arrivals.
- UI: two time inputs per node; Catch2 cases for wait-until-open and
  rejected-too-late arrivals.
