import React from 'react';

/**
 * TruckFleetMonitor: EV Collection Fleet Telemetry & Driver Panel
 */
export function TruckFleetMonitor({
  fleet = [],
  selectedVehicleId,
  onSelectVehicle,
}) {
  const getBatteryColor = (pct) => {
    if (pct >= 70) return 'text-emerald-500 bg-emerald-500';
    if (pct >= 40) return 'text-amber-500 bg-amber-500';
    return 'text-rose-500 bg-rose-500';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPTIMIZED_ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            En Route
          </span>
        );
      case 'DISPATCHED_IN_CIRCUIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 border border-sky-500/30 text-sky-400">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            Dispatched
          </span>
        );
      case 'STANDBY_CHARGING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
            ⚡ Charging (64%)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/80 backdrop-blur-md shadow-xl text-xs">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/[0.08] mb-4">
        <div>
          <h3 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white">
            EV Fleet Command & Telemetry
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Real-time payload utilization & battery state of health
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {fleet.length} EV Vehicles
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fleet.map((v) => {
          const isSelected = selectedVehicleId === v.id;
          const payloadPct = Math.round((v.current_payload_kg / v.capacity_kg) * 100);

          return (
            <div
              key={v.id}
              onClick={() => onSelectVehicle(v.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-lg ring-1 ring-emerald-500/40'
                  : 'border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-950/50 hover:border-emerald-500/30'
              }`}
            >
              {/* Vehicle Title & Status */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white">
                      {v.id}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">{v.license_plate}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                    {v.model}
                  </span>
                </div>
                {getStatusBadge(v.status)}
              </div>

              {/* Battery & Payload Telemetry */}
              <div className="space-y-2 mt-3 pt-3 border-t border-slate-200 dark:border-white/[0.06]">
                {/* Battery Bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>⚡ Battery SoC</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{v.battery_pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getBatteryColor(v.battery_pct)}`}
                      style={{ width: `${v.battery_pct}%` }}
                    />
                  </div>
                </div>

                {/* Payload Bar */}
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>📦 Current Payload ({payloadPct}%)</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                      {v.current_payload_kg} / {v.capacity_kg} kg
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${payloadPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Driver Contact Footer */}
              <div className="flex items-center justify-between mt-3 pt-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span>Driver: <strong className="text-slate-700 dark:text-slate-200">{v.driver_name}</strong></span>
                <span className="font-mono text-emerald-500">{v.driver_phone}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TruckFleetMonitor;
