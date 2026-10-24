import React from 'react';
import { useMarketplace } from './useMarketplace.js';
import { ScrapFeed } from './ScrapFeed.jsx';
import { LiveBiddingBoard } from './LiveBiddingBoard.jsx';
import { CreateListingModal } from './CreateListingModal.jsx';
import { AcceptBidAction } from './AcceptBidAction.jsx';

/**
 * B2BMarketplaceView - Standalone & Mountable Scrap Auction View
 * @param {boolean} standalone - Whether rendering as an independent full-screen page or inside dashboard shell
 */
export function B2BMarketplaceView({ standalone = true, onNavigateToEpr, apiBase = '/api/v1' }) {
  const {
    listings,
    selectedListing,
    setSelectedListing,
    loading,
    error,
    filterMaterial,
    setFilterMaterial,
    isCreateModalOpen,
    setIsCreateModalOpen,
    settlementReceipt,
    setSettlementReceipt,
    placeBid,
    createListing,
    acceptWinningBid,
  } = useMarketplace(apiBase);

  const materials = [
    { id: 'ALL', label: 'All Scrap Lots' },
    { id: 'PET_CLEAR', label: 'PET Clear Plastic' },
    { id: 'HDPE_RIGID', label: 'HDPE Rigid' },
    { id: 'CARDBOARD_OCC', label: 'Cardboard (OCC)' },
    { id: 'E_WASTE_PCB', label: 'E-Waste PCB' },
  ];

  return (
    <div className={`w-full max-w-7xl mx-auto space-y-6 ${standalone ? 'min-h-screen py-6 px-4' : ''}`}>
      {/* Page Header & Live Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-slate-900/60 backdrop-blur-md shadow-lg">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Live B2B Auction Feed
          </div>
          <h1 className="font-['Outfit'] text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
            B2B Aggregated Scrap Marketplace
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Connecting municipal Dry Waste Collection Centres (DWCCs) with authorized industrial recyclers through transparent price discovery and atomic Escrow settlement.
          </p>
        </div>

        {/* Material Filter Pills */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/[0.06]">
          {materials.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setFilterMaterial(m.id)}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMaterial === m.id
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Primary Split Layout: Scrap Feed (Left) & Live Bidding Board (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Scrap Lots Grid (7 Cols) */}
        <div className="lg:col-span-7">
          <ScrapFeed
            listings={listings}
            selectedListing={selectedListing}
            onSelectListing={setSelectedListing}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
          />
        </div>

        {/* Right: Live Bidding & Valuation Pane (5 Cols) */}
        <div className="lg:col-span-5 sticky top-24">
          <LiveBiddingBoard
            listing={selectedListing}
            onPlaceBid={placeBid}
            onAcceptBid={acceptWinningBid}
          />
        </div>
      </div>

      {/* Create Listing Modal */}
      <CreateListingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={createListing}
      />

      {/* Escrow Settlement Payout Confirmation */}
      <AcceptBidAction
        receipt={settlementReceipt}
        onClose={() => setSettlementReceipt(null)}
        onVerifyOnLedger={onNavigateToEpr}
      />
    </div>
  );
}

export default B2BMarketplaceView;
export { useMarketplace };
