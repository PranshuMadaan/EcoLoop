import React from 'react';

/**
 * RoutePlanner: Optimization Engine HUD & Itinerary Controller
 */
export function RoutePlanner({
  waypoints = [],
  optimizationMetrics,
  isOptimizing,
  algorithmNotice,
  onRunOptimization,
  onOpenDispatchModal,
  onToggleWaypointStatus,
  onSelectWaypoint,
  selectedWaypointId,
}) {
  const sortedWaypoints = [...waypoints].sort((a, b) => (a.stop_order || 0) - (b.stop_order || 0));

  const getGradeBadge = (grade) => {
    switch (grade) {
      case 'PET_CLEAR':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">PET</span>;
      case 'HDPE_RIGID':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/15 border border-sky-500/30 text-sky-400">HDPE</span>;
      case 'CARDBOARD_OCC':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">OCC</span>;
      case 'E_WASTE_PCB':
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-500/15 border border-violet-500/30 text-violet-400">E-WASTE</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400">{grade}</span>;
    }
  };

  return (
    <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/85 backdrop-blur-md shadow-xl flex flex-col justify-between">
      <div>
        {/* Header and Algorithm Indicator */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-white/[0.08] mb-4">
          <div>
            <h3 className="font-['Outfit'] font-bold text-lg text-slate-900 dark:text-white">
              AI Route Optimization Engine
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Clarke-Wright Savings & Dynamic TSP Heuristics
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
            {algorithmNotice}
          </span>
        </div>

        {/* Dynamic Metric Badges Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/[0.06]">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Optimized Distance</span>
            <div className="font-['Outfit'] text-2xl font-black text-slate-900 dark:text-white">
              {optimizationMetrics.optimized_distance_km} <span className="text-xs font-semibold text-slate-400">km</span>
            </div>
            <span className="text-[10px] text-emerald-500 font-semibold block mt-0.5">
              ↓ {optimizationMetrics.distance_saved_pct}% ({optimizationMetrics.distance_saved_km} km saved)
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/[0.06]">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Carbon Emissions Saved</span>
            <div className="font-['Outfit'] text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {optimizationMetrics.co2_saved_kg} <span className="text-xs font-semibold text-slate-400">kg CO2e</span>
            </div>
            <span className="text-[10px] text-sky-400 font-semibold block mt-0.5">
              ⚡ 100% Zero-tailpipe EV fleet
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/[0.06]">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Est. Circuit Duration</span>
            <div className="font-['Outfit'] text-2xl font-black text-slate-900 dark:text-white">
              {optimizationMetrics.est_duration_mins} <span className="text-xs font-semibold text-slate-400">mins</span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Turnaround: ~1h 38m
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/[0.06]">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Fleet Load Factor</span>
            <div className="font-['Outfit'] text-2xl font-black text-slate-900 dark:text-white">
              {optimizationMetrics.utilization_pct}%
            </div>
            <span className="text-[10px] text-amber-500 font-semibold block mt-0.5">
              {(optimizationMetrics.total_payload_kg / 1000).toFixed(2)} MT / {(optimizationMetrics.fleet_capacity_kg / 1000).toFixed(1)} MT
            </span>
          </div>
        </div>

        {/* Action Triggers: Run AI & Dispatch Manifest */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
          <button
            type="button"
            disabled={isOptimizing}
            onClick={onRunOptimization}
            className="w-full sm:flex-1 min-h-[48px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs border border-slate-300 dark:border-white/10 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <span>{isOptimizing ? '🔄 Running Genetic Solver...' : '⚡ Re-Calculate AI Route'}</span>
          </button>
          <button
            type="button"
            onClick={onOpenDispatchModal}
            className="w-full sm:flex-1 min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <span>🚀 Dispatch to Driver</span>
          </button>
        </div>

        {/* Turn-by-Turn Waypoint Circuit Itinerary */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Turn-by-Turn Waypoint Sequence ({sortedWaypoints.length} Hubs)
            </h4>
            <span className="text-[11px] text-slate-400">Click to inspect</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {sortedWaypoints.map((wp) => {
              const isSelected = selectedWaypointId === wp.id;
              const isCollected = wp.status === 'COLLECTED';

              return (
                <div
                  key={wp.id}
                  onClick={() => onSelectWaypoint(wp)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                      : 'border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-950/40 hover:border-emerald-500/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Stop Number Circle */}
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                        isCollected
                          ? 'bg-slate-700 text-slate-400'
                          : 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      }`}
                    >
                      {isCollected ? '✓' : wp.stop_order}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold truncate text-xs ${isCollected ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                          {wp.name}
                        </span>
                        {getGradeBadge(wp.material_grade)}
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate">
                        ETA {wp.eta_mins} mins • 👤 {wp.contact_person}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">
                      {wp.ready_weight_kg} kg
                    </span>
                    <button
                      type="button"
                      title={isCollected ? 'Mark as Pending' : 'Mark as Collected'}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWaypointStatus(wp.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                        isCollected
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                      }`}
                    >
                      {isCollected ? 'Collected' : 'Collect'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoutePlanner;
