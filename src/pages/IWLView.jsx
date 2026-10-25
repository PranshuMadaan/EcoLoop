import React, { useState } from 'react';
import WorkerDigitalID from '../components/iwl/WorkerDigitalID.jsx';
import VoiceWeighCalculator from '../components/iwl/VoiceWeighCalculator.jsx';
import InstantReceiptModal from '../components/iwl/InstantReceiptModal.jsx';

/**
 * IWLView - Informal Worker Digital Ledger (IWL) & Bonus Incentive Kiosk
 * Features:
 * 1. Tier 1 & Tier 2 Bonus Incentive Engine:
 *    - Tier 1 (+10% payout boost): Awarded for high-purity segregation (>90% clean single-grade).
 *    - Tier 2 (+15% payout boost): Awarded for consistent doorstep collection (>100 kg/week) and verified municipal ID.
 * 2. Printable Digital Worker ID with deterministic QR identity
 * 3. Voice Weigh Calculator (Bilingual English / Hindi)
 * 4. Instant Razorpay spot UPI payout receipts with 12-digit UTR numbers
 */
export default function IWLView({ standalone = false }) {
  const [activeTab, setActiveTab] = useState('bonus-calculator'); // 'bonus-calculator' | 'digital-id' | 'voice-weigh' | 'history'
  const [receiptModalData, setReceiptModalData] = useState(null);

  // Bonus Engine Inputs
  const [bonusParams, setBonusParams] = useState({
    materialGrade: 'PET_CLEAR',
    baseRatePerKg: 22.0,
    netWeightKg: 45.0,
    hasHighPurity: true, // Tier 1: >90% purity (+10%)
    hasVolumeAndId: true, // Tier 2: >100 kg/week + verified municipal ID (+15%)
  });

  const workerProfiles = [
    {
      id: 'iwl_picker_01',
      fullName: 'Sunita Devi',
      cooperative: 'Patiala Safai Sathi Union · Ward 14 DWCC Hub',
      municipalId: 'PMC-2026-IWL-0482',
      upiVpa: 'sunita.waste@sbi',
      mobileNumber: '+91 98765 43204',
      weeklyVolumeKg: 142.5,
      purityScore: 94.2,
      tier1Eligible: true,
      tier2Eligible: true,
    },
    {
      id: 'iwl_picker_02',
      fullName: 'Ramesh Kumar',
      cooperative: 'Model Town Green Aggregators',
      municipalId: 'PMC-2026-IWL-0518',
      upiVpa: 'ramesh.kumar@okhdfcbank',
      mobileNumber: '+91 98765 43210',
      weeklyVolumeKg: 85.0,
      purityScore: 91.5,
      tier1Eligible: true,
      tier2Eligible: false,
    },
  ];

  const [selectedWorker, setSelectedWorker] = useState(workerProfiles[0]);

  // Compute Bonus Multipliers
  const tier1Multiplier = bonusParams.hasHighPurity ? 0.10 : 0.0;
  const tier2Multiplier = bonusParams.hasVolumeAndId ? 0.15 : 0.0;
  const totalBonusMultiplier = tier1Multiplier + tier2Multiplier;

  const basePayout = bonusParams.netWeightKg * bonusParams.baseRatePerKg;
  const tier1BonusInr = basePayout * tier1Multiplier;
  const tier2BonusInr = basePayout * tier2Multiplier;
  const finalPayoutInr = basePayout + tier1BonusInr + tier2BonusInr;
  const effectiveRatePerKg = (finalPayoutInr / bonusParams.netWeightKg).toFixed(2);

  const handleTriggerPayout = () => {
    const utr = `26102${Math.floor(1000000 + Math.random() * 9000000)}`;
    const receipt = {
      weigh_in_id: `WI-${Math.floor(1000 + Math.random() * 9000)}`,
      created_at: new Date().toISOString(),
      worker_name: selectedWorker.fullName,
      municipal_id: selectedWorker.municipalId,
      upi_vpa: selectedWorker.upiVpa,
      material_grade: bonusParams.materialGrade,
      net_weight_kg: bonusParams.netWeightKg,
      rate_per_kg: bonusParams.baseRatePerKg,
      base_amount: basePayout,
      tier1_bonus: tier1BonusInr,
      tier2_bonus: tier2BonusInr,
      total_amount: finalPayoutInr,
      payout_status: 'PAID',
      utr_number: utr,
      dwcc_hub_name: selectedWorker.cooperative,
    };
    setReceiptModalData(receipt);
  };

  return (
    <div className={`w-full max-w-7xl mx-auto space-y-6 ${standalone ? 'py-6 px-4' : ''}`}>
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-md shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Tier 1 &amp; Tier 2 Bonus Incentive Engine Active
          </div>
          <h1 className="font-['Outfit'] text-2xl md:text-3xl font-extrabold text-white">
            Informal Worker Digital Ledger (IWL)
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl">
            Empowering informal waste pickers with fair-value weighbridge verification, digital municipal worker credentials, and direct spot UPI payouts boosted by segregation purity and volume bonuses.
          </p>
        </div>

        {/* Worker Switcher */}
        <div className="flex items-center gap-3 p-2 rounded-2xl bg-slate-950 border border-white/10">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-lg">
            👷
          </div>
          <div className="text-xs">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Active Worker</span>
            <select
              value={selectedWorker.id}
              onChange={(e) => {
                const w = workerProfiles.find((item) => item.id === e.target.value);
                if (w) setSelectedWorker(w);
              }}
              className="bg-transparent text-white font-bold focus:outline-none"
            >
              {workerProfiles.map((w) => (
                <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                  {w.fullName} ({w.municipalId})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-900 border border-white/10 max-w-2xl">
        {[
          { id: 'bonus-calculator', label: 'Bonus Incentive Engine', icon: '⚡' },
          { id: 'digital-id', label: 'Digital Worker ID', icon: '🆔' },
          { id: 'voice-weigh', label: 'Voice Weighbridge', icon: '🎙️' },
          { id: 'history', label: 'Payout History', icon: '📜' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === t.id
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* VIEW 1: TIER 1 & TIER 2 BONUS INCENTIVE ENGINE */}
      {activeTab === 'bonus-calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls & Inputs (7 Cols) */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-6">
            <div className="border-b border-white/10 pb-4">
              <h3 className="font-['Outfit'] text-lg font-bold text-white flex items-center gap-2">
                <span>⚡</span> SWM Payout Calculator with Tier 1 &amp; Tier 2 Boosts
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculate real-time scrap lot valuation with policy-mandated segregation &amp; volume incentives.
              </p>
            </div>

            {/* Material & Weight Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Material Grade</label>
                <select
                  value={bonusParams.materialGrade}
                  onChange={(e) => {
                    const grade = e.target.value;
                    const rates = { PET_CLEAR: 22.0, HDPE_RIGID: 28.0, CARDBOARD_OCC: 12.0, E_WASTE: 180.0 };
                    setBonusParams({
                      ...bonusParams,
                      materialGrade: grade,
                      baseRatePerKg: rates[grade] || 20.0,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs"
                >
                  <option value="PET_CLEAR">PET Clear Plastic (₹22/kg)</option>
                  <option value="HDPE_RIGID">HDPE Rigid Plastic (₹28/kg)</option>
                  <option value="CARDBOARD_OCC">Corrugated Cardboard (₹12/kg)</option>
                  <option value="E_WASTE">E-Waste Mixed (₹180/kg)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Net Weight (kg)</label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={bonusParams.netWeightKg}
                  onChange={(e) => setBonusParams({ ...bonusParams, netWeightKg: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Base Rate (₹/kg)</label>
                <input
                  type="number"
                  value={bonusParams.baseRatePerKg}
                  onChange={(e) => setBonusParams({ ...bonusParams, baseRatePerKg: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Tier 1 & Tier 2 Interactive Toggles */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Regulatory Bonus Qualifiers
              </span>

              {/* Tier 1 Box */}
              <div
                onClick={() => setBonusParams({ ...bonusParams, hasHighPurity: !bonusParams.hasHighPurity })}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  bonusParams.hasHighPurity
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 border-white/10 text-slate-400'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-['Outfit'] font-bold text-sm text-white">
                      Tier 1 Bonus: High-Purity Segregation
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400">
                      +10% Boost
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Awarded for &gt;90% single-grade purity with minimal label/cap contamination.
                  </p>
                </div>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                    bonusParams.hasHighPurity ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {bonusParams.hasHighPurity ? '✓' : ''}
                </div>
              </div>

              {/* Tier 2 Box */}
              <div
                onClick={() => setBonusParams({ ...bonusParams, hasVolumeAndId: !bonusParams.hasVolumeAndId })}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  bonusParams.hasVolumeAndId
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-950 border-white/10 text-slate-400'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-['Outfit'] font-bold text-sm text-white">
                      Tier 2 Bonus: Consistent Volume &amp; Municipal ID
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400">
                      +15% Boost
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Awarded for consistent doorstep aggregation (&gt;100 kg/week) and verified municipal badge.
                  </p>
                </div>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                    bonusParams.hasVolumeAndId ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {bonusParams.hasVolumeAndId ? '✓' : ''}
                </div>
              </div>
            </div>

            {/* Action Trigger */}
            <button
              type="button"
              onClick={handleTriggerPayout}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-['Outfit'] font-bold text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/25 cursor-pointer transition-all"
            >
              ⚡ Confirm &amp; Dispatch Instant UPI Spot Payout
            </button>
          </div>

          {/* Real-Time Payday Breakdown HUD (5 Cols) */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-5 sticky top-24">
            <h4 className="font-['Outfit'] text-base font-bold text-white flex items-center gap-2">
              <span>🧾</span> Instant Payout Slip Preview
            </h4>

            <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Picker Name:</span>
                <strong className="text-white">{selectedWorker.fullName}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Municipal ID:</span>
                <strong className="text-cyan-400 font-mono">{selectedWorker.municipalId}</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Base Scrap Payout:</span>
                <strong className="text-white font-mono">₹{basePayout.toFixed(2)}</strong>
              </div>

              {/* Tier 1 line */}
              <div className="flex justify-between text-emerald-400">
                <span>Tier 1 Segregation Bonus (+10%):</span>
                <strong className="font-mono">+₹{tier1BonusInr.toFixed(2)}</strong>
              </div>

              {/* Tier 2 line */}
              <div className="flex justify-between text-cyan-400">
                <span>Tier 2 Volume Incentive (+15%):</span>
                <strong className="font-mono">+₹{tier2BonusInr.toFixed(2)}</strong>
              </div>

              <div className="border-t border-white/10 pt-3 flex items-baseline justify-between">
                <div>
                  <span className="font-bold text-white block text-sm">Total Spot Payout:</span>
                  <span className="text-[10px] text-slate-500">Effective: ₹{effectiveRatePerKg} / kg</span>
                </div>
                <span className="font-['Outfit'] font-black text-2xl text-emerald-400">
                  ₹{finalPayoutInr.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <span>🛡️</span> Instant NPCI / Razorpay Auto-Transfer
              </div>
              <p className="text-[11px] text-slate-400">
                Proceeds settle directly into {selectedWorker.upiVpa} via 12-digit UTR bank clearance upon weighbridge confirmation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DIGITAL WORKER ID */}
      {activeTab === 'digital-id' && (
        <div className="flex justify-center py-4">
          <WorkerDigitalID
            worker={{
              full_name: selectedWorker.fullName,
              cooperative: selectedWorker.cooperative,
              municipal_id: selectedWorker.municipalId,
              upi_vpa: selectedWorker.upiVpa,
              mobile_number: selectedWorker.mobileNumber,
              qr_code_hash: `0x8f2a9c1e7d3b5064pmc${selectedWorker.municipalId.replace(/[^0-9]/g, '')}`,
            }}
          />
        </div>
      )}

      {/* VIEW 3: VOICE WEIGHBRIDGE CALCULATOR */}
      {activeTab === 'voice-weigh' && (
        <div className="max-w-2xl mx-auto">
          <VoiceWeighCalculator
            workerName={selectedWorker.fullName}
            onLogWeighIn={(data) => {
              setBonusParams({
                ...bonusParams,
                netWeightKg: data.net_weight,
                baseRatePerKg: data.rate_per_kg,
              });
              handleTriggerPayout();
            }}
          />
        </div>
      )}

      {/* VIEW 4: PAYOUT HISTORY */}
      {activeTab === 'history' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-4">
          <h3 className="font-['Outfit'] text-lg font-bold text-white flex items-center gap-2">
            <span>📜</span> Recent Spot Payout Receipts &amp; UTR Log
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3">Weigh-In ID</th>
                  <th className="p-3">Material</th>
                  <th className="p-3">Net Weight</th>
                  <th className="p-3">Base Payout</th>
                  <th className="p-3">Tier 1+2 Bonus</th>
                  <th className="p-3">Final Amount</th>
                  <th className="p-3">12-Digit UTR</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  { id: 'WI-7821', mat: 'PET_CLEAR', kg: 45.0, base: 990.0, bonus: 247.5, total: 1237.5, utr: '261024849201' },
                  { id: 'WI-7819', mat: 'HDPE_RIGID', kg: 38.5, base: 1078.0, bonus: 269.5, total: 1347.5, utr: '261024773829' },
                  { id: 'WI-7812', mat: 'CARDBOARD_OCC', kg: 82.0, base: 984.0, bonus: 246.0, total: 1230.0, utr: '261024661942' },
                ].map((row) => (
                  <tr key={row.id} className="hover:bg-slate-950/40">
                    <td className="p-3 font-mono font-bold text-emerald-400">{row.id}</td>
                    <td className="p-3 text-white font-medium">{row.mat}</td>
                    <td className="p-3 font-mono text-slate-300">{row.kg} kg</td>
                    <td className="p-3 font-mono text-slate-400">₹{row.base}</td>
                    <td className="p-3 font-mono text-cyan-400 font-bold">+₹{row.bonus}</td>
                    <td className="p-3 font-mono font-black text-emerald-400">₹{row.total}</td>
                    <td className="p-3 font-mono text-slate-400">{row.utr}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        PAID
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Instant Receipt Modal */}
      {receiptModalData && (
        <InstantReceiptModal
          receipt={receiptModalData}
          onClose={() => setReceiptModalData(null)}
        />
      )}
    </div>
  );
}
