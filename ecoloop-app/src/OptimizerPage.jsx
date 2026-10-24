import { useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Play, AlertCircle, Truck, MapPin, Plus, X, CheckCircle2, ExternalLink, RotateCcw } from 'lucide-react'
import L from 'leaflet'

// Fix for Vite + Leaflet missing marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// One color per vehicle route, cycled when the fleet is larger
const TRUCK_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#dc2626', '#0891b2'];

// Node type metadata — must mirror the C++ engine's NodeType enum
const TYPE_INFO = {
  0: { label: 'DEPOT', color: '#3182ce' },
  1: { label: 'STOP', color: '#38a169' },
  2: { label: 'TRANSFER STATION', color: '#dd6b20' },
  3: { label: 'COMPOSTING', color: '#92400e' },
  4: { label: 'MRF', color: '#0d9488' },
  5: { label: 'LANDFILL', color: '#718096' }
};

const isFacility = (type) => type >= 2;

// Google Maps Directions URLs accept at most 9 intermediate waypoints
const GOOGLE_MAPS_MAX_WAYPOINTS = 9;

/**
 * Builds a turn-by-turn Google Maps URL for a solved route's waypoints
 * ([[lat, lon], ...], depot at both ends). Returns null when the route is too
 * long for a single URL — callers should disable the export instead of
 * silently truncating the driver's route.
 */
function buildGoogleMapsUrl(waypoints) {
  const middle = waypoints.slice(1, -1);
  if (middle.length > GOOGLE_MAPS_MAX_WAYPOINTS) {
    return null;
  }
  const fmt = (c) => `${Number(c[0]).toFixed(6)},${Number(c[1]).toFixed(6)}`;
  const params = new URLSearchParams({
    api: '1',
    origin: fmt(waypoints[0]),
    destination: fmt(waypoints[waypoints.length - 1]),
    travelmode: 'driving'
  });
  if (middle.length > 0) {
    params.set('waypoints', middle.map(fmt).join('|'));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Child component inside MapContainer that captures user clicks to add new collection stops.
 */
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick && e?.latlng) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

// Initial depot and 4 Patiala collection points
const initialNodes = [
  {
    id: 0,
    name: 'Municipal Garage (Depot)',
    type: 0, // 0 = Depot
    lat: 30.3534,
    lon: 76.3608,
    organic: 0.0,
    dry: 0.0,
    hw: 0.0,
    dry_non_recyclable: 0.0,
    service_time: 0.0
  },
  {
    id: 1,
    name: 'Model Town',
    type: 1, // 1 = CollectionPoint
    lat: 30.3450,
    lon: 76.3800,
    organic: 25.0,
    dry: 15.0,
    hw: 0.0,
    dry_non_recyclable: 10.0,
    service_time: 60.0
  },
  {
    id: 2,
    name: 'Leela Bhawan',
    type: 1, // 1 = CollectionPoint
    lat: 30.3398,
    lon: 76.3869,
    organic: 35.0,
    dry: 20.0,
    hw: 0.0,
    dry_non_recyclable: 15.0,
    service_time: 60.0
  },
  {
    id: 3,
    name: 'Urban Estate Phase II',
    type: 1, // 1 = CollectionPoint
    lat: 30.3250,
    lon: 76.4000,
    organic: 30.0,
    dry: 10.0,
    hw: 0.0,
    dry_non_recyclable: 20.0,
    service_time: 60.0
  },
  {
    id: 4,
    name: 'Tripuri / Sirhind Road',
    type: 1, // 1 = CollectionPoint
    lat: 30.3580,
    lon: 76.3950,
    organic: 20.0,
    dry: 25.0,
    hw: 0.0,
    dry_non_recyclable: 10.0,
    service_time: 60.0
  }
];

const makeDefaultVehicle = (id) => ({
  id,
  capacity_organic: 1000.0,
  capacity_dry: 1000.0,
  capacity_hw: 200.0,
  capacity_dry_non_recyclable: 1000.0,
  shift_seconds: 28800.0
});

// Start with two trucks so multi-vehicle splitting is visible immediately
const initialVehicles = [makeDefaultVehicle(1), makeDefaultVehicle(2)];

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '6px 8px',
  fontSize: '12px',
  border: '1px solid #cbd5e0',
  borderRadius: '4px',
  backgroundColor: '#ffffff',
  color: '#2d3748'
};

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 500,
  color: '#718096',
  marginBottom: '3px'
};

