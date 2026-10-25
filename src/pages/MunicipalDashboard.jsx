import React, { useState } from 'react';
import SROView from './SROView.jsx';
import B2BView from './B2BView.jsx';
import IWLView from './IWLView.jsx';
import SegregationView from './SegregationView.jsx';

/**
 * MunicipalDashboard - Central Command Shell for Municipal & Industrial Enterprise Users
 * Features Global Municipal Navigation bar with 4 core feature buttons:
 * 1. [ 🗺️ Route Optimizer ] -> SROView.jsx
 * 2. [ ⚖️ B2B ]             -> B2BView.jsx
 * 3. [ 🆔 Ledger ]          -> IWLView.jsx
 * 4. [ ♻️ Segregation ]     -> SegregationView.jsx
 *
 * Enforces NO STACKED SCROLLING by mounting only the active view.
 */
export default function MunicipalDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('sro'); // 'sro' | 'b2b' | 'iwl' | 'segregation'

  const userName = user?.name || user?.organization_name || 'Municipal Officer';
  const userRole = user?.role || 'ULB_OFFICIAL';
  const userHub = user?.hub || 'Patiala Municipal Corporation HQ';

  const roleEmoji = {
    ULB_OFFICIAL: '🏛️',
    ULB: '🏛️',
    DWCC_OPERATOR: '🏢',
    DWCC: '🏢',
    RECYCLER: '🏭',
    Recycler: '🏭',
    WASTE_PICKER: '👷',
    Picker: '👷',
  }[userRole] || '👤';

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.warn('Logout API error:', err.message);
    }
    if (onLogout) onLogout();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-['Plus_Jakarta_Sans',sans-serif] selection:bg-emerald-500 selection:text-white flex flex-col">
      {/* GLOBAL MUNICIPAL NAV SHELL */}
      <header className="sticky top-0 z-40 bg-slate-900/95 border-b border-white/10 backdrop-blur-xl shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3.5 flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Brand & Central Command Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xl shadow-lg shadow-emerald-500/25">
              ♻️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-['Outfit'] text-lg md:text-xl font-extrabold text-white">
                  EcoLoop <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Command</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  Municipal v2.0
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>{roleEmoji}</span>
                <span className="font-semibold text-white">{userName}</span>
                <span>•</span>
                <span className="text-slate-400 text-[11px]">{userRole}</span>
                <span className="hidden md:inline text-slate-500 text-[11px]">({userHub})</span>
              </div>
            </div>
          </div>

          {/* 4 MAIN GLOBAL FEATURE BUTTONS (Accessible from any section) */}
          <nav className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950 border border-white/10 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('sro')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                activeTab === 'sro'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🗺️</span>
              <span>Route Optimizer</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('b2b')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                activeTab === 'b2b'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>⚖️</span>
              <span>B2B Marketplace</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('iwl')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                activeTab === 'iwl'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🆔</span>
              <span>Worker Ledger</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('segregation')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                activeTab === 'segregation'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>♻️</span>
              <span>Segregation Engine</span>
            </button>
          </nav>

          {/* User Controls */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-white/10 transition-all cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* DYNAMIC VIEW RENDERER (Cleanly unmounts inactive views, NO STACKED SCROLLING) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6">
        {activeTab === 'sro' && <SROView standalone={false} />}
        {activeTab === 'b2b' && <B2BView standalone={false} />}
        {activeTab === 'iwl' && <IWLView standalone={false} />}
        {activeTab === 'segregation' && <SegregationView standalone={false} />}
      </main>

      {/* Bottom Municipal Status Bar */}
      <footer className="border-t border-white/5 bg-slate-900/60 py-4 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Patiala Municipal Corporation Hub Live Feed</span>
        </div>
        <span className="font-mono text-[11px]">SWM Rules 2026 Compliant · CPCB EPR Registry Connected</span>
      </footer>
    </div>
  );
}
