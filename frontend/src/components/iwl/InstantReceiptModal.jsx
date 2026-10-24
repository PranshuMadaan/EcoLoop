import React, { useState } from 'react';

/**
 * InstantReceiptModal: Animated Confirmation Modal for Instant UPI Deposit
 * Displays green checkmark animation, amount in INR, 12-digit UTR number,
 * UPI VPA, and material breakdown receipt.
 */
export default function InstantReceiptModal({
  isOpen = true,
  onClose,
  receipt = {
    payout_id: 'pout_777701_test',
    amount_inr: 990.0,
    utr_number: '261024849201',
    razorpay_payout_id: 'pout_mock_iwl_7f8a9b2c3d4e',
    seller_upi_vpa: 'ramesh.waste@upi',
    worker_name: 'Ramesh Kumar',
    cooperative: 'Hasiru Dala (Bengaluru)',
    material_grade: 'PET_CLEAR',
    net_weight_kg: 45.0,
    rate_per_kg: 22.0,
    processed_at: new Date().toISOString(),
    dwcc_hub_name: 'Hasiru Dala DWCC Koramangala',
  },
}) {
  const [copiedUtr, setCopiedUtr] = useState(false);

  if (!isOpen || !receipt) return null;

  const handleCopyUtr = () => {
    navigator.clipboard?.writeText(receipt.utr_number);
    setCopiedUtr(true);
    setTimeout(() => setCopiedUtr(false), 2000);
  };

  const formattedDate = new Date(receipt.processed_at).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl text-white relative overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200">
        {/* Decorative Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Animated Green Checkmark Cue */}
        <div className="flex flex-col items-center justify-center pt-2 pb-4 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
            <svg
              className="w-10 h-10 text-emerald-400 animate-in zoom-in duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="3"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            UPI Deposit Confirmed
          </span>

          <div className="text-4xl font-black text-white mt-1 tracking-tight">
            ₹{Number(receipt.amount_inr || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>

          <p className="text-xs text-slate-400 mt-1">
            Transferred directly to <span className="font-mono text-emerald-300">{receipt.seller_upi_vpa}</span>
          </p>
        </div>

        {/* Transaction Summary Card */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3 mb-5 text-xs">
          {/* 12-Digit UTR Number with Copy Action */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-slate-400 font-medium">Bank UTR Number:</span>
            <div className="flex items-center space-x-1.5">
              <span className="font-mono font-bold text-emerald-400 tracking-wider">
                {receipt.utr_number}
              </span>
              <button
                type="button"
                onClick={handleCopyUtr}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
                title="Copy UTR Number"
              >
                {copiedUtr ? '✓' : '📋'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Recipient Worker:</span>
            <span className="font-bold text-white">{receipt.worker_name}</span>
          </div>

          {receipt.cooperative && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Cooperative:</span>
              <span className="text-slate-300">{receipt.cooperative}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Material Breakdown:</span>
            <span className="font-semibold text-slate-200">
              {receipt.material_grade?.replace(/_/g, ' ')} ({receipt.net_weight_kg} kg @ ₹{receipt.rate_per_kg}/kg)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-medium">Razorpay Payout ID:</span>
            <span className="font-mono text-slate-400 text-[11px] truncate max-w-[180px]">
              {receipt.razorpay_payout_id}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px] text-slate-400">
            <span>Timestamp:</span>
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Action Buttons: 48px+ touch targets */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 min-h-[48px] px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] border border-slate-700 text-slate-200 text-sm font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <span>🖨️ Print Receipt</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 text-sm font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
}
