import React from 'react';

export function EprHashVerifier({ queryHash, onQueryChange, onVerify, loading, sampleHashes = [] }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (queryHash) onVerify(queryHash);
  };

  return (
    <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/75 backdrop-blur-md shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-['Outfit'] font-bold text-lg text-slate-900 dark:text-white">
            Cryptographic SHA-256 Ledger Audit
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Query the Central Pollution Control Board (CPCB) and MoEFCC National EPR compliance registry
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Ledger Node: Online & Synchronized</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={queryHash}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Paste 64-character SHA-256 hash or token ID..."
            className="w-full min-h-[48px] px-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-sm font-mono outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading || !queryHash}
          className="min-h-[48px] px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Auditing Ledger...
            </span>
          ) : (
            <span>🔍 Verify on Ledger</span>
          )}
        </button>
      </form>

      {/* Quick-fill sample hashes for testing */}
      {sampleHashes.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
          <span className="font-semibold text-[11px] uppercase">Sample Tokens:</span>
          {sampleHashes.map((sh, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onQueryChange(sh.hash);
                onVerify(sh.hash);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-mono text-[11px] text-sky-600 dark:text-sky-400 border border-slate-300 dark:border-white/10 cursor-pointer"
            >
              {sh.label}: {sh.hash.slice(0, 10)}...
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
