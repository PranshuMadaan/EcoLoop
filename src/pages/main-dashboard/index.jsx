// src/pages/main-dashboard/index.jsx
import React, { useState } from 'react';
import B2BMarketplaceView from '../b2b-marketplace';
import WorkerLedgerView from '../worker-ledger';
import RouteOptimizerView from '../route-optimizer';

/**
 * MainDashboardShell - Master Central Command Host Shell for EcoLoop
 * Houses the 3 modular standalone pages:
 * 1. B2B Marketplace (Live auction board & DWCC inventory)
 * 2. Worker Ledger (Informal Waste Worker kiosk & digital ID)
 * 3. Route Optimizer (AI dynamic collection routing & EV dispatch)
 */
export default function MainDashboardShell() {
  const [activeTab, setActiveTab] = useState('b2b'); // 'b2b' | 'ledger' | 'optimizer'

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-emerald-500 selection:text-white font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navigation Shell */}
      <nav className="sticky top-0 z-40 flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-white/[0.08] backdrop-blur-xl gap-4 shadow-xl">
        {/* Brand & Central Command Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-emerald-500/25">
            ♻
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-['Outfit'] text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                EcoLoop Central Command
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                v2.0 Modular
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Municipal Waste Aggregation, Informal Recycler Inclusion & AI Fleet Telemetry
            </p>
          </div>
        </div>

        {/* Dynamic Navigation Module Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950/70 border border-white/10 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('b2b')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              activeTab === 'b2b'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span>🏪</span>
            <span>B2B Marketplace</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              activeTab === 'ledger'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span>📜</span>
            <span>Worker Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('optimizer')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              activeTab === 'optimizer'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <span>🗺️</span>
            <span>Route Optimizer</span>
          </button>
        </div>
      </nav>

      {/* Dynamic Sub-Page Mounting Area */}
      <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {activeTab === 'b2b' && <B2BMarketplaceView standalone={false} />}
        {activeTab === 'ledger' && <WorkerLedgerView standalone={false} />}
        {activeTab === 'optimizer' && <RouteOptimizerView standalone={false} />}
      </main>
    </div>
  );
}

export { MainDashboardShell };