export default function OptimizerPage() {
  const [nodes, setNodes] = useState(initialNodes)
  const [vehicles, setVehicles] = useState(initialVehicles)
  const [routeResults, setRouteResults] = useState([])
  const [unservedIds, setUnservedIds] = useState([])
  const [distanceSource, setDistanceSource] = useState(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [statusAlert, setStatusAlert] = useState(null) // { kind: 'error' | 'success' | 'warning', message }

  // Handle editing organic and dry waste values for a node
  const handleWasteChange = (id, field, value) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            [field]: value === '' ? '' : Math.max(0, parseFloat(value) || 0)
          };
        }
        return node;
      })
    );
  };

  // Handle editing a vehicle capacity / shift field (shift displayed in hours)
  const handleVehicleChange = (id, field, value) => {
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        if (field === 'shift_hours') {
          const hours = Math.max(0, parseFloat(value) || 0);
          return { ...v, shift_seconds: value === '' ? '' : hours * 3600 };
        }
        return { ...v, [field]: value === '' ? '' : Math.max(0, parseFloat(value) || 0) };
      })
    );
  };

  const addVehicle = () => {
    setVehicles((prev) => {
      const nextId = prev.length > 0 ? Math.max(...prev.map((v) => v.id)) + 1 : 1;
      return [...prev, makeDefaultVehicle(nextId)];
    });
  };

  const removeVehicle = (id) => {
    setVehicles((prev) => (prev.length > 1 ? prev.filter((v) => v.id !== id) : prev));
  };

  // Load the seeded Patiala scenario (depot, wards, processing facilities)
  const handleLoadScenario = async () => {
    setStatusAlert(null);
    try {
      const response = await fetch('http://localhost:3000/api/scenario');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const scenario = await response.json();

      setNodes(scenario.nodes.map((n) => ({
        id: n.id,
        name: n.name,
        type: n.type,
        lat: n.lat,
        lon: n.lon,
        organic: n.organic,
        dry: n.dry,
        hw: n.hw,
        dry_non_recyclable: n.dry_non_recyclable,
        service_time: n.service_time
      })));
      if (Array.isArray(scenario.suggested_vehicles) && scenario.suggested_vehicles.length > 0) {
        setVehicles(scenario.suggested_vehicles);
      }
      setRouteResults([]);
      setUnservedIds([]);
      setDistanceSource(null);
      setStatusAlert({
        kind: 'success',
        message: `Loaded "${scenario.name}": ${scenario.nodes.filter((n) => n.type === 1).length} wards, ${scenario.nodes.filter((n) => n.type >= 2).length} facilities.`
      });
    } catch (error) {
      setStatusAlert({
        kind: 'error',
        message: `Could not load scenario — ${error.message}. Is the backend (localhost:3000) running?`
      });
    }
  };

  // Interactive map click handler to add new collection point at clicked coordinates
  const handleMapClick = (lat, lng) => {
    // Clear existing routes so stale polylines disappear immediately
    setRouteResults([]);
    setUnservedIds([]);

    setNodes((prevNodes) => {
      const nextId = prevNodes.length > 0 ? Math.max(...prevNodes.map((n) => n.id)) + 1 : 1;
      const exactLat = parseFloat(lat.toFixed(6));
      const exactLon = parseFloat(lng.toFixed(6));

      const newNode = {
        id: nextId,
        name: `Collection Point ${nextId}`,
        type: 1, // 1 = CollectionPoint
        lat: exactLat,
        lon: exactLon,
        organic: 20.0,
        dry: 15.0,
        hw: 0.0,
        dry_non_recyclable: 10.0,
        service_time: 60.0
      };
      return [...prevNodes, newNode];
    });
  };

  const handleOptimize = async () => {
    setStatusAlert(null);
    setIsOptimizing(true);

    // The backend builds the distance matrix (road distances when a Mapbox
    // token is configured) — the client only sends nodes and the fleet.
    // Only collection points are routed; facilities are disposal destinations.
    const unassignedStops = nodes
      .filter((node) => node.type === 1)
      .map((node) => node.id);

    const routingPayload = {
      depot_id: 0,
      vehicles: vehicles.map((v) => ({
        id: v.id,
        capacity_organic: Number(v.capacity_organic) || 0,
        capacity_dry: Number(v.capacity_dry) || 0,
        capacity_hw: Number(v.capacity_hw) || 0,
        capacity_dry_non_recyclable: Number(v.capacity_dry_non_recyclable) || 0,
        shift_seconds: Number(v.shift_seconds) || 28800.0
      })),
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type ?? (n.id === 0 ? 0 : 1),
        lat: Number(n.lat),
        lon: Number(n.lon),
        organic: Number(n.organic) || 0,
        dry: Number(n.dry) || 0,
        hw: Number(n.hw ?? 0),
        dry_non_recyclable: Number(n.dry_non_recyclable ?? 0),
        service_time: Number(n.service_time ?? (n.id === 0 ? 0.0 : 60.0))
      })),
      unassigned_stops: unassignedStops
    };

    // Generous timeout: engine solve plus potential matrix building on the backend
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch('http://localhost:3000/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routingPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ? `${data.error}${data.details ? `: ${data.details}` : ''}` : `HTTP ${response.status}`);
      }
      if (!Array.isArray(data.routes) || data.routes.length === 0) {
        throw new Error('No routes returned from routing engine');
      }

      const colored = data.routes.map((route, index) => ({
        ...route,
        color: TRUCK_COLORS[index % TRUCK_COLORS.length],
        geometrySource: null
      }));
      setRouteResults(colored);
      setUnservedIds(Array.isArray(data.unserved_stops) ? data.unserved_stops : []);
      setDistanceSource(data.distance_source || null);

      // Upgrade straight-line polylines to road-following geometry (best
      // effort — straight lines stay if the backend can't provide it)
      colored.forEach((route) => {
        if (!Array.isArray(route.waypoints) || route.waypoints.length < 2 || route.waypoints.length > 25) {
          return;
        }
        fetch('http://localhost:3000/api/route-geometry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coordinates: route.waypoints })
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((geo) => {
            if (geo && Array.isArray(geo.geometry) && geo.geometry.length > 1) {
              setRouteResults((prev) => prev.map((r) =>
                r.vehicle_id === route.vehicle_id
                  ? { ...r, waypoints: geo.geometry, geometrySource: geo.source }
                  : r
              ));
            }
          })
          .catch(() => { /* straight-line polyline stays */ });
      });

      const totalKm = ((data.total_fleet_distance_m || 0) / 1000).toFixed(1);
      const unservedCount = (data.unserved_stops || []).length;
      setStatusAlert({
        kind: unservedCount > 0 ? 'warning' : 'success',
        message: unservedCount > 0
          ? `Solved ${data.routes.length} route(s), ${totalKm} km total — ${unservedCount} stop(s) could not be served (shown in red).`
          : `Solved ${data.routes.length} route(s), ${totalKm} km total.`
      });
    } catch (error) {
      clearTimeout(timeoutId);
      const reason = error.name === 'AbortError'
        ? 'Timed out after 15s'
        : (error.message || 'Unknown error');
      // Keep the last successful routes visible; surface the failure honestly
      setStatusAlert({ kind: 'error', message: `Optimization failed — ${reason}. Is the backend (localhost:3000) running?` });
    } finally {
      setIsOptimizing(false);
    }
  };

  const alertStyles = {
    error: { backgroundColor: '#fff5f5', color: '#c53030', borderColor: '#feb2b2', Icon: AlertCircle },
    warning: { backgroundColor: '#fffaf0', color: '#dd6b20', borderColor: '#fbd38d', Icon: AlertCircle },
    success: { backgroundColor: '#f0fff4', color: '#276749', borderColor: '#9ae6b4', Icon: CheckCircle2 }
  };

  const unservedNodes = nodes.filter((n) => unservedIds.includes(n.id));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        textAlign: 'left',
        backgroundColor: '#f8fafc',
        boxSizing: 'border-box'
      }}
    >
      {/* 350px Scrollable Sidebar on the Left */}
      <aside
        style={{
          width: '350px',
          minWidth: '350px',
          maxWidth: '350px',
          height: '100%',
          overflowY: 'auto',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxSizing: 'border-box'
        }}
      >
        {/* Header Section */}
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700, color: '#1a202c' }}>
            Spatial Route Optimizer
          </h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#718096' }}>
            C++ VRP municipal fleet routing • Patiala Ward
          </p>
        </div>

        {/* Primary Action Button */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            id="optimize-fleet-btn"
            onClick={handleOptimize}
            disabled={isOptimizing}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              flex: 1,
              padding: '11px 16px',
              backgroundColor: isOptimizing ? '#a0aec0' : '#38a169',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isOptimizing ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              transition: 'background-color 0.2s'
            }}
          >
            <Play size={16} fill={isOptimizing ? 'none' : 'currentColor'} />
            {isOptimizing ? 'Calculating Routes...' : 'Optimize Fleet Routes'}
          </button>
          <button
            id="load-scenario-btn"
            onClick={handleLoadScenario}
            title="Replace the node list with the seeded Patiala wards and processing facilities"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '11px 12px',
              backgroundColor: '#ffffff',
              color: '#2d3748',
              border: '1px solid #cbd5e0',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <MapPin size={14} />
            Patiala Scenario
          </button>
          {routeResults.length > 0 && (
            <button
              id="clear-routes-btn"
              onClick={() => { setRouteResults([]); setUnservedIds([]); setDistanceSource(null); setStatusAlert(null); }}
              title="Clear solved routes from the map"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '11px 10px',
                backgroundColor: '#ffffff',
                color: '#718096',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>

        {/* Status Alert */}
        {statusAlert && (() => {
          const style = alertStyles[statusAlert.kind] || alertStyles.error;
          const Icon = style.Icon;
          return (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: style.backgroundColor,
                color: style.color,
                border: `1px solid ${style.borderColor}`,
                borderRadius: '6px',
                fontSize: '12px',
                lineHeight: '1.4'
              }}
            >
              <Icon size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{statusAlert.message}</span>
            </div>
          );
        })()}

        {/* Fleet Editor */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#2d3748', fontSize: '12px' }}>
              <Truck size={14} color="#3182ce" />
              <span>Active Fleet ({vehicles.length} {vehicles.length === 1 ? 'Vehicle' : 'Vehicles'})</span>
            </div>
            <button
              onClick={addVehicle}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: '#ebf8ff',
                color: '#2b6cb0',
                border: '1px solid #90cdf4',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Plus size={12} />
              Add Truck
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {vehicles.map((vehicle, index) => (
              <div
                key={vehicle.id}
                style={{
                  padding: '12px',
                  backgroundColor: '#f7fafc',
                  border: '1px solid #edf2f7',
                  borderLeft: `4px solid ${TRUCK_COLORS[index % TRUCK_COLORS.length]}`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#4a5568'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, color: '#2d3748', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: TRUCK_COLORS[index % TRUCK_COLORS.length]
                      }}
                    />
                    Truck {vehicle.id}
                  </span>
                  {vehicles.length > 1 && (
                    <button
                      onClick={() => removeVehicle(vehicle.id)}
                      title={`Remove Truck ${vehicle.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '2px 7px',
                        backgroundColor: '#fff5f5',
                        color: '#c53030',
                        border: '1px solid #feb2b2',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={11} />
                      Remove
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label htmlFor={`cap-organic-${vehicle.id}`} style={labelStyle}>Organic Cap (kg)</label>
                    <input
                      id={`cap-organic-${vehicle.id}`}
                      type="number"
                      min="0"
                      step="50"
                      value={vehicle.capacity_organic}
                      onChange={(e) => handleVehicleChange(vehicle.id, 'capacity_organic', e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor={`cap-dry-${vehicle.id}`} style={labelStyle}>Dry Cap (kg)</label>
                    <input
                      id={`cap-dry-${vehicle.id}`}
                      type="number"
                      min="0"
                      step="50"
                      value={vehicle.capacity_dry}
                      onChange={(e) => handleVehicleChange(vehicle.id, 'capacity_dry', e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor={`cap-hw-${vehicle.id}`} style={labelStyle}>HW Cap (kg)</label>
                    <input
                      id={`cap-hw-${vehicle.id}`}
                      type="number"
                      min="0"
                      step="10"
                      value={vehicle.capacity_hw}
                      onChange={(e) => handleVehicleChange(vehicle.id, 'capacity_hw', e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor={`cap-nr-${vehicle.id}`} style={labelStyle}>Non-Recyclable Cap (kg)</label>
                    <input
                      id={`cap-nr-${vehicle.id}`}
                      type="number"
                      min="0"
                      step="50"
                      value={vehicle.capacity_dry_non_recyclable}
                      onChange={(e) => handleVehicleChange(vehicle.id, 'capacity_dry_non_recyclable', e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor={`shift-${vehicle.id}`} style={labelStyle}>Shift Duration (hours)</label>
                    <input
                      id={`shift-${vehicle.id}`}
                      type="number"
                      min="0"
                      step="0.5"
                      value={vehicle.shift_seconds === '' ? '' : (Number(vehicle.shift_seconds) / 3600)}
                      onChange={(e) => handleVehicleChange(vehicle.id, 'shift_hours', e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Solved Routes Legend */}
        {routeResults.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#2d3748' }}>
                Solved Routes
              </h3>
              {distanceSource && (
                <span
                  title={distanceSource === 'haversine' ? 'No Mapbox token configured — add MAPBOX_ACCESS_TOKEN to ecoloop-backend/.env for road distances' : 'Distances from the Mapbox road network'}
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: distanceSource === 'haversine' ? '#fffff0' : '#ebf8ff',
                    color: distanceSource === 'haversine' ? '#b7791f' : '#2b6cb0',
                    border: `1px solid ${distanceSource === 'haversine' ? '#ecc94b' : '#90cdf4'}`
                  }}
                >
                  {distanceSource === 'haversine' ? 'STRAIGHT-LINE' : distanceSource === 'mapbox' ? 'ROAD DISTANCES' : 'ROAD (PARTIAL)'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {routeResults.map((route) => {
                const mapsUrl = buildGoogleMapsUrl(route.waypoints || []);
                return (
                <div
                  key={route.vehicle_id}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderLeft: `4px solid ${route.color}`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#4a5568'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#2d3748', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: route.color
                        }}
                      />
                      Truck {route.vehicle_id}
                    </span>
                    <span style={{ fontSize: '11px', color: '#718096' }}>
                      {route.stops.length} stops • {((route.distance_m || 0) / 1000).toFixed(1)} km • {Math.round((route.duration_s || 0) / 60)} min
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    {route.geometrySource && (
                      <span style={{ fontSize: '10px', fontWeight: 600, color: route.geometrySource === 'mapbox' ? '#2b6cb0' : '#a0aec0' }}>
                        {route.geometrySource === 'mapbox' ? 'ROAD GEOMETRY' : 'STRAIGHT LINES'}
                      </span>
                    )}
                    {mapsUrl ? (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginLeft: 'auto',
                          padding: '4px 10px',
                          backgroundColor: route.color,
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          textDecoration: 'none'
                        }}
                      >
                        <ExternalLink size={11} />
                        Open in Google Maps
                      </a>
                    ) : (
                      <span
                        title={`Google Maps URLs support at most ${GOOGLE_MAPS_MAX_WAYPOINTS} waypoints — this route has ${(route.waypoints || []).length - 2}`}
                        style={{
                          marginLeft: 'auto',
                          padding: '4px 10px',
                          backgroundColor: '#e2e8f0',
                          color: '#718096',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}
                      >
                        Maps export unavailable
                      </span>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Nodes Form Header & Map Click Hint */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#2d3748' }}>
              Collection Points & Demands
            </h3>
            <span style={{ fontSize: '11px', color: '#718096' }}>
              {nodes.filter((n) => n.type === 1).length} stops • {nodes.filter((n) => n.type >= 2).length} facilities • 1 depot
            </span>
          </div>
          <div
            id="map-click-hint"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: '#ebf8ff',
              color: '#2b6cb0',
              border: '1px dashed #90cdf4',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            <MapPin size={12} />
            <span>Click map to add stops</span>
          </div>
        </div>

        {/* Nodes List / Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '20px' }}>
          {nodes.map((node) => {
            const info = TYPE_INFO[node.type] || TYPE_INFO[1];
            const isDepot = node.type === 0;
            const isUnserved = unservedIds.includes(node.id);
            return (
              <div
                key={node.id}
                style={{
                  padding: '12px',
                  backgroundColor: isDepot ? '#f7fafc' : '#ffffff',
                  border: isUnserved ? '1px solid #fc8181' : (isDepot ? '1px solid #cbd5e0' : '1px solid #e2e8f0'),
                  borderLeft: `4px solid ${isUnserved ? '#e53e3e' : info.color}`,
                  borderRadius: '6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}
              >
                {/* Node Label & Coordinates */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: isUnserved ? '#fff5f5' : (isDepot ? '#ebf8ff' : '#f0fff4'),
                        color: isUnserved ? '#c53030' : (isDepot ? '#2b6cb0' : '#276749'),
                        flexShrink: 0
                      }}
                    >
                      {isUnserved ? 'UNSERVED' : (isFacility(node.type) ? info.label : (isDepot ? 'DEPOT' : `STOP #${node.id}`))}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#2d3748',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={node.name || `Collection Point ${node.id}`}
                    >
                      {node.name || `Collection Point ${node.id}`}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#a0aec0', fontFamily: 'monospace', flexShrink: 0 }}>
                    {Number(node.lat).toFixed(4)}, {Number(node.lon).toFixed(4)}
                  </span>
                </div>

                {/* Waste Demand Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label htmlFor={`organic-${node.id}`} style={labelStyle}>Organic (kg)</label>
                    <input
                      id={`organic-${node.id}`}
                      type="number"
                      min="0"
                      step="1"
                      value={node.organic}
                      onChange={(e) => handleWasteChange(node.id, 'organic', e.target.value)}
                      style={{ ...inputStyle, borderColor: '#e2e8f0' }}
                    />
                  </div>
                  <div>
                    <label htmlFor={`dry-${node.id}`} style={labelStyle}>Dry (kg)</label>
                    <input
                      id={`dry-${node.id}`}
                      type="number"
                      min="0"
                      step="1"
                      value={node.dry}
                      onChange={(e) => handleWasteChange(node.id, 'dry', e.target.value)}
                      style={{ ...inputStyle, borderColor: '#e2e8f0' }}
                    />
                  </div>
                  <div>
                    <label htmlFor={`hw-${node.id}`} style={labelStyle}>Hazardous/E-waste (kg)</label>
                    <input
                      id={`hw-${node.id}`}
                      type="number"
                      min="0"
                      step="1"
                      value={node.hw}
                      onChange={(e) => handleWasteChange(node.id, 'hw', e.target.value)}
                      style={{ ...inputStyle, borderColor: '#e2e8f0' }}
                    />
                  </div>
                  <div>
                    <label htmlFor={`nr-${node.id}`} style={labelStyle}>Non-Recyclable (kg)</label>
                    <input
                      id={`nr-${node.id}`}
                      type="number"
                      min="0"
                      step="1"
                      value={node.dry_non_recyclable}
                      onChange={(e) => handleWasteChange(node.id, 'dry_non_recyclable', e.target.value)}
                      style={{ ...inputStyle, borderColor: '#e2e8f0' }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor={`service-${node.id}`} style={labelStyle}>Service Time (minutes)</label>
                    <input
                      id={`service-${node.id}`}
                      type="number"
                      min="0"
                      step="1"
                      value={node.service_time === '' ? '' : Number(node.service_time) / 60}
                      onChange={(e) => {
                        const minutes = e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0);
                        setNodes((prev) => prev.map((n) => n.id === node.id ? { ...n, service_time: minutes === '' ? '' : minutes * 60 } : n));
                      }}
                      style={{ ...inputStyle, borderColor: '#e2e8f0' }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Leaflet Map on the Right */}
      <main style={{ flex: 1, height: '100%', minWidth: 0, position: 'relative' }}>
        <MapContainer
          center={[30.3398, 76.3869]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          {/* Listens for map click events and dynamically appends new collection points */}
          <MapClickHandler onMapClick={handleMapClick} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {/* One polyline per vehicle route, in the truck's color */}
          {routeResults.map((route) => (
            <Polyline
              key={`route-${route.vehicle_id}`}
              positions={route.waypoints}
              pathOptions={{ color: route.color, weight: 4, opacity: 0.9 }}
            />
          ))}
          {/* Unserved stops flagged in red on the map */}
          {unservedNodes.map((node) => (
            <CircleMarker
              key={`unserved-${node.id}`}
              center={[Number(node.lat), Number(node.lon)]}
              radius={14}
              pathOptions={{ color: '#e53e3e', fillColor: '#fed7d7', fillOpacity: 0.9, weight: 2 }}
            >
              <Popup>
                <strong>Stop #{node.id} could not be served</strong>
                <div>No truck has spare capacity for this demand.</div>
              </Popup>
            </CircleMarker>
          ))}
          {nodes.map((node) => {
            const pos = [Number(node.lat), Number(node.lon)];
            if (isFacility(node.type)) {
              const info = TYPE_INFO[node.type] || TYPE_INFO[2];
              const accepts = {
                2: 'Hazardous / e-waste',
                3: 'Organic (composting)',
                4: 'Dry recyclables (MRF)',
                5: 'Non-recyclable residue'
              }[node.type];
              return (
                <CircleMarker
                  key={node.id}
                  center={pos}
                  radius={9}
                  pathOptions={{ color: '#ffffff', fillColor: info.color, fillOpacity: 0.95, weight: 2 }}
                >
                  <Popup>
                    <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                      <strong style={{ color: info.color }}>{info.label}</strong>
                      <div>{node.name}</div>
                      <div style={{ marginTop: '4px', color: '#4a5568' }}>
                        <div><strong>Accepts:</strong> {accepts}</div>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            }
            return (
              <Marker key={node.id} position={pos}>
                <Popup>
                  <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                    <strong style={{ color: node.type === 0 ? '#2b6cb0' : '#276749' }}>
                      {node.type === 0 ? 'Municipal Garage (Depot)' : (node.name || `Collection Point ${node.id}`)}
                    </strong>
                    <div style={{ marginTop: '4px', color: '#4a5568' }}>
                      <div><strong>Node ID:</strong> {node.id}</div>
                      <div><strong>Organic Waste:</strong> {node.organic} kg</div>
                      <div><strong>Dry Waste:</strong> {node.dry} kg</div>
                      <div><strong>Coordinates:</strong> {Number(node.lat).toFixed(4)}, {Number(node.lon).toFixed(4)}</div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </main>
    </div>
  );
}
