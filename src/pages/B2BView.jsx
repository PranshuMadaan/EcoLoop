import React, { useState, useEffect } from 'react';

/**
 * B2BView - B2B Aggregated Scrap Marketplace & Escrow Trade Desk
 * Displays:
 * 1. Live scrap auction feed with real-time bidding
 * 2. Pre-Auction Quality Assay & Intake Verification Log (quality_intake_assays)
 * 3. Dual-Token Physical + EPR Credit Bundling (epr_token_bundles)
 * 4. 14-Day Trade Credit & Working Capital Escrow status
 * 5. Detailed B2B description and market price index (renders ONLY within this view tab)
 */
export default function B2BView({ standalone = false }) {
  const [filterMaterial, setFilterMaterial] = useState('ALL');
  const [selectedListing, setSelectedListing] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidSuccessMsg, setBidSuccessMsg] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('marketplace'); // 'marketplace' | 'assays' | 'epr-bundles' | 'escrow'

  // Market Price Index (renders ONLY within this B2B tab as required)
  const marketPriceIndex = [
    { grade: 'PET Clear Plastic (Grade A)', benchmark: '₹34.50 / kg', trend: '+4.2%', demand: 'High (Beverage Bottlers)' },
    { grade: 'HDPE Rigid (Blow Moulding)', benchmark: '₹48.00 / kg', trend: '+1.8%', demand: 'Very High (FMCG)' },
    { grade: 'Corrugated Cardboard (OCC 95/5)', benchmark: '₹14.20 / kg', trend: '-0.5%', demand: 'Stable (Paper Mills)' },
    { grade: 'E-Waste PCB (Gold/Copper Bearing)', benchmark: '₹320.00 / kg', trend: '+8.6%', demand: 'Extremely High (Smelters)' },
    { grade: 'Aluminium UBC Scrap (99% Clean)', benchmark: '₹142.00 / kg', trend: '+2.1%', demand: 'High (Extrusions)' },
  ];

  // Scrap Listings
  const [listings, setListings] = useState([
    {
      id: 'lst_patiala_pet_01',
      title: '5.2 MT Baled PET Clear Bottles (92% Purity)',
      material: 'PET_CLEAR',
      seller: 'Model Town DWCC Hub #3',
      sellerUpi: 'modeltown.dwcc@sbi',
      weightKg: 5200,
      currentBidInr: 176800,
      minBidIncrement: 2000,
      totalBids: 7,
      qualityAssayStatus: 'VERIFIED_A_GRADE',
      moisturePct: '2.1%',
      cpcbEprEligible: true,
      escrowStatus: 'ESCROW_FUNDED_14D',
      closingIn: '02h 45m',
    },
    {
      id: 'lst_patiala_hdpe_02',
      title: '3.8 MT HDPE Drums & Crates Shredded',
      material: 'HDPE_RIGID',
      seller: 'Leela Bhawan Ward Aggregator',
      sellerUpi: 'leela.aggregator@hdfcbank',
      weightKg: 3800,
      currentBidInr: 182400,
      minBidIncrement: 2500,
      totalBids: 11,
      qualityAssayStatus: 'VERIFIED_A_GRADE',
      moisturePct: '1.4%',
      cpcbEprEligible: true,
      escrowStatus: 'ESCROW_FUNDED_14D',
      closingIn: '05h 12m',
    },
    {
      id: 'lst_patiala_occ_03',
      title: '12.0 MT Industrial Corrugated OCC Bales',
      material: 'CARDBOARD_OCC',
      seller: 'Urban Estate Material Recovery Hub',
      sellerUpi: 'urban.mrf@icici',
      weightKg: 12000,
      currentBidInr: 170400,
      minBidIncrement: 1500,
      totalBids: 4,
      qualityAssayStatus: 'VERIFIED_STANDARD',
      moisturePct: '6.8%',
      cpcbEprEligible: false,
      escrowStatus: 'ESCROW_FUNDED_14D',
      closingIn: '01h 18m',
    },
    {
      id: 'lst_patiala_ewaste_04',
      title: '850 KG Dismantled Server PCBs & Telecom Boards',
      material: 'E_WASTE_PCB',
      seller: 'Patiala Central E-Waste Depot',
      sellerUpi: 'ewaste.patiala@sbi',
      weightKg: 850,
      currentBidInr: 272000,
      minBidIncrement: 5000,
      totalBids: 14,
      qualityAssayStatus: 'XRF_SPECTROMETRY_VERIFIED',
      moisturePct: '0.0%',
      cpcbEprEligible: true,
      escrowStatus: 'ESCROW_FUNDED_14D',
      closingIn: '44m 10s',
    },
  ]);

  // Quality Assay Intake Logs (quality_intake_assays table)
  const qualityAssays = [
    {
      assayId: 'ASY-2026-901',
      listingId: 'lst_patiala_pet_01',
      inspector: 'Er. Sandeep Verma (ULB Inspector #4)',
      declaredWeightKg: 5250,
      verifiedWeightKg: 5200,
      measuredPurityPct: 92.4,
      moistureDeductionKg: 40.0,
      calculatedDeductionInr: 1380.0,
      finalPayableAmountInr: 175420.0,
      status: 'ASSAY_CERTIFIED',
    },
    {
      assayId: 'ASY-2026-902',
      listingId: 'lst_patiala_hdpe_02',
      inspector: 'Er. Sandeep Verma (ULB Inspector #4)',
      declaredWeightKg: 3820,
      verifiedWeightKg: 3800,
      measuredPurityPct: 96.1,
      moistureDeductionKg: 12.0,
      calculatedDeductionInr: 576.0,
      finalPayableAmountInr: 181824.0,
      status: 'ASSAY_CERTIFIED',
    },
  ];

  // Dual-Token Physical + EPR Credit Bundles (epr_token_bundles table)
  const eprBundles = [
    {
      bundleId: 'BNDL-EPR-PB-081',
      listingId: 'lst_patiala_pet_01',
      recyclerName: 'GreenTech Polymers Ltd.',
      plasticProcessorId: 'CPCB/PWP/REG/PB/2026/04812',
      gstTransactionId: '03AAACG1234F1Z5-INV-891',
      physicalWeightKg: 5200,
      materialCategory: 'CAT_I_RIGID_PLASTIC',
      cpcbCertificateHash: '0x8f2a9c1e7d3b5064e0f81d4a2c9b7e3f1a5d8c2e6b0f4a8d1c7e9b3a5f2d0e8b',
      issuedAt: '2026-10-24 16:40:12 IST',
    },
    {
      bundleId: 'BNDL-EPR-PB-082',
      listingId: 'lst_patiala_hdpe_02',
      recyclerName: 'EverGreen Polychem Hub',
      plasticProcessorId: 'CPCB/PWP/REG/PB/2026/09144',
      gstTransactionId: '03BBBCG9876K1Z9-INV-342',
      physicalWeightKg: 3800,
      materialCategory: 'CAT_I_RIGID_PLASTIC',
      cpcbCertificateHash: '0x4b7c1e8a9d2f5063c1a82d7e9b0f4a3e5c8d1b2a6f9e0c7a4d8b2e1f3a5c7e9d',
      issuedAt: '2026-10-24 18:22:04 IST',
    },
  ];

  useEffect(() => {
    if (listings.length > 0 && !selectedListing) {
      setSelectedListing(listings[0]);
    }
  }, [listings, selectedListing]);

  const handlePlaceBid = (e) => {
    e.preventDefault();
    if (!selectedListing || !bidAmount) return;

    const numericBid = Number(bidAmount);
    if (numericBid <= selectedListing.currentBidInr) {
      alert(`Bid must exceed the current bid of ₹${selectedListing.currentBidInr.toLocaleString('en-IN')}`);
      return;
    }

    const updatedListings = listings.map((l) => {
      if (l.id === selectedListing.id) {
        return {
          ...l,
          currentBidInr: numericBid,
          totalBids: l.totalBids + 1,
        };
      }
      return l;
    });

    setListings(updatedListings);
    setSelectedListing({
      ...selectedListing,
      currentBidInr: numericBid,
      totalBids: selectedListing.totalBids + 1,
    });
    setBidSuccessMsg(`✓ Bid of ₹${numericBid.toLocaleString('en-IN')} placed on ${selectedListing.title}!`);
    setBidAmount('');
    setTimeout(() => setBidSuccessMsg(''), 4000);
  };

  const filteredListings = listings.filter((l) => {
    if (filterMaterial === 'ALL') return true;
    return l.material === filterMaterial;
  });

  return (
    <div className={`w-full max-w-7xl mx-auto space-y-6 ${standalone ? 'py-6 px-4' : ''}`}>
      {/* Top Banner: Marketplace Overview */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-md shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Live B2B Aggregated Scrap Auction Desk
          </div>
          <h1 className="font-['Outfit'] text-2xl md:text-3xl font-extrabold text-white">
            B2B Scrap Marketplace &amp; Trade Credit
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl">
            Directly connect municipal DWCC aggregation hubs with verified industrial recyclers. Features pre-auction quality assay verification, dual-token CPCB EPR certificate bundling, and 14-day trade credit escrow.
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-slate-950 border border-white/10">
          {[
            { id: 'marketplace', label: 'Auctions', icon: '🏪' },
            { id: 'assays', label: 'Quality Assays', icon: '🔬' },
            { id: 'epr-bundles', label: 'EPR Bundling', icon: '📜' },
            { id: 'escrow', label: '14-Day Escrow', icon: '🛡️' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveSubTab(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === t.id
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* DETAILED B2B DESCRIPTION & MARKET PRICE INDEX (Constraint: Renders ONLY within this tab) */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-['Outfit'] text-base font-bold text-white flex items-center gap-2">
            <span>📈</span> National Spot Scrap Benchmark Price Index (North India / Punjab Region)
          </h3>
          <span className="text-[11px] font-mono text-emerald-400">Live CPCB &amp; Aggregator Survey</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {marketPriceIndex.map((m, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-white/10 space-y-1">
              <div className="text-[11px] font-bold text-slate-300 truncate">{m.grade}</div>
              <div className="flex items-baseline justify-between">
                <span className="font-['Outfit'] text-base font-black text-white">{m.benchmark}</span>
                <span className={`text-[11px] font-bold ${m.trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {m.trend}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">{m.demand}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SUB-VIEW 1: MARKETPLACE & LIVE BIDDING */}
      {activeSubTab === 'marketplace' && (
        <div className="space-y-6">
          {/* Material Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'ALL', label: 'All Lots' },
              { id: 'PET_CLEAR', label: 'PET Clear Bottles' },
              { id: 'HDPE_RIGID', label: 'HDPE Rigid' },
              { id: 'CARDBOARD_OCC', label: 'Cardboard (OCC)' },
              { id: 'E_WASTE_PCB', label: 'E-Waste PCB' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterMaterial(f.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterMaterial === f.id
                    ? 'bg-emerald-500 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {bidSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <span>✓</span>
              <span>{bidSuccessMsg}</span>
            </div>
          )}

          {/* Grid Layout: Listings (7 Cols) & Selected Listing Bidding Desk (5 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Scrap Lots Grid */}
            <div className="lg:col-span-7 space-y-4">
              {filteredListings.map((l) => {
                const isSelected = selectedListing?.id === l.id;
                return (
                  <div
                    key={l.id}
                    onClick={() => setSelectedListing(l)}
                    className={`p-5 rounded-3xl border transition-all duration-200 cursor-pointer shadow-lg space-y-3 ${
                      isSelected
                        ? 'bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-slate-900/80 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">{l.id}</span>
                        <h4 className="font-['Outfit'] text-base font-bold text-white">{l.title}</h4>
                        <div className="text-xs text-slate-400 mt-0.5">Seller: {l.seller}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        ⏱️ Closes in {l.closingIn}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-950 border border-white/5 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Weight</span>
                        <strong className="font-['Outfit'] text-white">{(l.weightKg / 1000).toFixed(1)} MT</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Current High Bid</span>
                        <strong className="font-['Outfit'] text-emerald-400">₹{l.currentBidInr.toLocaleString('en-IN')}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Quality Assay</span>
                        <strong className="font-['Outfit'] text-cyan-400 text-[11px]">{l.qualityAssayStatus}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <div className="flex items-center gap-2">
                        {l.cpcbEprEligible && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            CPCB Dual Token Eligible
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                          14-Day Escrow
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500">{l.totalBids} bids placed</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Listing Live Bidding & Assay Summary */}
            <div className="lg:col-span-5 sticky top-24 space-y-4">
              {selectedListing ? (
                <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-5">
                  <div className="border-b border-white/10 pb-4">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">{selectedListing.id}</span>
                    <h3 className="font-['Outfit'] text-lg font-bold text-white mt-1">{selectedListing.title}</h3>
                    <div className="text-xs text-slate-400 mt-1">Verified Aggregator: {selectedListing.seller}</div>
                  </div>

                  {/* Valuation Breakdown */}
                  <div className="space-y-2 p-4 rounded-2xl bg-slate-950 border border-white/10">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Certified Lot Weight:</span>
                      <strong className="text-white">{selectedListing.weightKg.toLocaleString()} KG</strong>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Measured Moisture:</span>
                      <strong className="text-emerald-400">{selectedListing.moisturePct}</strong>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Effective Unit Rate:</span>
                      <strong className="text-cyan-400">
                        ₹{(selectedListing.currentBidInr / selectedListing.weightKg).toFixed(2)} / kg
                      </strong>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
                      <span className="font-bold text-white">Current Winning Bid:</span>
                      <span className="font-['Outfit'] font-black text-emerald-400 text-lg">
                        ₹{selectedListing.currentBidInr.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Bidding Form */}
                  <form onSubmit={handlePlaceBid} className="space-y-3">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Place Higher Auction Bid (Min Increment ₹{selectedListing.minBidIncrement}):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={selectedListing.currentBidInr + selectedListing.minBidIncrement}
                        step={selectedListing.minBidIncrement}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder={`₹${(selectedListing.currentBidInr + selectedListing.minBidIncrement).toLocaleString('en-IN')}`}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-['Outfit'] font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-emerald-500/20"
                      >
                        Submit Bid
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Bids are locked with atomic 14-day trade credit escrow. Fund release is contingent on intake assay.
                    </p>
                  </form>
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-slate-900 border border-white/10 text-center text-slate-500">
                  Select a scrap listing to view auction details and place bids.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: PRE-AUCTION QUALITY ASSAYS (quality_intake_assays table) */}
      {activeSubTab === 'assays' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="font-['Outfit'] text-lg font-bold text-white flex items-center gap-2">
                <span>🔬</span> Pre-Auction Quality Assay &amp; Intake Verification Log
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Physical intake verification records logged by municipal DWCC inspectors prior to auction listing.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
              quality_intake_assays
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-white/10">
                <tr>
                  <th className="p-3">Assay ID</th>
                  <th className="p-3">Listing</th>
                  <th className="p-3">Inspector</th>
                  <th className="p-3">Declared (kg)</th>
                  <th className="p-3">Verified (kg)</th>
                  <th className="p-3">Purity %</th>
                  <th className="p-3">Moisture Ded.</th>
                  <th className="p-3">Final Payable</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {qualityAssays.map((a) => (
                  <tr key={a.assayId} className="hover:bg-slate-950/40">
                    <td className="p-3 font-mono font-bold text-emerald-400">{a.assayId}</td>
                    <td className="p-3 font-mono text-slate-300">{a.listingId}</td>
                    <td className="p-3 text-slate-300">{a.inspector}</td>
                    <td className="p-3 font-mono text-slate-400">{a.declaredWeightKg} kg</td>
                    <td className="p-3 font-mono font-bold text-white">{a.verifiedWeightKg} kg</td>
                    <td className="p-3 font-mono text-cyan-400 font-bold">{a.measuredPurityPct}%</td>
                    <td className="p-3 font-mono text-rose-400">-{a.moistureDeductionKg} kg</td>
                    <td className="p-3 font-mono font-black text-emerald-400">
                      ₹{a.finalPayableAmountInr.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: DUAL-TOKEN EPR BUNDLING (epr_token_bundles table) */}
      {activeSubTab === 'epr-bundles' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="font-['Outfit'] text-lg font-bold text-white flex items-center gap-2">
                <span>📜</span> Dual-Token Physical + EPR Credit Bundles
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cryptographic link binding physical plastic tonnage with CPCB Extended Producer Responsibility (EPR) compliance credits.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold">
              epr_token_bundles
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {eprBundles.map((b) => (
              <div key={b.bundleId} className="p-5 rounded-2xl bg-slate-950 border border-white/10 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">{b.bundleId}</span>
                    <h4 className="font-['Outfit'] text-base font-bold text-white">{b.recyclerName}</h4>
                    <div className="text-xs text-slate-400 mt-0.5">CPCB Registration: {b.plasticProcessorId}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-400 font-bold">
                    BUNDLED
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>GST Manifest Invoice:</span>
                    <strong className="text-white font-mono">{b.gstTransactionId}</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Physical Net Weight:</span>
                    <strong className="text-emerald-400 font-mono">{b.physicalWeightKg} KG</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>EPR Category:</span>
                    <strong className="text-cyan-400 font-mono">{b.materialCategory}</strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-mono">CPCB SHA-256 Hash</span>
                  <div className="p-2 rounded-lg bg-slate-900 border border-white/5 text-[10px] font-mono text-emerald-300 break-all select-all">
                    {b.cpcbCertificateHash}
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1">
                  <span>Issued: {b.issuedAt}</span>
                  <span className="text-emerald-400">✓ Immutable</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: 14-DAY TRADE CREDIT ESCROW */}
      {activeSubTab === 'escrow' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-5">
          <div className="border-b border-white/10 pb-4">
            <h3 className="font-['Outfit'] text-lg font-bold text-white flex items-center gap-2">
              <span>🛡️</span> Recycler Trade Credit &amp; 14/30-Day Working Capital Escrow
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated settlement rail ensuring waste pickers receive instant UPI cash upon weighbridge weigh-in, while authorized industrial recyclers settle on standard 14 or 30-day corporate trade credit terms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-950 border border-white/10 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Active Escrow Capital</span>
              <div className="font-['Outfit'] text-2xl font-black text-emerald-400">₹42.8 Lakh</div>
              <span className="text-[11px] text-slate-400">100% Backed by Bank Guarantee</span>
            </div>
            <div className="p-5 rounded-2xl bg-slate-950 border border-white/10 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Instant Payouts to Pickers</span>
              <div className="font-['Outfit'] text-2xl font-black text-cyan-400">T+0 Real-Time</div>
              <span className="text-[11px] text-slate-400">Razorpay / Cashfree UPI Switches</span>
            </div>
            <div className="p-5 rounded-2xl bg-slate-950 border border-white/10 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Recycler Settlement Cycle</span>
              <div className="font-['Outfit'] text-2xl font-black text-amber-400">Net 14 Days</div>
              <span className="text-[11px] text-slate-400">Automated e-NACH Clearing</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
