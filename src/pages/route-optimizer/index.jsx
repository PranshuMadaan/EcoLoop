import React from 'react';
import { useRouteStore } from './useRouteStore.js';
import { RouteMap } from './RouteMap.jsx';
import { RoutePlanner } from './RoutePlanner.jsx';
import { TruckFleetMonitor } from './TruckFleetMonitor.jsx';
import { DispatchActionModal } from './DispatchActionModal.jsx';

/**
 * RouteOptimizerView - AI Dynamic Scrap Collection Route Optimization & Dispatch
 * Standalone and mountable into EcoLoop Central Command shell.
 *
 * @param {boolean} standalone - Whether rendering as an independent page or inside dashboard shell
 */
export function RouteOptimizerView({ standalone = true }) {
  const {
    waypoints,
    fleet,
    selectedVehicleId,
    setSelectedVehicleId,
    activeVehicle,
    selectedWaypointId,
    setSelectedWaypointId,
    selectedWaypoint,
    isOptimizing,
    isDispatchModalOpen,
    setIsDispatchModalOpen,
    dispatchManifest,
    algorithmNotice,
    optimizationMetrics,
    totalVolumeKg,
    runRouteOptimization,
    dispatchActiveRoute,
    toggleWaypointStatus,
  } = useRouteStore();

  const handleConfirmDispatch = async (notes) => {
    await dispatchActiveRoute(notes);
    setIsDispatchModalOpen(false);
  };

  return (
    <div className={`w-full max-w-7xl mx-auto space-y-6 ${standalone ? 'min-h-screen py-6 px-4' : ''}`}>
      {/* Top Banner: Route Command Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 backdrop-blur-md shadow-lg">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            AI Dynamic Fleet Optimization
          </div>
          <h1 className="font-['Outfit'] text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
            Scrap Collection Route Optimizer
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Heuristic TSP routing engine optimizing daily municipal DWCC scrap aggregation circuits, minimizing dead-mileage and maximizing zero-tailpipe EV collection payload.
          </p>
        </div>

        {/* Quick Tonnage & Fleet Ticker */}
        <div className="flex items-center gap-4 p-2 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/[0.06] text-xs">
          <div className="px-3 py-1">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Active Circuit Load</span>
            <strong className="font-['Outfit'] text-base text-slate-900 dark:text-white">
              {(totalVolumeKg / 1000).toFixed(2)} MT
            </strong>
          </div>
          <div className="h-8 w-px bg-slate-300 dark:bg-slate-800" />
          <div className="px-3 py-1">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Assigned EV</span>
            <strong className="font-['Outfit'] text-base text-emerald-500">
              {activeVehicle?.id || 'TRK-EV-01'}
            </strong>
          </div>
        </div>
      </div>

      {/* Primary Split View: Visual GIS Vector Circuit (Left) & Route Planner Engine (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Vector Map & Fleet Status (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <RouteMap
            waypoints={waypoints}
            activeVehicle={activeVehicle}
            selectedWaypoint={selectedWaypoint}
            onSelectWaypoint={(wp) => setSelectedWaypointId(wp.id)}
          />

          {/* EV Fleet Telemetry & Battery Monitor */}
          <TruckFleetMonitor
            fleet={fleet}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={setSelectedVehicleId}
          />
        </div>

        {/* Right: Route Planner & Dynamic TSP HUD (5 Cols) */}
        <div className="lg:col-span-5 sticky top-24">
          <RoutePlanner
            waypoints={waypoints}
            optimizationMetrics={optimizationMetrics}
            isOptimizing={isOptimizing}
            algorithmNotice={algorithmNotice}
            onRunOptimization={runRouteOptimization}
            onOpenDispatchModal={() => setIsDispatchModalOpen(true)}
            onToggleWaypointStatus={toggleWaypointStatus}
            onSelectWaypoint={(wp) => setSelectedWaypointId(wp.id)}
            selectedWaypointId={selectedWaypointId}
          />
        </div>
      </div>

      {/* Dispatch Action Modal */}
      <DispatchActionModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        manifest={dispatchManifest}
        onConfirmDispatch={handleConfirmDispatch}
      />
    </div>
  );
}

export default RouteOptimizerView;
export { useRouteStore };
