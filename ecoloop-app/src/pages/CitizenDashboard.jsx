import React, { useState } from 'react';
import { 
  Home, 
  Gift, 
  Truck, 
  HelpCircle, 
  LogOut, 
  QrCode, 
  Coins, 
  CheckCircle2, 
  Recycle, 
  Sparkles,
  Award
} from 'lucide-react';
import VoucherSection from './VoucherSection';
import CitizenTruckMap from './CitizenTruckMap';

export default function CitizenDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('vouchers'); // 'vouchers' or 'tracker' or 'guide'
  const [tokenBalance, setTokenBalance] = useState(user?.green_tokens || 1450);

  return (
    <div className="min-h-screen bg-[#070b12] text-white flex flex-col">
      {/* Top Citizen Header Bar */}
      <header className="sticky top-0 z-40 bg-[#0a0e17]/95 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            
            {/* Left: Brand & Household Name */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-400 p-[2px] shadow-md shadow-cyan-950/40">
                <div className="w-full h-full bg-[#0a0e17] rounded-[10px] flex items-center justify-center">
                  <Home className="w-5 h-5 text-cyan-400" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-xl tracking-tight text-white font-['Outfit']">
                    Eco<span className="text-cyan-400">Loop</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    CITIZEN PORTAL
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium truncate max-w-[200px] sm:max-w-none">
                  {user?.household_name || 'Deshmukh Household (Flat 402)'} • {user?.ward_number || 'Ward 14 Pune'}
                </p>
              </div>
            </div>

            {/* Center Navigation Buttons */}
            <nav className="hidden sm:flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('vouchers')}
                className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'vouchers'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Gift className="w-4 h-4" />
                <span>Tokens &amp; Vouchers</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tracker')}
                className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'tracker'
                    ? 'bg-gradient-to-r from-cyan-500 to-sky-600 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Live Truck Tracker</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'guide'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Segregation Guide</span>
              </button>
            </nav>

            {/* Right: Balance HUD & Logout */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-800 px-3 py-1.5 rounded-xl text-xs font-mono">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white">{tokenBalance}</span>
                <span className="text-emerald-400">GT</span>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/80 hover:text-rose-300 border border-slate-800 text-slate-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Log Out Session"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Strip */}
        <div className="sm:hidden flex items-center justify-around border-t border-slate-800 py-2 px-2 bg-slate-950/90 text-xs font-mono">
          <button
            onClick={() => setActiveTab('vouchers')}
            className={`px-3 py-1 rounded-lg ${activeTab === 'vouchers' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'}`}
          >
            Tokens
          </button>
          <button
            onClick={() => setActiveTab('tracker')}
            className={`px-3 py-1 rounded-lg ${activeTab === 'tracker' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'}`}
          >
            Truck Tracker
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1 rounded-lg ${activeTab === 'guide' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'}`}
          >
            Guide
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Household Identity Sub-header */}
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 font-mono">
            <span className="p-1.5 bg-slate-900 rounded-lg border border-slate-800 text-cyan-400">
              <QrCode className="w-4 h-4" />
            </span>
            <span>
              Door QR Hash: <strong className="text-white">{user?.door_qr_hash || '#PUN-W14-D402'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-emerald-400 font-mono">
            <CheckCircle2 className="w-4 h-4" />
            <span>Today's Segregation Audit: Grade A Verified (+15 GT Added)</span>
          </div>
        </div>

        {/* Tab Mounting */}
        {activeTab === 'vouchers' && (
          <VoucherSection 
            tokenBalance={tokenBalance} 
            onRedeemTokens={(newBal) => setTokenBalance(newBal)} 
          />
        )}

        {activeTab === 'tracker' && <CitizenTruckMap />}

        {activeTab === 'guide' && (
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
            <div>
              <h3 className="text-xl font-bold font-['Outfit'] text-white">
                3-Way Source Waste Segregation Guide
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Proper separation directly supports informal waste pickers and earns you 15 Green Tokens daily.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-3">
                <span className="text-xs font-mono font-bold text-emerald-400 uppercase">1. Green Bin (Wet Organic)</span>
                <p className="text-xs text-slate-300">
                  Kitchen food scraps, vegetable peels, tea leaves, garden leaves, and non-packaged bio-waste.
                </p>
                <div className="text-[11px] font-mono text-emerald-300 pt-2 border-t border-emerald-800/40">
                  Converted to Ward Biomethanisation fuel.
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 space-y-3">
                <span className="text-xs font-mono font-bold text-cyan-400 uppercase">2. Blue Bin (Dry Recyclables)</span>
                <p className="text-xs text-slate-300">
                  Clean plastic bottles (PET), cardboard packaging, milk pouches, tins, glass bottles, and dry paper.
                </p>
                <div className="text-[11px] font-mono text-cyan-300 pt-2 border-t border-cyan-800/40">
                  Auctioned on EcoLoop B2B Marketplace.
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-3">
                <span className="text-xs font-mono font-bold text-rose-400 uppercase">3. Red Bin (Domestic Hazardous)</span>
                <p className="text-xs text-slate-300">
                  Sanitary items, broken CFL bulbs, expired medicines, batteries, insecticide cans, and razor blades.
                </p>
                <div className="text-[11px] font-mono text-rose-300 pt-2 border-t border-rose-800/40">
                  Safely isolated to prevent picker needle injuries.
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Citizen Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-4 px-4 text-center text-xs font-mono text-slate-500">
        <span>EcoLoop Citizen Portal • Clean Cities SBM 2.0 • Pune Municipal Corporation</span>
      </footer>
    </div>
  );
}
