import React, { useState } from 'react';
import VoucherSection from '../components/citizen/VoucherSection.jsx';
import CitizenTruckMap from '../components/citizen/CitizenTruckMap.jsx';

/**
 * CitizenDashboard - Resident Household Portal
 * High-contrast, citizen-centric dashboard:
 * 1. Live Waste Truck Tracker (CitizenTruckMap.jsx)
 * 2. Green Token & Municipal Voucher Section (VoucherSection.jsx)
 * Includes household profile badge, token wallet, and session logout.
 */
export default function CitizenDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('tracker'); // 'tracker' | 'vouchers'
  const [tokenBalance, setTokenBalance] = useState(user?.green_tokens || 450);

  const citizenName = user?.name || 'Priya Sharma';
  const citizenWard = user?.ward || 'Ward 14 - Leela Bhawan';
  const doorHash = user?.qr_hash || 'QR#7829-LEELA-PATIALA';

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
    <div className="min-h-screen bg-slate-950 text-white font-['Plus_Jakarta_Sans',sans-serif] selection:bg-emerald-500 selection:text-white">
      {/* Top Citizen Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-white/10 backdrop-blur-xl shadow-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand & Household Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white text-xl shadow-lg shadow-emerald-500/25">
              🏡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-['Outfit'] text-lg md:text-xl font-extrabold text-white">
                  EcoLoop <span className="text-emerald-400">Citizen Portal</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  Household
                </span>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>{citizenName}</span>
                <span>•</span>
                <span className="text-emerald-300 font-medium">{citizenWard}</span>
                <span className="hidden md:inline font-mono text-[10px] text-slate-500">({doorHash})</span>
              </div>
            </div>
          </div>

          {/* Nav Controls & Actions */}
          <div className="flex items-center gap-3">
            {/* Quick Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('tracker')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'tracker'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🚛</span>
                <span>Live Truck Tracker</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('vouchers')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'vouchers'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🌱</span>
                <span>Green Tokens ({tokenBalance})</span>
              </button>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              title="Logout from household session"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-white/10 transition-all cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Body View */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        {activeTab === 'tracker' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h2 className="font-['Outfit'] text-2xl font-extrabold text-white">
                  Doorstep Collection Live Radar
                </h2>
                <p className="text-xs text-slate-400">
                  Track Patiala Municipal Corporation collection tippers and prepare your segregated waste.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('vouchers')}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all"
              >
                <span>Reward Balance: {tokenBalance} Green Tokens</span>
                <span>→</span>
              </button>
            </div>

            <CitizenTruckMap
              citizenWard={citizenWard}
              onBinReady={() => setTokenBalance((prev) => prev + 5)}
            />
          </div>
        )}

        {activeTab === 'vouchers' && (
          <VoucherSection
            initialTokens={tokenBalance}
            onTokenChange={(newBal) => setTokenBalance(newBal)}
          />
        )}
      </main>

      {/* Bottom Status Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
        Patiala Municipal Corporation · SWM Door-to-Door Collection System · Clean Punjab Mission 2026
      </footer>
    </div>
  );
}
