import React from 'react';

export function RecentMintingsTable({ tokens, onSelectHash, onRefresh, loading }) {
  return (
    <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/75 backdrop-blur-md shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10 mb-4">
        <div>
          <h3 className="font-['Outfit'] font-bold text-lg text-slate-900 dark:text-white">Recent CPCB Ledger Mintings</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Live stream of validated recycling certificates on the national node</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-white/10 cursor-pointer flex items-center gap-1.5"
        >
          <span>↻ Refresh</span>
        </button>
      </div>

      {tokens.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 text-slate-400 text-xs">
          No recycling compliance tokens minted yet on this ledger node.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-3 pr-4">Timestamp</th>
                <th className="pb-3 pr-4">Grade</th>
                <th className="pb-3 pr-4 text-right">Volume</th>
                <th className="pb-3 pr-4">Recycler Entity</th>
                <th className="pb-3 pr-4">SHA-256 Ledger Hash</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {tokens.map((token, idx) => (
                <tr key={token.token_id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 pr-4 text-slate-500 text-[11px] whitespace-nowrap">
                    {new Date(token.issue_timestamp || Date.now()).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </td>
                  <td className="py-3 pr-4 font-mono font-bold text-slate-900 dark:text-white">
                    {token.material_grade}
                  </td>
                  <td className="py-3 pr-4 text-right font-['Outfit'] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {token.verified_weight_mt} MT
                  </td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-300 max-w-[140px] truncate">
                    {token.recycler_organization || 'GreenTech Recyclers'}
                  </td>
                  <td className="py-3 pr-4 font-mono text-[11px] text-cyan-600 dark:text-cyan-400 max-w-[160px] truncate">
                    {token.cpcb_certificate_hash}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onSelectHash(token.cpcb_certificate_hash)}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-600 dark:text-cyan-400 font-bold text-[11px] border border-cyan-500/30 cursor-pointer"
                    >
                      Audit →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
