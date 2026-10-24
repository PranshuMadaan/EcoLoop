import React, { useState } from 'react';
import { useWorkerLedger } from './useWorkerLedger.js';
import { WorkerDigitalID } from './WorkerDigitalID.jsx';
import VoiceWeighCalculator from '../../components/iwl/VoiceWeighCalculator.jsx';
import InstantReceiptModal from '../../components/iwl/InstantReceiptModal.jsx';

/**
 * WorkerLedgerView - Informal Waste Worker (IWL) Digital Ledger & Kiosk
 * Standalone and mountable into EcoLoop Central Command shell.
 *
 * @param {boolean} standalone - Whether rendering as an independent page or inside dashboard shell
 */
export function WorkerLedgerView({ standalone = true }) {
  const {
    workers,
    selectedWorkerId,
    setSelectedWorkerId,
    workerData,
    loading,
    error,
    receiptModalData,
    setReceiptModalData,
    logWeighIn,
    triggerPayout,
  } = useWorkerLedger();

  const [activeTab, setActiveTab] = useState('weigh-in'); // 'weigh-in' | 'id-card' | 'history'

  const worker = workerData?.worker || {
    full_name: 'Ramesh Kumar',
    cooperative: 'Hasiru Dala (Bengaluru DWCC Hub)',
    municipal_id: 'BBMP-2026-IWL-0482',
    upi_vpa: 'ramesh.waste@upi',
    mobile_number: '+91 98765 43210',
    qr_code_hash: '0x8f2a9c1e7d3b5064bbmp0482',
    photo_url: '',
  };

  const summary = workerData?.summary || {
    total_weigh_ins: 42,
    total_kg: 1845.5,
    total_earnings_inr: 38920.0,
    pending_payout_inr: 1450.0,
  };

  const weighIns = workerData?.weigh_ins || [
    {
      weigh_in_id: 'wi_sample_01',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      material_grade: 'PET_CLEAR',
      gross_weight_kg: 32.5,
      tare_weight_kg: 2.5,
      net_weight_kg: 30.0,
      rate_per_kg: 22.0,
      total_amount: 660.0,
      payout_status: 'PAID',
      utr_number: '261024849201',
    },
    {
      weigh_in_id: 'wi_sample_02',
      created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      material_grade: 'HDPE_RIGID',
      gross_weight_kg: 48.0,
      tare_weight_kg: 3.0,
      net_weight_kg: 45.0,
      rate_per_kg: 18.5,
      total_amount: 832.5,
      payout_status: 'PAID',
      utr_number: '261024773829',
    },
    {
      weigh_in_id: 'wi_sample_03',
      created_at: new Date(Date.now() - 3600000 * 26).toISOString(),
      material_grade: 'CORRUGATED_CARDBOARD',
      gross_weight_kg: 72.0,
      tare_weight_kg: 4.0,
      net_weight_kg: 68.0,
      rate_per_kg: 12.0,
      total_amount: 816.0,
      payout_status: 'PENDING',
      utr_number: null,
    },
  ];

  const handleWeighInSubmit = async (formData) => {
    return await logWeighIn({
      material_grade: formData.material_grade,
      gross_weight_kg: formData.gross_weight,
      tare_weight_kg: formData.tare_weight,
      net_weight_kg: formData.net_weight,
      rate_per_kg: formData.rate_per_kg,
      total_payout_inr: formData.total_payout,
      dwcc_hub_name: formData.hub_name || 'Hasiru Dala Koramangala Hub',
    });
  };

  return (
    <div className={`w-full max-w-7xl mx-auto space-y-6 ${standalone ? 'min-h-screen py-6 px-4' : ''}`}>
      {/* Top Banner: Worker Selection & Hub Identity */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 backdrop-blur-md shadow-lg">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            DWCC Spot Weigh-In & UPI Disbursal Kiosk
          </div>
          <h1 className="font-['Outfit'] text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
            Informal Waste Worker (IWL) Ledger
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Empowering informal waste collectors with sovereign Green-Collar digital IDs, voice-enabled weigh-in calculators, and instant atomic UPI bank deposits.
          </p>
        </div>

        {/* Worker Selector Dropdown */}
        <div className="flex items-center gap-2">
          {workers && workers.length > 0 && (
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Select Worker</label>
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="h-11 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:border-emerald-500"
              >
                {workers.map((w) => (
                  <option key={w.worker_id} value={w.worker_id}>
                    {w.full_name} ({w.cooperative || 'Independent'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 backdrop-blur-md">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Total Tonnage Recycled</span>
          <div className="font-['Outfit'] text-2xl font-black text-slate-900 dark:text-white">
            {(summary.total_kg / 1000).toFixed(2)} <span className="text-sm font-semibold text-emerald-500">MT</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">
            {summary.total_kg?.toLocaleString('en-IN')} kg segregated
          </span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 backdrop-blur-md">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Total UPI Disbursed</span>
          <div className="font-['Outfit'] text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{Number(summary.total_earnings_inr || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">Instant zero-fee settlement</span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 backdrop-blur-md">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Pending Spot Payout</span>
          <div className="font-['Outfit'] text-2xl font-black text-amber-500">
            ₹{Number(summary.pending_payout_inr || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 font-mono mt-1 block">Ready for 1-click execution</span>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 backdrop-blur-md">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">CPCB Compliance ID</span>
          <div className="font-mono text-sm font-bold text-sky-400 truncate mt-1">
            {worker.municipal_id || 'BBMP-2026-IWL'}
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold mt-1 inline-flex items-center gap-1">
            ✓ Green-Collar Certified
          </span>
        </div>
      </div>

      {/* Main Split Section: Calculator / Digital ID / Transaction History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Voice Weigh-In Calculator (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <VoiceWeighCalculator
            onWeighInSubmit={handleWeighInSubmit}
            selectedWorker={worker}
            activeHubName="Hasiru Dala Koramangala DWCC Hub"
          />

          {/* Weigh-In Logs History */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/75 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-['Outfit'] font-bold text-lg text-slate-900 dark:text-white">
                  Recent Weigh-In Ledger
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time verifiable weigh records with instant UPI payout triggers
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {weighIns.length} Records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 uppercase text-[10px]">
                    <th className="pb-3 font-semibold">Material Grade</th>
                    <th className="pb-3 font-semibold">Net Weight</th>
                    <th className="pb-3 font-semibold">Rate</th>
                    <th className="pb-3 font-semibold">Total (₹)</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {weighIns.map((row) => (
                    <tr key={row.weigh_in_id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {row.material_grade}
                      </td>
                      <td className="py-3 font-mono">
                        {row.net_weight_kg} kg
                        <span className="text-[10px] text-slate-400 block">
                          (Gross: {row.gross_weight_kg}k, Tare: {row.tare_weight_kg}k)
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-500">₹{row.rate_per_kg}/kg</td>
                      <td className="py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(row.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3">
                        {row.payout_status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                            ✓ PAID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                            ⏱ PENDING
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {row.payout_status === 'PAID' ? (
                          <button
                            type="button"
                            onClick={() =>
                              setReceiptModalData({
                                amount_inr: row.total_amount,
                                utr_number: row.utr_number || '261024849201',
                                material_grade: row.material_grade,
                                net_weight_kg: row.net_weight_kg,
                                rate_per_kg: row.rate_per_kg,
                                seller_upi_vpa: worker.upi_vpa,
                                worker_name: worker.full_name,
                                cooperative: worker.cooperative,
                                processed_at: row.created_at,
                                dwcc_hub_name: 'Hasiru Dala Koramangala Hub',
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] cursor-pointer"
                          >
                            Receipt
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => triggerPayout(row.weigh_in_id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-[11px] shadow-sm cursor-pointer"
                          >
                            Pay ₹{row.total_amount}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Worker Sovereign Digital ID Card (5 Cols) */}
        <div className="lg:col-span-5 sticky top-24 space-y-6">
          <WorkerDigitalID worker={worker} />

          {/* Environmental & Financial Inclusion Proof Panel */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/75 backdrop-blur-md shadow-xl text-xs space-y-4">
            <h4 className="font-['Outfit'] font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              Green-Collar Inclusion Ledger
            </h4>
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/[0.06] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">NPCI / UPI Protocol</span>
                <span className="font-mono text-emerald-400 font-bold">Direct-to-Bank VPA</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">CPCB Rule 2026</span>
                <span className="font-mono text-sky-400 font-bold">Section 13 Compliant</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">CO2 Abatement Est.</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {(summary.total_kg * 1.82).toFixed(1)} kg CO2e
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Verified informal recyclers receive instant 100% benchmark commodity payouts with no middleman brokerage deductions.
            </p>
          </div>
        </div>
      </div>

      {/* Animated Instant Receipt Modal */}
      <InstantReceiptModal
        isOpen={Boolean(receiptModalData)}
        onClose={() => setReceiptModalData(null)}
        receipt={receiptModalData}
      />
    </div>
  );
}

export default WorkerLedgerView;
export { useWorkerLedger };
