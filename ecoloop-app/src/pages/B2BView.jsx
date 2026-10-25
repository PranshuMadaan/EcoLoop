import React, { useState } from 'react';
import { 
  ShoppingBag, 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  FileCheck2, 
  Scale, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Lock, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  BadgeCheck,
  Search
} from 'lucide-react';

const initialLots = [
  {
    id: 'LOT-PET-801',
    material: 'PET Bottles (Baled & Cleaned)',
    category: 'Plastics',
    weightKg: 2400,
    currentBid: 28.50,
    bidsCount: 7,
    timeLeft: '04h 18m',
    dwccHub: 'Baner DWCC Material Facility, Pune',
    purity: 94.5,
    moisturePct: 1.2,
    eprHash: '0x8f9c2d1b7e4a3f608129acb7654321fedcba0987',
    dualTokenEpr: true,
    escrowStatus: '14-Day Trade Credit Locked',
    verifiedAssay: true,
  },
  {
    id: 'LOT-HDPE-412',
    material: 'HDPE Milk Pouches & Flakes',
    category: 'Plastics',
    weightKg: 1850,
    currentBid: 34.20,
    bidsCount: 12,
    timeLeft: '01h 45m',
    dwccHub: 'Aundh Ward 14 DWCC Center, Pune',
    purity: 91.8,
    moisturePct: 1.8,
    eprHash: '0x4e7a1b9c3f8d2e5061728394abcdef0123456789',
    dualTokenEpr: true,
    escrowStatus: '14-Day Trade Credit Locked',
    verifiedAssay: true,
  },
  {
    id: 'LOT-OCC-109',
    material: 'Corrugated Cardboard (OCC Export Grade)',
    category: 'Paper',
    weightKg: 5200,
    currentBid: 12.00,
    bidsCount: 4,
    timeLeft: '06h 12m',
    dwccHub: 'Kothrud Aggregator Yard, Pune',
    purity: 96.0,
    moisturePct: 4.5,
    eprHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
    dualTokenEpr: false,
    escrowStatus: 'Ready for Instant Escrow Lock',
    verifiedAssay: true,
  },
  {
    id: 'LOT-EW-031',
    material: 'Mixed Shredded PCB Circuit Boards',
    category: 'E-Waste',
    weightKg: 420,
    currentBid: 450.00,
    bidsCount: 19,
    timeLeft: '00h 32m',
    dwccHub: 'Shivajinagar E-Waste Collection Post',
    purity: 98.2,
    moisturePct: 0.1,
    eprHash: '0x99887766554433221100aabbccddeeff00112233',
    dualTokenEpr: true,
    escrowStatus: 'Escrow Funded (₹1,89,000)',
    verifiedAssay: true,
  }
];

