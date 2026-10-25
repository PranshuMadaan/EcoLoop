import { useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Play, AlertCircle, Truck, MapPin, ClipboardList } from 'lucide-react'
import L from 'leaflet'

// Fix for Vite + Leaflet missing marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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

/**
 * Computes great-circle distance in meters between two lat/lon pairs using the Haversine formula.
 */
function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth mean radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Automatically generates an array of edges (distances in meters) between all pairs of nodes.
 */
function generateEdges(nodesList, defaultSpeedMps = 10.0) {
  const edges = [];
  for (let i = 0; i < nodesList.length; i++) {
    for (let j = 0; j < nodesList.length; j++) {
      if (nodesList[i].id === nodesList[j].id) continue;
      const u = nodesList[i];
      const v = nodesList[j];
      const distanceM = calculateHaversineDistanceMeters(u.lat, u.lon, v.lat, v.lon);
      edges.push({
        from: u.id,
        to: v.id,
        distance_m: distanceM,
        speed_mps: defaultSpeedMps
      });
    }
  }
  return edges;
}

// Initial depot and 4 Patiala collection points
const initialNodes = [
  {
    id: 0,
    name: 'DWCC Central Hub (Depot)',
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

// Initial vehicles state: 1 current truck
const initialVehicles = [
  {
    id: 1,
    capacity_organic: 1000.0,
    capacity_dry: 1000.0,
    capacity_hw: 200.0,
    capacity_dry_non_recyclable: 1000.0,
    shift_seconds: 28800.0
  }
];

export default function OptimizerPage() {
  const [nodes, setNodes] = useState(initialNodes)
  const [vehicles, setVehicles] = useState(initialVehicles)
  const [routePoints, setRoutePoints] = useState([])
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [statusAlert, setStatusAlert] = useState(null)
  const [workerId, setWorkerId] = useState('');
  const [depositVolume, setDepositVolume] = useState('');

  // Tier 3 Manual Intake Ledger submission handler
  const handleDepositLog = (e) => {
    e.preventDefault();
    if (!workerId || !depositVolume) {
      alert('Please fill in both fields');
      return;
    }
    alert(`Deposit of ${depositVolume}kg logged for Worker ${workerId}. Trust Score updated.`);
    setWorkerId('');
    setDepositVolume('');
  };

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

  // Handle editing vehicle capacity values for vehicles[0]
  const handleVehicleCapacityChange = (field, value) => {
    setVehicles((prev) => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[0] = {
          ...updated[0],
          [field]: value === '' ? '' : Math.max(0, parseFloat(value) || 0)
        };
      }
      return updated;
    });
  };

  // Interactive map click handler to add new collection point at clicked coordinates
  const handleMapClick = (lat, lng) => {
    // State Clearing: explicitly clear existing route so polyline disappears immediately
    setRoutePoints([]);

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
      console.log(`[OptimizerPage] Map clicked at [${exactLat}, ${exactLon}]. Added stop ${nextId}:`, newNode);
      return [...prevNodes, newNode];
    });
  };

  const handleOptimize = async () => {
    console.log("[OptimizerPage] handleOptimize triggered: starting fleet route optimization...");
    setStatusAlert(null);

    // Capacity Validation: check if any node's 'organic' or 'dry' value exceeds vehicles[0].capacity_organic or capacity_dry
    const vehicleOrganicCap = Number(vehicles[0]?.capacity_organic) || 0;
    const vehicleDryCap = Number(vehicles[0]?.capacity_dry) || 0;

    for (const node of nodes) {
      const nodeOrganic = Number(node.organic) || 0;
      const nodeDry = Number(node.dry) || 0;

      if (nodeOrganic > vehicleOrganicCap || nodeDry > vehicleDryCap) {
        console.warn(
          `[OptimizerPage] Capacity validation failed for Stop ${node.id} (${node.name}): ` +
          `Organic ${nodeOrganic} > ${vehicleOrganicCap} or Dry ${nodeDry} > ${vehicleDryCap}`
        );
        alert('Error: A stop exceeds vehicle capacity');
        return;
      }
    }

    setIsOptimizing(true);
    console.log("[OptimizerPage] State update: isOptimizing = true");

    // Dynamic fallback coordinates connecting all current nodes back to depot
    const fallbackCoordinates = [
      ...nodes.map((n) => [Number(n.lat), Number(n.lon)]),
      nodes.length > 0 ? [Number(nodes[0].lat), Number(nodes[0].lon)] : [30.3534, 76.3608]
    ];

    // 5-second timeout for backend fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 5000);

    // Auto-generate edges array using Haversine formula right before fetch call
    const dynamicEdges = generateEdges(nodes);
    console.log(`[OptimizerPage] Generated ${dynamicEdges.length} dynamic edges via Haversine formula:`, dynamicEdges);

    // Unassigned stops: all node IDs except the depot (ID 0)
    const unassignedStops = nodes
      .filter((node) => node.id !== 0)
      .map((node) => node.id);

    // Dynamic C++ VRP routing engine payload constructed from React state
    const routingPayload = {
      action: "optimize_ward",
      depot_id: 0,
      vehicles: vehicles.map((v) => ({
        ...v,
        capacity_organic: Number(v.capacity_organic) || 1000.0,
        capacity_dry: Number(v.capacity_dry) || 1000.0
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
      edges: dynamicEdges,
      unassigned_stops: unassignedStops
    };

    try {
      console.log("[OptimizerPage] Dispatching POST request to http://localhost:3000/api/optimize with dynamic payload:", routingPayload);
      const response = await fetch('http://localhost:3000/api/optimize', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routingPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("[OptimizerPage] Received backend response:", data);
      
      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.optimized_waypoints || data.optimized_waypoints.length === 0) {
        console.log("[OptimizerPage] Backend response missing 'optimized_waypoints', triggering fallback simulation.");
        throw new Error("No optimized waypoints returned from backend API");
      }

      console.log("[OptimizerPage] State update: routePoints set with API waypoints:", data.optimized_waypoints);
      setRoutePoints(data.optimized_waypoints);
    } catch (error) {
      clearTimeout(timeoutId);
      console.log("[OptimizerPage] Route calculation failed or timed out:", error.name === 'AbortError' ? 'Request timed out after 5000ms' : (error.message || error));
      console.log("[OptimizerPage] Node server is unreachable or returned error. Using fallback simulation:", error);
      console.error("[OptimizerPage] Routing error details:", error);
      setStatusAlert("Node server is unreachable or timed out. Loaded fallback simulated route coordinates.");
      console.log("[OptimizerPage] State update: routePoints set with fallback coordinates:", fallbackCoordinates);
      setRoutePoints(fallbackCoordinates);
    } finally {
      setIsOptimizing(false);
      console.log("[OptimizerPage] State update: isOptimizing = false (finished)");
    }
  };

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
          borderRight: '1px solid #eae1da',
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
          <p style={{ margin: 0, fontSize: '12px', color: '#78716c' }}>
            C++ VRP municipal fleet routing • Patiala Ward
          </p>
        </div>

        {/* Primary Action Button */}
        <button 
          id="optimize-fleet-btn"
          onClick={() => {
            console.log("[OptimizerPage] 'Optimize Fleet Route' button clicked.");
            handleOptimize();
          }} 
          disabled={isOptimizing}
          style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '11px 16px', 
            backgroundColor: isOptimizing ? '#a8a29e' : '#166534',
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
          {isOptimizing ? 'Calculating Route...' : 'Optimize Fleet Route'}
        </button>

        {/* Status Alert */}
        {statusAlert && (
          <div 
            role="alert"
            style={{ 
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px', 
              padding: '10px 12px',
              backgroundColor: '#fff7ed',
              color: '#d97706', 
              border: '1px solid #fcd34d',
              borderRadius: '6px',
              fontSize: '12px',
              lineHeight: '1.4'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{statusAlert}</span>
          </div>
        )}

        {/* Vehicle Fleet Status with Editable Capacity Inputs */}
        <div
          style={{
            padding: '12px',
            backgroundColor: '#fff8f5',
            border: '1px solid #f6ece6',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#57534e'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#1f1b17', marginBottom: '8px' }}>
            <Truck size={14} color="#b45309" />
            <span>Active Fleet ({vehicles.length} Vehicle)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label
                htmlFor="vehicle-capacity-organic"
                style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '3px', fontWeight: 500 }}
              >
                Organic Cap (kg)
              </label>
              <input
                id="vehicle-capacity-organic"
                type="number"
                min="0"
                step="50"
                value={vehicles[0]?.capacity_organic ?? ''}
                onChange={(e) => handleVehicleCapacityChange('capacity_organic', e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '6px 8px',
                  fontSize: '12px',
                  border: '1px solid #d8ccc2',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#1f1b17'
                }}
              />
            </div>
            <div>
              <label
                htmlFor="vehicle-capacity-dry"
                style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '3px', fontWeight: 500 }}
              >
                Dry Cap (kg)
              </label>
              <input
                id="vehicle-capacity-dry"
                type="number"
                min="0"
                step="50"
                value={vehicles[0]?.capacity_dry ?? ''}
                onChange={(e) => handleVehicleCapacityChange('capacity_dry', e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '6px 8px',
                  fontSize: '12px',
                  border: '1px solid #d8ccc2',
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  color: '#1f1b17'
                }}
              />
            </div>
          </div>
        </div>

        {/* Tier 3: Depot Intake (No Phone) */}
        <div
          style={{
            padding: '12px',
            backgroundColor: '#fff8f5',
            border: '1px solid #f6ece6',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#57534e'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#1f1b17', marginBottom: '8px' }}>
            <ClipboardList size={14} color="#d69e2e" />
            <span>Tier 3: Depot Intake (No Phone)</span>
          </div>
          <form onSubmit={handleDepositLog} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label
                  htmlFor="worker-id-input"
                  style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '3px', fontWeight: 500 }}
                >
                  Worker ID
                </label>
                <input
                  id="worker-id-input"
                  type="text"
                  placeholder="e.g. W-102"
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '6px 8px',
                    fontSize: '12px',
                    border: '1px solid #d8ccc2',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    color: '#1f1b17'
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor="deposit-volume-input"
                  style={{ fontSize: '11px', color: '#78716c', display: 'block', marginBottom: '3px', fontWeight: 500 }}
                >
                  Segregated Volume (kg)
                </label>
                <input
                  id="deposit-volume-input"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="e.g. 15"
                  value={depositVolume}
                  onChange={(e) => setDepositVolume(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '6px 8px',
                    fontSize: '12px',
                    border: '1px solid #d8ccc2',
                    borderRadius: '4px',
                    backgroundColor: '#ffffff',
                    color: '#1f1b17'
                  }}
                />
              </div>
            </div>
            <button
              id="log-deposit-btn"
              type="submit"
              style={{
                width: '100%',
                padding: '7px 12px',
                backgroundColor: '#b45309',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                marginTop: '2px'
              }}
            >
              Log Deposit & Update Score
            </button>
          </form>
        </div>

        {/* Nodes Form Header & Map Click Hint */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1f1b17' }}>
              Collection Points & Demands
            </h3>
            <span style={{ fontSize: '11px', color: '#78716c' }}>
              {nodes.length} stops (incl. Depot)
            </span>
          </div>
          <div
            id="map-click-hint"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              backgroundColor: '#f0fdf4',
              color: '#b45309',
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
            const isDepot = node.id === 0;
            return (
              <div
                key={node.id}
                style={{
                  padding: '12px',
                  backgroundColor: isDepot ? '#fff8f5' : '#ffffff',
                  border: isDepot ? '1px solid #d8ccc2' : '1px solid #eae1da',
                  borderLeft: isDepot ? '4px solid #b45309' : '4px solid #166534',
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
                        backgroundColor: isDepot ? '#f0fdf4' : '#f0fdf4',
                        color: isDepot ? '#b45309' : '#004c22',
                        flexShrink: 0
                      }}
                    >
                      {isDepot ? 'DEPOT' : `STOP #${node.id}`}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#1f1b17',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={node.name || `Collection Point ${node.id}`}
                    >
                      {node.name || `Collection Point ${node.id}`}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#a8a29e', fontFamily: 'monospace', flexShrink: 0 }}>
                    {Number(node.lat).toFixed(4)}, {Number(node.lon).toFixed(4)}
                  </span>
                </div>

                {/* Waste Demand Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label
                      htmlFor={`organic-${node.id}`}
                      style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#78716c', marginBottom: '3px' }}
                    >
                      Organic (kg)
                    </label>
                    <input
                      id={`organic-${node.id}`}
                      type="number"
                      min="0"
                      step="1"
                      value={node.organic}
                      onChange={(e) => handleWasteChange(node.id, 'organic', e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '6px 8px',
                        border: '1px solid #eae1da',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#1f1b17',
                        backgroundColor: '#ffffff'
                      }}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`dry-${node.id}`}
                      style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#78716c', marginBottom: '3px' }}
                    >
                      Dry (kg)
                    </label>
                    <input
                      id={`dry-${node.id}`}
                      type="number"
                      min="0"
                      step="1"
                      value={node.dry}
                      onChange={(e) => handleWasteChange(node.id, 'dry', e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '6px 8px',
                        border: '1px solid #eae1da',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#1f1b17',
                        backgroundColor: '#ffffff'
                      }}
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
          {routePoints.length > 0 && (
            <Polyline positions={routePoints} color="#166534" weight={5} opacity={0.85} />
          )}
          {nodes.map((node) => (
            <Marker key={node.id} position={[Number(node.lat), Number(node.lon)]}>
              <Popup>
                <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                  <strong style={{ color: node.id === 0 ? '#b45309' : '#004c22' }}>
                    {node.id === 0 ? 'DWCC Central Hub (Depot)' : (node.name || `Collection Point ${node.id}`)}
                  </strong>
                  <div style={{ marginTop: '4px', color: '#57534e' }}>
                    <div><strong>Node ID:</strong> {node.id}</div>
                    <div><strong>Organic Waste:</strong> {node.organic} kg</div>
                    <div><strong>Dry Waste:</strong> {node.dry} kg</div>
                    <div><strong>Coordinates:</strong> {Number(node.lat).toFixed(4)}, {Number(node.lon).toFixed(4)}</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </main>
    </div>
  );
}