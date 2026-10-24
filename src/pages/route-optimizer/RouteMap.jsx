import React from 'react';

/**
 * RouteMap: Cyber-Industrial Vector Map & Circuit Visualizer
 * Renders municipal DWCC hubs, EV fleet positions, route path polylines,
 * and geofenced collection zones with zero heavy map library overhead.
 */
export function RouteMap({
  waypoints = [],
  activeVehicle,
  selectedWaypoint,
  onSelectWaypoint,
}) {
  // Sort waypoints by stop order to draw the continuous circuit polyline
  const sortedWaypoints = [...waypoints].sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0));

  // Build SVG polyline points string: x1,y1 x2,y2 ...
  const polylinePoints = sortedWaypoints.map((wp) => `${wp.x},${wp.y}`).join(' ');

  const getGradeFill = (grade) => {
    switch (grade) {
      case 'PET_CLEAR': return '#10b981'; // Emerald
      case 'HDPE_RIGID': return '#0284c7'; // Sky/Cyan
      case 'CARDBOARD_OCC': return '#f59e0b'; // Amber
      case 'E_WASTE_PCB': return '#8b5cf6'; // Violet
      default: return '#10b981';
    }
  };

  return (
    <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/80 backdrop-blur-md shadow-xl flex flex-col justify-between">
      {/* Map Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200 dark:border-white/[0.08] mb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Live Telemetry & GIS Circuit
          </div>
          <h3 className="font-['Outfit'] font-bold text-lg text-slate-900 dark:text-white">
            Bengaluru South DWCC Geofence Circuit
          </h3>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> PET
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> HDPE
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> OCC
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500" /> E-Waste
          </span>
        </div>
      </div>

      {/* SVG Canvas Map Surface */}
      <div className="relative w-full h-[380px] sm:h-[440px] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
        {/* Background Radial Glow & Radar Grids */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-emerald-500/10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px] rounded-full border border-cyan-500/5 pointer-events-none" />

        <svg
          viewBox="0 0 500 450"
          className="w-full h-full select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Geofence Boundary Outline */}
          <polygon
            points="60,220 180,90 390,110 440,320 280,410 110,380"
            fill="rgba(16, 185, 129, 0.03)"
            stroke="rgba(16, 185, 129, 0.25)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Route Connection Paths (Glowing Backdrop) */}
          {polylinePoints && (
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="#059669"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.3"
            />
          )}

          {/* Optimized Route Vector Path */}
          {polylinePoints && (
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 4"
              className="animate-[dash_20s_linear_infinite]"
            />
          )}

          {/* Directional Connection Arrows */}
          {sortedWaypoints.map((wp, i) => {
            if (i === sortedWaypoints.length - 1) return null;
            const next = sortedWaypoints[i + 1];
            const midX = (wp.x + next.x) / 2;
            const midY = (wp.y + next.y) / 2;
            return (
              <circle
                key={`mid-${wp.id}`}
                cx={midX}
                cy={midY}
                r="3"
                fill="#34d399"
                className="animate-ping"
              />
            );
          })}

          {/* DWCC Collection Hub Nodes */}
          {sortedWaypoints.map((wp) => {
            const isSelected = selectedWaypoint?.id === wp.id;
            const isCollected = wp.status === 'COLLECTED';
            const gradeColor = getGradeFill(wp.material_grade);

            return (
              <g
                key={wp.id}
                transform={`translate(${wp.x}, ${wp.y})`}
                onClick={() => onSelectWaypoint(wp)}
                className="cursor-pointer transition-transform duration-200 hover:scale-125"
              >
                {/* Selected Pulse Ring */}
                {isSelected && (
                  <circle
                    r="22"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1.5"
                    className="animate-ping"
                    opacity="0.6"
                  />
                )}

                {/* Outer Ring */}
                <circle
                  r="14"
                  fill="#0f172a"
                  stroke={isSelected ? '#34d399' : gradeColor}
                  strokeWidth={isSelected ? '3' : '2'}
                  filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.5))"
                />

                {/* Inner Dot with Stop Order */}
                <circle r="9" fill={isCollected ? '#475569' : gradeColor} />
                <text
                  textAnchor="middle"
                  dy=".3em"
                  fontSize="9"
                  fontWeight="bold"
                  fill="#ffffff"
                  fontFamily="'Outfit', sans-serif"
                >
                  {isCollected ? '✓' : wp.stop_order}
                </text>

                {/* Label Badge */}
                <text
                  x="0"
                  y="24"
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="600"
                  fill={isSelected ? '#34d399' : '#cbd5e1'}
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                >
                  {wp.name.split(' ')[0]} ({wp.ready_weight_kg}kg)
                </text>
              </g>
            );
          })}

          {/* EV Fleet Vehicle Marker */}
          {activeVehicle && (
            <g
              transform={`translate(${activeVehicle.current_x || 230}, ${activeVehicle.current_y || 270})`}
              className="transition-all duration-700 pointer-events-none"
            >
              {/* Radar Ping */}
              <circle r="18" fill="rgba(34, 211, 238, 0.15)" stroke="#22d3ee" strokeWidth="1" className="animate-ping" />
              {/* Vehicle Body */}
              <circle r="11" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
              {/* EV Truck Icon Symbol */}
              <text textAnchor="middle" dy=".35em" fontSize="10" fill="#ffffff">
                ⚡
              </text>
              <rect
                x="-30"
                y="-26"
                width="60"
                height="14"
                rx="4"
                fill="#0f172a"
                stroke="#0284c7"
                strokeWidth="1"
              />
              <text textAnchor="middle" y="-16" fontSize="8" fontWeight="bold" fill="#38bdf8">
                {activeVehicle.id}
              </text>
            </g>
          )}
        </svg>

        {/* Map Overlay Floating Card: Selected Hub Details */}
        {selectedWaypoint && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md text-white text-xs shadow-2xl">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Stop #{selectedWaypoint.stop_order} • ETA {selectedWaypoint.eta_mins}m
              </span>
              <span className="font-mono text-xs text-sky-400 font-bold">
                {selectedWaypoint.ready_weight_kg} kg
              </span>
            </div>
            <h4 className="font-['Outfit'] font-bold text-sm text-white truncate">
              {selectedWaypoint.name}
            </h4>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">{selectedWaypoint.address}</p>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[10px] text-slate-300">
              <span>👤 {selectedWaypoint.contact_person}</span>
              <span className="font-mono text-emerald-400">{selectedWaypoint.phone}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RouteMap;