export default function B2BView() {
  const [lots, setLots] = useState(initialLots);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedLotForBid, setSelectedLotForBid] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [showNewLotModal, setShowNewLotModal] = useState(false);
  const [showAssayModal, setShowAssayModal] = useState(null);
  const [bidSuccessMsg, setBidSuccessMsg] = useState('');

  // New Lot Form State
  const [newMaterial, setNewMaterial] = useState('Rigid PP Containers');
  const [newWeight, setNewWeight] = useState(1200);
  const [newReservePrice, setNewReservePrice] = useState(32.00);

  const filteredLots = lots.filter(lot => {
    const matchesCat = filterCategory === 'ALL' || lot.category.toUpperCase() === filterCategory.toUpperCase();
    const matchesSearch = lot.material.toLowerCase().includes(searchQuery.toLowerCase()) || lot.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handlePlaceBid = (e) => {
    e.preventDefault();
    if (!bidAmount || isNaN(Number(bidAmount))) return;
    const val = Number(bidAmount);
    if (val <= selectedLotForBid.currentBid) {
      alert(`Bid must exceed current bid of ₹${selectedLotForBid.currentBid}/kg`);
      return;
    }

    setLots(prev => prev.map(l => {
      if (l.id === selectedLotForBid.id) {
        return {
          ...l,
          currentBid: val,
          bidsCount: l.bidsCount + 1,
        };
      }
      return l;
    }));

    setBidSuccessMsg(`Bid of ₹${val}/kg locked in 14-day escrow for ${selectedLotForBid.id}!`);
    setTimeout(() => {
      setSelectedLotForBid(null);
      setBidAmount('');
      setBidSuccessMsg('');
    }, 1800);
  };

  const handleCreateLot = (e) => {
    e.preventDefault();
    const created = {
      id: `LOT-${Date.now().toString().slice(-4)}`,
      material: newMaterial,
      category: 'Plastics',
      weightKg: Number(newWeight),
      currentBid: Number(newReservePrice),
      bidsCount: 1,
      timeLeft: '24h 00m',
      dwccHub: 'PMC Ward 14 Central MRF',
      purity: 93.5,
      moisturePct: 1.4,
      eprHash: `0x${Math.random().toString(16).slice(2, 42)}`,
      dualTokenEpr: true,
      escrowStatus: '14-Day Trade Credit Escrow Ready',
      verifiedAssay: true,
    };
    setLots([created, ...lots]);
    setShowNewLotModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Deck */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              MODULE 02
            </span>
            <h1 className="text-xl sm:text-2xl font-bold font-['Outfit'] text-white">
              B2B Scrap Marketplace &amp; CPCB EPR Desk
            </h1>
            <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Live Auctions • Escrow
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Certified wholesale scrap auction desk connecting DWCC recovery hubs with certified recyclers via 14-day trade credit escrow and dual-token CPCB EPR bundling.
          </p>
        </div>

        <button
          onClick={() => setShowNewLotModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-teal-950/50 flex items-center gap-2 transition-all self-start lg:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Post Scrap Lot</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* CONSTRAINT ENFORCEMENT:                                             */}
      {/* Detailed B2B Description & Market Price Index renders ONLY in B2B!   */}
      {/* ==================================================================== */}
      <div className="glass-panel p-5 rounded-2xl border border-teal-500/30 bg-gradient-to-r from-teal-950/30 via-slate-900 to-slate-950 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold font-['Outfit'] text-teal-300 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span>National Wholesale Mandi Spot Price Index (24h Real-Time)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Benchmark secondary raw material pricing established across North &amp; West India industrial hubs.
            </p>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800 shrink-0 self-start">
            NPCI Escrow Protocol Active
          </span>
        </div>

        {/* Live Mandi Spot Price Index Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>PET Flakes (Clear)</span>
              <span className="text-emerald-400 flex items-center font-bold text-[10px]">
                <ArrowUpRight className="w-3 h-3" /> +4.2%
              </span>
            </div>
            <div className="text-xl font-black font-mono text-white mt-1">
              ₹28.50 <span className="text-xs font-normal text-slate-500">/kg</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Vol: 142 Tons</span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>HDPE Regrind</span>
              <span className="text-emerald-400 flex items-center font-bold text-[10px]">
                <ArrowUpRight className="w-3 h-3" /> +2.1%
              </span>
            </div>
            <div className="text-xl font-black font-mono text-white mt-1">
              ₹34.00 <span className="text-xs font-normal text-slate-500">/kg</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Vol: 98 Tons</span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>OCC Cardboard</span>
              <span className="text-rose-400 flex items-center font-bold text-[10px]">
                <ArrowDownRight className="w-3 h-3" /> -0.8%
              </span>
            </div>
            <div className="text-xl font-black font-mono text-white mt-1">
              ₹12.00 <span className="text-xs font-normal text-slate-500">/kg</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Vol: 310 Tons</span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>E-Waste (Telecom/PCBs)</span>
              <span className="text-emerald-400 flex items-center font-bold text-[10px]">
                <ArrowUpRight className="w-3 h-3" /> +6.5%
              </span>
            </div>
            <div className="text-xl font-black font-mono text-white mt-1">
              ₹450.00 <span className="text-xs font-normal text-slate-500">/kg</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Vol: 18 Tons</span>
          </div>
        </div>

        {/* Detailed B2B Architecture Description (Specific to this view) */}
        <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
          <strong className="text-teal-300 font-semibold">Dual-Token EPR &amp; Escrow Guarantee:</strong> Each scrap transaction automatically mints a CPCB Extended Producer Responsibility (EPR) token hash containing the assay moisture test, segregation purity rating, and verified collector GPS trail. Funds are safeguarded in an automated 14-day trade credit escrow, disbursed instantly to DWCC hubs upon physical truck arrival and gate assay confirmation.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Lot ID or Material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-center overflow-x-auto w-full sm:w-auto text-xs font-mono">
          {['ALL', 'PLASTICS', 'PAPER', 'E-WASTE'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterCategory === cat
                  ? 'bg-teal-500 text-slate-950'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Scrap Auction Lots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredLots.map(lot => (
          <div 
            key={lot.id}
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-teal-500/50 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800">
                  {lot.id}
                </span>
                <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{lot.timeLeft}</span>
                </span>
              </div>

              <h3 className="text-base font-bold font-['Outfit'] text-white mt-2">
                {lot.material}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {lot.dwccHub}
              </p>

              {/* Lot Specifications Badges */}
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-mono">Lot Weight</span>
                  <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
                    {lot.weightKg.toLocaleString()} kg
                  </div>
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-mono">Assay Purity</span>
                  <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                    {lot.purity}%
                  </div>
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 font-mono">Moisture</span>
                  <div className="text-sm font-bold font-mono text-cyan-400 mt-0.5">
                    {lot.moisturePct}%
                  </div>
                </div>
              </div>

              {/* EPR Cryptographic Hash & Escrow Indicator */}
              <div className="mt-3.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                    <span>CPCB EPR Hash:</span>
                  </span>
                  <span className="text-teal-300 font-bold truncate max-w-[150px]">
                    {lot.eprHash.slice(0, 14)}...
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Escrow State:</span>
                  </span>
                  <span className="text-slate-300 text-[10px]">
                    {lot.escrowStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Bid Actions */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-500 font-mono uppercase">Current Highest Bid</span>
                <div className="text-xl font-black font-mono text-white">
                  ₹{lot.currentBid.toFixed(2)} <span className="text-xs text-slate-400 font-normal">/kg</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{lot.bidsCount} bids logged</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAssayModal(lot)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
                >
                  Assay Report
                </button>
                <button
                  onClick={() => {
                    setSelectedLotForBid(lot);
                    setBidAmount((lot.currentBid + 0.50).toFixed(2));
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-md transition-all"
                >
                  Place Bid
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Place Bid Modal */}
      {selectedLotForBid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-teal-500/50 bg-[#0d1522] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-['Outfit'] text-white">
                Place Escrow-Guaranteed Bid
              </h3>
              <button 
                onClick={() => setSelectedLotForBid(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
              <div className="font-bold text-white">{selectedLotForBid.material}</div>
              <div className="text-slate-400 font-mono">Lot ID: {selectedLotForBid.id} • {selectedLotForBid.weightKg} kg</div>
              <div className="text-teal-400 font-mono font-bold">Current Bid: ₹{selectedLotForBid.currentBid.toFixed(2)}/kg</div>
            </div>

            {bidSuccessMsg ? (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{bidSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handlePlaceBid} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                    Your Bid (₹ per kg):
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    required
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-bold font-mono text-emerald-400 focus:outline-none focus:border-teal-500"
                  />
                  <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                    Total Escrow Commitment: ₹{(Number(bidAmount || 0) * selectedLotForBid.weightKg).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <span className="text-teal-300 font-semibold block">14-Day Trade Credit Escrow Policy:</span>
                  <span>Payment will be held in NPCI-regulated nodal account until batch assay inspection is approved by your QC engineer.</span>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedLotForBid(null)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-medium text-xs hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-bold text-xs hover:from-teal-400 hover:to-emerald-500"
                  >
                    Confirm &amp; Lock Escrow
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Quality Assay Verification Modal */}
      {showAssayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="glass-panel max-w-lg w-full p-6 rounded-2xl border border-slate-700 bg-[#0d1522] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold font-['Outfit'] text-white">
                  CPCB Quality Assay Certificate
                </h3>
              </div>
              <button 
                onClick={() => setShowAssayModal(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500">Lot Identifier:</span>
                <span className="text-white font-bold">{showAssayModal.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500">Material Grade:</span>
                <span className="text-white">{showAssayModal.material}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500">NIR Polymer Purity:</span>
                <span className="text-emerald-400 font-bold">{showAssayModal.purity}% (Certified Single-Grade)</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500">Moisture Content:</span>
                <span className="text-cyan-400">{showAssayModal.moisturePct}% (Tolerance &lt;2.5%)</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-500">Cryptographic Hash:</span>
                <span className="text-teal-300 text-[10px] break-all">{showAssayModal.eprHash}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Auditing Station:</span>
                <span className="text-slate-300">PMC Ward 14 QC Lab #04</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowAssayModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Scrap Lot Modal */}
      {showNewLotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-teal-500/50 bg-[#0d1522] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-['Outfit'] text-white">
                Post New Scrap Lot to Auction
              </h3>
              <button 
                onClick={() => setShowNewLotModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLot} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-mono font-semibold">Material Grade &amp; Form:</label>
                <input
                  type="text"
                  required
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                  placeholder="e.g. Baled PET Bottles or HDPE Regrind"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-mono font-semibold">Weight (Kilograms):</label>
                <input
                  type="number"
                  required
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-mono font-semibold">Reserve Price (₹ / kg):</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={newReservePrice}
                  onChange={(e) => setNewReservePrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewLotModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 font-bold"
                >
                  List Lot on Mandi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
