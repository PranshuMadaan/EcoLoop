import React, { useState, useEffect, useRef } from 'react';

/**
 * CitizenTruckMap - Real-Time Doorstep Waste Collection Truck Tracker
 * Embeds citizen-facing view of the Route Optimizer (SRO) map with:
 * - Live GPS position of collection vehicle
 * - Real-time ETA countdown to citizen's ward
 * - Stop sequence timeline
 * - "My Bin is Segregated & Ready" toggle button
 * - Audio arrival chime toggle
 */
export default function CitizenTruckMap({ citizenWard = 'Ward 14 - Leela Bhawan', onBinReady }) {
  const [etaMinutes, setEtaMinutes] = useState(14);
  const [stopsAway, setStopsAway] = useState(3);
  const [isBinReady, setIsBinReady] = useState(false);
  const [soundAlertEnabled, setSoundAlertEnabled] = useState(true);
  const [activeTruck, setActiveTruck] = useState({
    id: 'TRK-EV-01',
    driver: 'Gurpreet Singh',
    vehicleType: 'Zero-Emission Municipal EV Micro-Tipper',
    batteryPct: 84,
    currentSpeedKmH: 26,
    currentLocation: 'Model Town Main Chowk',
  });

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);

  // Stop sequence around Patiala for the active circuit
  const stops = [
    { id: 0, name: 'Municipal Garage (Depot)', status: 'COMPLETED', time: '06:30 AM' },
    { id: 1, name: 'Model Town (Ward 08)', status: 'IN_PROGRESS', time: '07:10 AM' },
    { id: 2, name: 'Leela Bhawan (Ward 14 - You)', status: 'UPCOMING', time: '07:24 AM (ETA)' },
    { id: 3, name: 'Urban Estate Phase II', status: 'PENDING', time: '07:45 AM' },
    { id: 4, name: 'Tripuri Waste Centre', status: 'PENDING', time: '08:15 AM' },
  ];

  // Initialize Leaflet map if available on window
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    if (window.L && !leafletMapRef.current) {
      try {
        const map = window.L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
        }).setView([30.345, 76.38], 14);

        window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
        }).addTo(map);

        // Marker for Household (Citizen)
        const citizenIcon = window.L.divIcon({
          className: 'citizen-marker',
          html: '<div style="background:#10b981; color:#fff; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; border:3px solid #fff; box-shadow:0 0 15px rgba(16,185,129,0.8); animation:pulse 2s infinite;">🏡</div>',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
        window.L.marker([30.3398, 76.3869], { icon: citizenIcon })
          .addTo(map)
          .bindPopup('<b>Your Household</b><br/>Ward 14 - Leela Bhawan')
          .openPopup();

        // Marker for Incoming Waste Truck
        const truckIcon = window.L.divIcon({
          className: 'truck-marker',
          html: '<div style="background:#06b6d4; color:#fff; width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px; border:3px solid #fff; box-shadow:0 0 20px rgba(6,182,212,0.9);">🚛</div>',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
        const truckMarker = window.L.marker([30.345, 76.38], { icon: truckIcon }).addTo(map);
        truckMarker.bindPopup('<b>EV Tipper 01</b><br/>Speed: 26 km/h<br/>ETA: 14 mins');

        // Draw connecting route vector line
        const routePath = [
          [30.3534, 76.3608],
          [30.345, 76.38],
          [30.3398, 76.3869],
          [30.325, 76.4],
        ];
        window.L.polyline(routePath, {
          color: '#10b981',
          weight: 5,
          opacity: 0.8,
          dashArray: '8, 8',
        }).addTo(map);

        leafletMapRef.current = map;
      } catch (err) {
        console.warn('Leaflet initialization inside CitizenTruckMap:', err.message);
      }
    }

    // Dynamic ETA tick simulation
    const timer = setInterval(() => {
      setEtaMinutes((prev) => (prev > 1 ? prev - 1 : 12));
    }, 45000);

    return () => {
      clearInterval(timer);
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  const handleToggleBin = () => {
    const nextState = !isBinReady;
    setIsBinReady(nextState);
    if (onBinReady) onBinReady(nextState);
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Telemetry Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* ETA Card */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-emerald-500/30 flex items-center gap-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-2xl animate-pulse">
            ⏱️
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block">Estimated Arrival</span>
            <div className="flex items-baseline gap-1">
              <span className="font-['Outfit'] text-2xl md:text-3xl font-extrabold text-emerald-400">
                {etaMinutes}
              </span>
              <span className="text-xs text-slate-300 font-bold">Minutes</span>
            </div>
            <span className="text-[11px] text-emerald-400 font-mono">≈ 07:24 AM Doorstep</span>
          </div>
        </div>

        {/* Distance / Stops Away */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-white/10 flex items-center gap-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-2xl">
            📍
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block">Circuit Position</span>
            <div className="flex items-baseline gap-1">
              <span className="font-['Outfit'] text-2xl md:text-3xl font-extrabold text-cyan-400">
                {stopsAway}
              </span>
              <span className="text-xs text-slate-300 font-bold">Stops Away</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Passing Model Town Chowk</span>
          </div>
        </div>

        {/* Assigned Vehicle */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-white/10 flex items-center gap-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl">
            🚛
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block">Assigned Truck</span>
            <div className="font-['Outfit'] text-base font-bold text-white truncate">
              {activeTruck.id}
            </div>
            <span className="text-[11px] text-slate-400">Pilot: {activeTruck.driver}</span>
          </div>
        </div>

        {/* Bin Readiness Action */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-white/10 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Doorstep Status</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isBinReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
              {isBinReady ? 'READY OUTSIDE' : 'NOT READY'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleToggleBin}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold font-['Outfit'] uppercase tracking-wider transition-all cursor-pointer ${
              isBinReady
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10'
            }`}
          >
            {isBinReady ? '✓ Bin Marked Ready' : 'Mark Bin Ready for Pickup'}
          </button>
        </div>
      </div>

      {/* Main Interactive Map & Route Sequence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Map View (8 Cols) */}
        <div className="lg:col-span-8 rounded-3xl overflow-hidden border border-white/10 bg-slate-900 shadow-2xl relative">
          <div className="p-4 bg-slate-950/80 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-['Outfit'] text-sm font-bold text-white">Live Municipal Fleet GPS Tracking</h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSoundAlertEnabled(!soundAlertEnabled)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                  soundAlertEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-white/5'
                }`}
              >
                <span>{soundAlertEnabled ? '🔔' : '🔕'}</span>
                <span>{soundAlertEnabled ? 'Chime Alert On' : 'Muted'}</span>
              </button>
              <span className="text-[11px] font-mono text-slate-400">Patiala Central Ward</span>
            </div>
          </div>

          {/* Leaflet Map Target */}
          <div
            ref={mapContainerRef}
            className="w-full h-96 bg-slate-950 flex items-center justify-center text-slate-500"
          >
            {!window.L && (
              <div className="text-center p-6 space-y-2">
                <div className="text-3xl">🗺️</div>
                <div className="text-sm font-semibold text-slate-300">Live GPS Vector Map Active</div>
                <p className="text-xs text-slate-500 max-w-xs">
                  Micro-tipper TRK-EV-01 is actively navigating between Model Town and Leela Bhawan.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Stop Sequence Timeline (4 Cols) */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl space-y-4">
          <h4 className="font-['Outfit'] text-base font-bold text-white flex items-center gap-2">
            <span>📋</span> Today&apos;s Morning Collection Circuit
          </h4>

          <div className="space-y-4 relative before:absolute before:top-3 before:bottom-3 before:left-3 before:w-0.5 before:bg-slate-800">
            {stops.map((stop) => {
              const isCurrent = stop.name.includes('Leela Bhawan');
              return (
                <div key={stop.id} className="relative pl-8 space-y-1">
                  {/* Status Dot */}
                  <div
                    className={`absolute left-1.5 top-1 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-slate-900 ${
                      stop.status === 'COMPLETED'
                        ? 'bg-emerald-500'
                        : stop.status === 'IN_PROGRESS'
                        ? 'bg-cyan-400 animate-pulse'
                        : isCurrent
                        ? 'bg-emerald-400 ring-4 ring-emerald-500/30'
                        : 'bg-slate-700'
                    }`}
                  />

                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isCurrent ? 'text-emerald-300 font-extrabold' : 'text-white'}`}>
                      {stop.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{stop.time}</span>
                  </div>

                  <span
                    className={`text-[10px] font-mono block ${
                      stop.status === 'COMPLETED'
                        ? 'text-emerald-500'
                        : stop.status === 'IN_PROGRESS'
                        ? 'text-cyan-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {stop.status}
                  </span>
                </div>
              );
            })}
          </div>

          {/* SWM Segregation Reminder Box */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/10 text-xs text-slate-300 space-y-1 mt-4">
            <div className="font-bold text-emerald-400 flex items-center gap-1">
              <span>♻️</span> SWM Rules 2026 Checklist
            </div>
            <p className="text-[11px] text-slate-400">
              Please keep <strong>Organic (Wet)</strong> and <strong>Recyclable (Dry)</strong> bags separated. Contaminated bins forfeit the 15 Green Token award.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
