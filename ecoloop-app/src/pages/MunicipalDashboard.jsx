import React, { useState } from 'react';
import { 
  Compass, 
  ShoppingBag, 
  BookOpen, 
  Layers, 
  LogOut, 
  ShieldCheck, 
  Bell, 
  Building2, 
  Activity,
  Recycle,
  UserCheck
} from 'lucide-react';
import SROView from './SROView';
import B2BView from './B2BView';
import IWLView from './IWLView';
import SegregationView from './SegregationView';

export default function MunicipalDashboard({ user, onLogout }) {
  // Global municipal navigation tab: 'sro', 'b2b', 'ledger', 'segregation'
  const [activeTab, setActiveTab] = useState('sro');

  // Human readable role label
  const getRoleLabel = (role) => {
    switch (role) {
      case 'ULB_OFFICIAL':
      case 'ULB':
        return 'ULB Official (Municipal Solid Waste)';
      case 'DWCC_OPERATOR':
      case 'DWCC':
        return 'DWCC Recovery Facility Hub';
      case 'RECYCLER':
      case 'Recycler':
        return 'Certified Recycler Partner';
      case 'WASTE_PICKER':
      case 'Picker':
        return 'Informal Worker Cooperative Lead';
      default:
        return 'Municipal Command Authority';
    }
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-white flex flex-col">
      {/* Top Global Command Header */}
      <header className="sticky top-0 z-40 bg-[#0a0e17]/95 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            
            {/* Left: Brand & Organization */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[2px] shadow-md shadow-emerald-950/40">
                <div className="w-full h-full bg-[#0a0e17] rounded-[10px] flex items-center justify-center">
                  <Recycle className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-xl tracking-tight text-white font-['Outfit']">
                    Eco<span className="text-emerald-400">Loop</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    MUNICIPAL COMMAND
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium truncate max-w-[220px] sm:max-w-none">
                  {user?.organization_name || 'Pune Municipal Corporation (PMC)'} • Ward 14
                </p>
              </div>
            </div>

            {/* ============================================================= */}
            {/* GLOBAL MUNICIPAL NAV: [ Route Optimizer ] [ B2B ] [ Ledger ] [ Segregation ] */}
            {/* Accessible from any section of the application              */}
            {/* ============================================================= */}
            <nav className="hidden md:flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('sro')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'sro'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black shadow-md shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Route Optimizer</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('b2b')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'b2b'
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-slate-950 font-black shadow-md shadow-teal-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>B2B Marketplace</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'ledger'
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-black shadow-md shadow-indigo-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Worker Ledger</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('segregation')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'segregation'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black shadow-md shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Segregation</span>
              </button>
            </nav>

            {/* Right: User Role Badge, Live Status & Logout */}
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-2 text-xs font-mono bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>{getRoleLabel(user?.role)}</span>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/80 hover:text-rose-300 border border-slate-800 hover:border-rose-800 text-slate-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Log Out Session"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Strip (below 768px) */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-800 py-2 px-2 bg-slate-950/90 text-xs font-mono">
          <button
            onClick={() => setActiveTab('sro')}
            className={`px-2 py-1 rounded-lg ${activeTab === 'sro' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'}`}
          >
            SRO
          </button>
          <button
            onClick={() => setActiveTab('b2b')}
            className={`px-2 py-1 rounded-lg ${activeTab === 'b2b' ? 'bg-teal-500 text-slate-950 font-bold' : 'text-slate-400'}`}
          >
            B2B
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-2 py-1 rounded-lg ${activeTab === 'ledger' ? 'bg-indigo-500 text-white font-bold' : 'text-slate-400'}`}
          >
            Ledger
          </button>
          <button
            onClick={() => setActiveTab('segregation')}
            className={`px-2 py-1 rounded-lg ${activeTab === 'segregation' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'}`}
          >
            Sort
          </button>
        </div>
      </header>

      {/* Main View Area (Mounts cleanly without stacking!) */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'sro' && <SROView />}
        {activeTab === 'b2b' && <B2BView />}
        {activeTab === 'ledger' && <IWLView />}
        {activeTab === 'segregation' && <SegregationView />}
      </main>

      {/* Global Municipal Command Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-3.5 px-4 text-center text-xs font-mono text-slate-500">
        <span>EcoLoop Master Command • Pune Municipal Corporation • Mitsui &amp; Co. Circular Track</span>
      </footer>
    </div>
  );
}
