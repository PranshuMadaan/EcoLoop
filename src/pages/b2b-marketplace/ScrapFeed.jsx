import React from 'react';

export function ScrapFeed({ listings, selectedListing, onSelectListing, onOpenCreateModal }) {
  const getGradeColor = (grade) => {
    switch (grade) {
      case 'PET_CLEAR': return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10';
      case 'HDPE_RIGID': return 'border-sky-500/40 text-sky-400 bg-sky-500/10';
      case 'CARDBOARD_OCC': return 'border-amber-500/40 text-amber-400 bg-amber-500/10';
      case 'E_WASTE_PCB': return 'border-violet-500/40 text-violet-400 bg-violet-500/10';
      default: return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">OPEN</span>;
      case 'BIDDING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border border-amber-500/30 bg-amber-500/15 text-amber-400 animate-pulse">BIDDING</span>;
      case 'SOLD':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border border-slate-600 bg-slate-800 text-slate-400">SOLD</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border border-slate-600 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-['Outfit'] text-xl font-bold text-slate-900 dark:text-white">Active Scrap Lots</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Verified aggregation center inventory available for auction</p>
        </div>
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>+ Post Scrap Lot</span>
        </button>
      </div>

      {listings.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 text-slate-400 text-sm">
          No scrap listings available in this category. Be the first to post!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.map((lot) => {
            const isSelected = selectedListing?.listing_id === lot.listing_id;
            const weightTonnes = (lot.weight_kg / 1000).toFixed(2);
            return (
              <div
                key={lot.listing_id}
                onClick={() => onSelectListing(lot)}
                className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                    : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/75 hover:border-emerald-500/40 hover:-translate-y-0.5'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${getGradeColor(lot.material_grade)}`}>
                      {lot.material_grade}
                    </span>
                    {getStatusBadge(lot.status)}
                  </div>

                  <h3 className="font-['Outfit'] font-bold text-base text-slate-900 dark:text-white line-clamp-1 mb-1">
                    {lot.title || `${lot.material_grade} Aggregated Lot`}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                    {lot.description || 'Verified post-consumer recyclables aggregated at municipal dry waste center.'}
                  </p>
                </div>

                <div>
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/[0.06] mb-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase">Weight</span>
                      <strong className="font-['Outfit'] text-sm text-slate-900 dark:text-white">
                        {lot.weight_kg?.toLocaleString('en-IN')} kg <span className="text-[10px] text-emerald-400 font-normal">({weightTonnes} MT)</span>
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase">Reserve Price</span>
                      <strong className="font-['Outfit'] text-sm text-emerald-600 dark:text-emerald-400">
                        ₹{lot.price_per_kg}/kg
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="truncate max-w-[140px]">📍 {lot.location_city || 'Bengaluru DWCC'}</span>
                    <span className="font-mono text-emerald-500 font-semibold">
                      {lot.bids?.length || 0} active bids
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
