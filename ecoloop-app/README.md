# EcoLoop Optimizer (frontend)

React + Vite + Leaflet map UI for the municipal route optimizer. Talks to the
Express bridge at `http://localhost:3000` (see `ecoloop-backend/`), which spawns the
C++ engine in `route-engine/`.

## Run

```bash
npm install
npm run dev        # Vite dev server (prints the local URL)
```

Start the backend in a second terminal:

```bash
cd ../ecoloop-backend
npm install
npm start          # Express bridge on :3000 — requires the C++ engine to be built
```

The routing engine must be built once (see `route-engine/README.md`):

```bash
cd ../route-engine
cmake -B build && cmake --build build
```
