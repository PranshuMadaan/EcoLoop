import React from 'react';

export function AcceptBidAction({ receipt, onClose, onVerifyOnLedger }) {
  if (!receipt) return null;

  const payout = receipt.payout_details || {};
  const eprToken = receipt.epr_token || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-2xl relative text-white">
        {/* Settlement Success Badge */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-2xl text-emerald-400 mb-3 shadow-lg shadow-emerald-500/30 animate-bounce">
            ✓
          </div>
          <h3 className="font-['Outfit'] font-extrabold text-xl text-white">Escrow Settlement Executed</h3>
          <p className="text-xs text-slate-400">Atomic liquidation complete with instant UPI split and CPCB EPR minting.</p>
        </div>

        {/* Financial Split Breakdown */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 mb-4 text-xs">
          <div className="flex justify-between items-baseline pb-2.5 border-b border-white/10 mb-3">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">Gross Auction Settlement</span>
            <span className="font-['Outfit'] font-black text-emerald-400 text-lg">
              ₹{Number(payout.gross_amount || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-300">Seller Net Proceeds (98.5%)</span>
              <strong className="text-emerald-400 font-mono">₹{Number(payout.seller_net_payout || 0).toLocaleString('en-IN')}</strong>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Platform Clearing Fee (1.0%)</span>
              <span className="font-mono text-sky-400">₹{Number(payout.platform_commission || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Waste Picker Welfare Pool (0.5%)</span>
              <span className="font-mono text-amber-400">₹{Number(payout.picker_welfare_fund || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Cryptographic Ledger Audit Proof */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/10 mb-5 font-mono text-[11px] space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500 uppercase">BANK RRN</span>
            <span className="text-white font-semibold">{payout.bank_rrn || 'RRN-NPCI-SETTLED'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 uppercase">UPI TXN ID</span>
            <span className="text-white font-semibold">{payout.gateway_transaction_id || 'UPI-ESCROW-2026'}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-white/10">
            <span className="text-slate-500 uppercase">CPCB LEDGER HASH</span>
            <span className="text-sky-400 truncate max-w-[220px]">
              {eprToken.cpcb_certificate_hash || '0x4f8a...cpcb'}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Close Receipt
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onVerifyOnLedger && eprToken.cpcb_certificate_hash) {
                onVerifyOnLedger(eprToken.cpcb_certificate_hash);
              }
            }}
            className="flex-1 min-h-[44px] rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Verify on Ledger →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
