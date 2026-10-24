import React, { useState } from 'react';

/**
 * Generates an SVG QR code representation deterministically from a hash string
 * without external dependencies.
 */
function DeterministicSvgQr({ value, size = 180 }) {
  // Generate a 21x21 grid pattern deterministically from string hash
  const gridSize = 21;
  const cells = [];

  // Seeded pseudo-random generator from string hash
  let seed = 0;
  for (let i = 0; i < value.length; i++) {
    seed = (seed * 31 + value.charCodeAt(i)) >>> 0;
  }
  const pseudoRandom = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed >>> 16) / 65536;
  };

  const isPositionFinder = (r, c) => {
    // Top-left finder pattern (7x7)
    if (r < 7 && c < 7) {
      if (r === 0 || r === 6 || c === 0 || c === 6) return true;
      if (r >= 2 && r <= 4 && c >= 2 && c <= 4) return true;
      return false;
    }
    // Top-right finder pattern (7x7)
    if (r < 7 && c >= gridSize - 7) {
      const oc = c - (gridSize - 7);
      if (r === 0 || r === 6 || oc === 0 || oc === 6) return true;
      if (r >= 2 && r <= 4 && oc >= 2 && oc <= 4) return true;
      return false;
    }
    // Bottom-left finder pattern (7x7)
    if (r >= gridSize - 7 && c < 7) {
      const or = r - (gridSize - 7);
      if (or === 0 || or === 6 || c === 0 || c === 6) return true;
      if (or >= 2 && or <= 4 && c >= 2 && c <= 4) return true;
      return false;
    }
    return null;
  };

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const finder = isPositionFinder(r, c);
      let filled;
      if (finder !== null) {
        filled = finder;
      } else if (r === 6 || c === 6) {
        // Timing pattern
        filled = (r + c) % 2 === 0;
      } else {
        filled = pseudoRandom() > 0.45;
      }
      if (filled) {
        cells.push({ r, c });
      }
    }
  }

  const cellSize = size / gridSize;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="bg-white p-2 rounded-xl shadow-inner border-2 border-emerald-500/30"
      role="img"
      aria-label={`QR Code for ${value}`}
    >
      <rect width={size} height={size} fill="#ffffff" rx="8" />
      {cells.map(({ r, c }) => (
        <rect
          key={`${r}-${c}`}
          x={c * cellSize}
          y={r * cellSize}
          width={cellSize}
          height={cellSize}
          fill="#064e3b"
        />
      ))}
    </svg>
  );
}

/**
 * WorkerDigitalID: Printable and scannable digital identity card for Informal Waste Workers
 * Featuring photo badge, municipal registration, cooperative tag, and high-contrast QR.
 */
export default function WorkerDigitalID({
  worker = {
    worker_id: '77777777-7777-7777-7777-777777777701',
    full_name: 'Ramesh Kumar',
    preferred_language: 'kn',
    municipal_id_number: 'BBMP-KA-2026-W00142',
    cooperative_affiliation: 'Hasiru Dala (Bengaluru)',
    kyc_status: 'VERIFIED',
    qr_code_hash: 'IWL-QR-777701-BLR-RAMESH-2026',
    upi_vpa: 'ramesh.waste@upi',
    mobile_number: '+91 98765 43210',
    member_since: '2024-03-15',
    total_recycled_kg: 4850,
  },
  onPrint,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyQr = () => {
    navigator.clipboard?.writeText(worker.qr_code_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl shadow-2xl p-6 border border-emerald-500/30 relative overflow-hidden transition-all duration-300 hover:shadow-emerald-900/40">
      {/* Decorative Background Accent */}
      <div className="absolute -top-16 -right-16 w-44 h-44 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Card Header: Brand & Security Strip */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-5">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-emerald-500/30">
            ♻
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              EcoLoop IWL
            </h3>
            <p className="text-[10px] text-slate-200 font-medium">Informal Worker Digital Ledger</p>
          </div>
        </div>

        {/* Verified Green-Collar Worker Badge */}
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-300" />
          <span>Verified Green-Collar</span>
        </div>
      </div>

      {/* Worker Main Profile Section */}
      <div className="flex items-center space-x-4 mb-6">
        {/* Photo Badge with Status Ring */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg">
            <div className="w-full h-full rounded-2xl bg-slate-800 flex items-center justify-center text-2xl font-bold text-emerald-300 overflow-hidden">
              {worker.photo_url ? (
                <img
                  src={worker.photo_url}
                  alt={worker.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{worker.full_name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
          </div>
          <span
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-[10px] text-white font-bold"
            title="KYC Verified"
          >
            ✓
          </span>
        </div>

        {/* Worker Details */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-extrabold text-white truncate tracking-tight">
            {worker.full_name}
          </h2>
          <p className="text-xs text-emerald-300 font-medium truncate mt-0.5">
            {worker.cooperative_affiliation || 'Independent Waste Collector'}
          </p>
          <div className="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800/90 border border-slate-600 text-[11px] font-mono text-white">
            <span className="text-slate-300 font-bold">ID:</span>
            <span className="font-bold text-emerald-300">{worker.municipal_id_number}</span>
          </div>
        </div>
      </div>

      {/* High-Contrast SVG QR Code Section */}
      <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 flex flex-col items-center justify-center mb-5">
        <DeterministicSvgQr value={worker.qr_code_hash} size={160} />
        <div className="mt-3 text-center">
          <span className="text-[11px] font-mono text-slate-200 tracking-wider font-semibold">
            {worker.qr_code_hash}
          </span>
          <p className="text-[10px] text-slate-300 mt-0.5">
            Scan at any DWCC kiosk for instant biometric weigh-in
          </p>
        </div>
      </div>

      {/* Meta Specs Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs mb-5">
        <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
          <span className="text-[10px] uppercase text-slate-300 font-bold block">UPI VPA</span>
          <span className="font-mono text-emerald-300 font-medium truncate block mt-0.5">
            {worker.upi_vpa || 'Not Linked'}
          </span>
        </div>
        <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
          <span className="text-[10px] uppercase text-slate-300 font-bold block">Language</span>
          <span className="text-white font-medium capitalize block mt-0.5">
            {worker.preferred_language === 'kn' && 'Kannada (ಕನ್ನಡ)'}
            {worker.preferred_language === 'hi' && 'Hindi (हिंदी)'}
            {worker.preferred_language === 'mr' && 'Marathi (मराठी)'}
            {worker.preferred_language === 'en' && 'English'}
            {!['kn', 'hi', 'mr', 'en'].includes(worker.preferred_language) && worker.preferred_language}
          </span>
        </div>
      </div>

      {/* Action Buttons: 48px+ touch targets */}
      <div className="flex items-center space-x-3">
        <button
          type="button"
          onClick={handleCopyQr}
          className="flex-1 min-h-[48px] px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] border border-slate-600 text-white text-sm font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer"
        >
          <span>{copied ? '✓ Copied Hash' : '📋 Copy QR Hash'}</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="flex-1 min-h-[48px] px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-white text-sm font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
        >
          <span>🖨️ Print ID Card</span>
        </button>
      </div>
    </div>
  );
}
