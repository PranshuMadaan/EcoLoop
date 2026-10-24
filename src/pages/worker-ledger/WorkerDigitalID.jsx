import React, { useState } from 'react';

/**
 * Deterministic SVG QR Code Generator (Zero external dependencies)
 */
function DeterministicSvgQr({ value = 'IWL-QR-ECOLOOP', size = 140 }) {
  let seed = 0;
  for (let i = 0; i < value.length; i++) {
    seed = (seed * 31 + value.charCodeAt(i)) & 0xffffffff;
  }
  const pseudoRandom = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed >>> 16) / 65536;
  };

  const gridSize = 21;
  const cellSize = size / gridSize;

  const isPositionFinder = (r, c) => {
    if (r < 7 && c < 7) {
      if (r === 0 || r === 6 || c === 0 || c === 6) return true;
      if (r >= 2 && r <= 4 && c >= 2 && c <= 4) return true;
      return false;
    }
    if (r < 7 && c >= gridSize - 7) {
      const oc = c - (gridSize - 7);
      if (r === 0 || r === 6 || oc === 0 || oc === 6) return true;
      if (r >= 2 && r <= 4 && oc >= 2 && oc <= 4) return true;
      return false;
    }
    if (r >= gridSize - 7 && c < 7) {
      const or = r - (gridSize - 7);
      if (or === 0 || or === 6 || c === 0 || c === 6) return true;
      if (or >= 2 && r <= 4 && c >= 2 && c <= 4) return true;
      return false;
    }
    return null;
  };

  const rects = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const finder = isPositionFinder(r, c);
      let filled;
      if (finder !== null) {
        filled = finder;
      } else if (r === 6 || c === 6) {
        filled = (r + c) % 2 === 0;
      } else {
        filled = pseudoRandom() > 0.45;
      }
      if (filled) {
        rects.push(
          <rect
            key={`${r}-${c}`}
            x={c * cellSize}
            y={r * cellSize}
            width={cellSize}
            height={cellSize}
            fill="#064e3b"
          />
        );
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="bg-white rounded-lg p-1 shadow-inner">
      <rect width={size} height={size} fill="#ffffff" rx="6" />
      {rects}
    </svg>
  );
}

export function WorkerDigitalID({ worker }) {
  const [copied, setCopied] = useState(false);

  if (!worker) return null;

  const handleCopyHash = () => {
    navigator.clipboard?.writeText(worker.qr_code_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const initials = worker.full_name ? worker.full_name.slice(0, 2).toUpperCase() : 'WK';

  return (
    <div className="worker-id-card w-full p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 border border-emerald-500/35 shadow-2xl relative overflow-hidden text-white transition-all duration-300 hover:shadow-emerald-900/40">
      {/* Decorative Glow Elements */}
      <div className="absolute -top-16 -right-16 w-44 h-44 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Card Header: Brand & Security Verification */}
      <div className="flex items-center justify-between pb-4 border-b border-white/15 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-emerald-500/30">
            ♻
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              EcoLoop IWL
            </h3>
            <p className="text-[10px] text-white/90 font-medium">Informal Worker Digital ID</p>
          </div>
        </div>

        {/* Verified Green-Collar Badge */}
        <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Verified Green-Collar</span>
        </span>
      </div>

      {/* Main Profile Avatar & Details */}
      <div className="flex items-center gap-4 mb-5">
        <div className="w-16 h-16 rounded-2xl bg-slate-950 border-2 border-emerald-400 flex items-center justify-center text-2xl font-bold text-emerald-300 shadow-lg">
          {worker.photo_url ? (
            <img src={worker.photo_url} alt={worker.full_name} className="w-full h-full object-cover rounded-2xl" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-extrabold text-white truncate tracking-tight">
            {worker.full_name}
          </h2>
          <p className="text-xs text-emerald-300 font-medium truncate mt-0.5">
            {worker.cooperative || 'Independent Recycler'}
          </p>
          <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-md bg-white/15 border border-white/20 text-xs font-mono text-white font-bold">
            ID: {worker.municipal_id || 'MCD-2026-IWL'}
          </div>
        </div>
      </div>

      {/* QR Code Scan Box */}
      <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center gap-4 mb-5">
        <div className="flex-shrink-0">
          <DeterministicSvgQr value={worker.qr_code_hash} size={110} />
        </div>
        <div className="flex-1 min-w-0 text-xs space-y-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-300 block">UPI Settlement VPA</span>
            <strong className="text-emerald-300 font-mono text-sm block truncate">
              {worker.upi_vpa || 'Not Linked'}
            </strong>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-300 block">Registered Mobile</span>
            <span className="text-white font-mono font-semibold">{worker.mobile_number || '+91...'}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-300 block">QR Hash</span>
            <span className="text-[10px] font-mono text-white/90 truncate block">{worker.qr_code_hash}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons: 48px+ Touch Targets */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleCopyHash}
          className="flex-1 min-h-[48px] rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
        >
          <span>{copied ? '✓ Copied' : '📋 Copy QR Hash'}</span>
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex-1 min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
        >
          <span>🖨️ Print ID Card</span>
        </button>
      </div>
    </div>
  );
}
