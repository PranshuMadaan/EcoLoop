import React, { useState } from 'react';

export function LiveBiddingBoard({ listing, onPlaceBid, onAcceptBid, isOwner = false }) {
  const [bidAmount, setBidAmount] = useState('');
  const [bidderOrg, setBidderOrg] = useState('GreenTech Recyclers Pvt Ltd');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  if (!listing) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/40 text-slate-400">
        <span className="text-3xl mb-2">⚡</span>
        <h4 className="font-bold text-slate-700 dark:text-slate-300">No Scrap Lot Selected</h4>
        <p className="text-xs">Click on any scrap lot on the left to view auction history and submit competitive bids.</p>
      </div>
    );
  }

  const bids = listing.bids || [];
  const currentHighestBid = bids.length > 0 
    ? Math.max(...bids.map(b => Number(b.bid_amount_per_kg))) 
    : Number(listing.price_per_kg);

  const minNextBid = Number((currentHighestBid + 0.5).toFixed(2));
  const totalValuation = (currentHighestBid * Number(listing.weight_kg)).toLocaleString('en-IN');

  const handleSubmitBid = async (e) => {
    e.preventDefault();
    setFormError('');
    const num = Number(bidAmount);
    if (!num || num < minNextBid) {
      setFormError(`Bid must be at least ₹${minNextBid}/kg.`);
      return;
    }
    setSubmitting(true);
    const res = await onPlaceBid(listing.listing_id, num, bidderOrg);
    setSubmitting(false);
    if (res.success) {
      setBidAmount('');
    } else {
      setFormError(res.error || 'Failed to submit bid');
    }
  };

  return (
    <div className="p-6 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/85 backdrop-blur-md shadow-xl flex flex-col justify-between">
      <div>
        {/* Top Lot Summary Banner */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-white/[0.08] mb-4">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Auction Lot ID: {listing.listing_id.slice(0, 8)}...</span>
            <h3 className="font-['Outfit'] font-bold text-lg text-slate-900 dark:text-white mt-0.5">
              {listing.title || `${listing.material_grade} Aggregated Lot`}
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              Seller: {listing.seller_organization || 'Municipal DWCC Node'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase block">Est. Lot Value</span>
            <span className="font-['Outfit'] font-black text-xl text-slate-900 dark:text-white">₹{totalValuation}</span>
          </div>
        </div>

        {/* Highest Bid Ticker */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-transparent border border-emerald-500/30 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-500 font-bold uppercase tracking-wider block">Leading Bid</span>
              <div className="font-['Outfit'] text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                ₹{currentHighestBid.toFixed(2)} <span className="text-sm font-normal text-slate-400">/ kg</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Reserve Price</span>
              <span className="font-mono text-sm font-bold text-slate-300">₹{listing.price_per_kg}/kg</span>
            </div>
          </div>
        </div>

        {/* 5 Competitive Upgrades Over Gov e-Auctions */}
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/[0.06] mb-5 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">Commercial Differentiators (vs MSTC/GeM)</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono font-bold text-[10px]">100% CPCB Backed</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Dual-Token Physical+EPR</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Intake Quality Assayed (91.5%)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>14/30-Day Trade Credit</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Digital Form-6 Manifest</span>
            </div>
          </div>
        </div>

        {/* Bid Submission Form */}
        {listing.status !== 'SOLD' ? (
          <form onSubmit={handleSubmitBid} className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/[0.06]">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Place Certified Recycler Bid</h4>
            
            {formError && (
              <div className="mb-3 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Bidder Org</label>
                <input
                  type="text"
                  value={bidderOrg}
                  onChange={(e) => setBidderOrg(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Offer (₹/kg, min ₹{minNextBid})
                </label>
                <input
                  type="number"
                  step="0.25"
                  min={minNextBid}
                  placeholder={`Min ₹${minNextBid}`}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{submitting ? 'Submitting Bid...' : '⚡ Place Competitive Bid'}</span>
            </button>
          </form>
        ) : (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
            <span className="text-emerald-400 font-bold text-sm">✓ Lot Auction Finalized & Settled</span>
            <p className="text-xs text-slate-400 mt-0.5">CPCB compliance certificates minted into national registry.</p>
          </div>
        )}

        {/* Live Bids History */}
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">Auction Bid Progression ({bids.length})</h4>
          {bids.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No bids placed yet. Submit the opening bid to lock this lot!</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {bids.map((b, idx) => (
                <div
                  key={b.bid_id || idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/[0.04] flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white block">{b.bidder_organization}</span>
                    <span className="text-[10px] text-slate-500">{new Date(b.created_at || Date.now()).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-['Outfit'] font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      ₹{Number(b.bid_amount_per_kg).toFixed(2)}/kg
                    </span>
                    {idx === 0 && listing.status !== 'SOLD' && (
                      <button
                        type="button"
                        onClick={() => onAcceptBid(listing.listing_id, b.bid_id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-[11px] border border-emerald-500/40 cursor-pointer"
                      >
                        Accept Bid
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
