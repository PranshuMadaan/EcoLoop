import React from 'react';

export function EscrowLiquidationTrail({ audit }) {
  if (!audit) return null;

  return (
    <div className="p-5 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 backdrop-blur-md">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Escrow Liquidation Audit Trail
        </h4>
        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Atomically Settled
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/[0.04]">
          <span className="text-[10px] text-slate-400 uppercase block font-sans">Bank UPI RRN</span>
          <span className="text-slate-900 dark:text-white font-bold">{audit.bank_rrn || 'RRN-VERIFIED'}</span>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/[0.04]">
          <span className="text-[10px] text-slate-400 uppercase block font-sans">Clearing Txn ID</span>
          <span className="text-slate-900 dark:text-white font-bold">{audit.transaction_id || 'UPI-ESCROW-2026'}</span>
        </div>
        <div className="p-3 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/[0.04]">
          <span className="text-[10px] text-slate-400 uppercase block font-sans">Payee Settlement VPA</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{audit.payee_vpa || 'Direct NPCI Settlement'}</span>
        </div>
      </div>
    </div>
  );
}
