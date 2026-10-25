import React, { useState } from 'react';

/**
 * VoucherSection - Citizen Green Token & Municipal Voucher Redemption Hub
 * Displays earned Green Tokens from doorstep segregated waste collection.
 * Allows citizens to swap tokens for:
 * 1. Municipal Property Tax Rebate (5% discount)
 * 2. Public Transit Passes (City Bus / Metro Pass)
 * 3. Local Grocery / Ration Vouchers
 */
export default function VoucherSection({ initialTokens = 450, onTokenChange }) {
  const [tokens, setTokens] = useState(initialTokens);
  const [activeVoucher, setActiveVoucher] = useState(null);
  const [redeemedList, setRedeemedList] = useState([
    {
      id: 'VCH-PTX-2026-091',
      title: 'Municipal Property Tax 5% Rebate',
      code: 'MC-PATIALA-TAX-5PCT-9182',
      tokensUsed: 250,
      date: '2026-10-18',
      expiry: '2027-03-31',
      status: 'ACTIVE_CLAIMABLE',
      authority: 'Patiala Municipal Corporation',
    },
  ]);
  const [toastMessage, setToastMessage] = useState('');

  const vouchersCatalog = [
    {
      id: 'tax_rebate_5',
      title: 'Municipal Property Tax Rebate',
      rebate: '5% Off Annual Tax Bill',
      cost: 250,
      icon: '🏛️',
      category: 'Municipal Rebate',
      badgeColor: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      description: 'Official Section 142 SWM compliance rebate applicable to Patiala Municipal Corporation annual property tax assessment.',
      terms: 'Valid for current financial year assessment. Requires Ward QR inspection history.',
    },
    {
      id: 'transit_pass_30d',
      title: 'City Bus & PRTC Green Transit Pass',
      rebate: '1-Month Unlimited Travel',
      cost: 150,
      icon: '🚌',
      category: 'Public Transit',
      badgeColor: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400',
      description: 'Unlimited travel on all Patiala Municipal & PRTC intra-city electric micro-buses.',
      terms: 'Activates upon first boarding tap. Non-transferable.',
    },
    {
      id: 'grocery_voucher_200',
      title: 'Verka & Local Cooperative Grocery Voucher',
      rebate: '₹200 Instant Supermarket Credit',
      cost: 200,
      icon: '🛒',
      category: 'Essential Ration',
      badgeColor: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      description: 'Redeemable at verified Patiala dairy cooperatives and local municipal fair-price grocery outlets.',
      terms: 'No minimum cart spend required. Valid for 90 days.',
    },
  ];

  const handleRedeem = (v) => {
    if (tokens < v.cost) {
      setToastMessage(`Insufficient Green Tokens! You need ${v.cost - tokens} more tokens.`);
      setTimeout(() => setToastMessage(''), 3000);
      return;
    }

    const newBalance = tokens - v.cost;
    setTokens(newBalance);
    if (onTokenChange) onTokenChange(newBalance);

    const generatedVoucher = {
      id: `VCH-${Math.random().toString(36).substring(2, 7).toUpperCase()}-2026`,
      title: v.title,
      code: `ECO-${v.id.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      tokensUsed: v.cost,
      date: new Date().toISOString().split('T')[0],
      expiry: '2026-12-31',
      status: 'ACTIVE_CLAIMABLE',
      authority: 'Patiala Municipal Corporation',
    };

    setRedeemedList([generatedVoucher, ...redeemedList]);
    setActiveVoucher(generatedVoucher);
    setToastMessage(`✓ Successfully redeemed ${v.title}! -${v.cost} GT`);
    setTimeout(() => setToastMessage(''), 4000);
  };

  return (
    <div className="w-full space-y-6">
      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 text-emerald-300 text-sm font-semibold shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Wallet Balance Hero Banner */}
      <div className="relative overflow-hidden p-6 md:p-8 rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border border-emerald-500/20 backdrop-blur-md shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Verified SWM Source Segregation Ledger
            </div>
            <h2 className="font-['Outfit'] text-2xl md:text-3xl font-extrabold text-white">
              Green Tokens Wallet
            </h2>
            <p className="text-slate-400 text-xs md:text-sm max-w-xl">
              Earned automatically every time your daily wet &amp; dry waste bins pass RFID pickup verification with &gt;90% segregation purity.
            </p>
          </div>

          {/* Token Counter Capsule */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950/80 border border-white/10 shadow-inner">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-2xl shadow-lg shadow-emerald-500/25">
              🌱
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">Available Balance</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-['Outfit'] text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                  {tokens}
                </span>
                <span className="text-emerald-400 font-bold text-xs font-mono">GT (≈ ₹{tokens})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-['Outfit'] text-xl font-bold text-white flex items-center gap-2">
            <span>🎟️</span> Available Municipal Rebates &amp; Vouchers
          </h3>
          <span className="text-xs text-slate-400">Instant Redemption · Real-Time QR</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {vouchersCatalog.map((v) => {
            const canAfford = tokens >= v.cost;
            return (
              <div
                key={v.id}
                className="flex flex-col justify-between p-6 rounded-3xl bg-slate-900/90 border border-white/10 hover:border-emerald-500/40 transition-all duration-200 shadow-xl space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="text-3xl p-3 rounded-2xl bg-slate-950 border border-white/10">{v.icon}</span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${v.badgeColor}`}>
                      {v.category}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-['Outfit'] text-lg font-bold text-white">{v.title}</h4>
                    <div className="text-sm font-extrabold text-emerald-400 mt-0.5">{v.rebate}</div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{v.description}</p>
                </div>

                <div className="pt-3 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Cost:</span>
                    <span className="font-['Outfit'] font-black text-base text-emerald-400">{v.cost} GT</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRedeem(v)}
                    disabled={!canAfford}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold font-['Outfit'] uppercase tracking-wider transition-all cursor-pointer ${
                      canAfford
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-md shadow-emerald-500/20 active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                    }`}
                  >
                    {canAfford ? 'Redeem Voucher' : `Needs ${v.cost - tokens} More Tokens`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Claimed / Active Vouchers Ledger */}
      <div className="space-y-3 pt-4">
        <h3 className="font-['Outfit'] text-xl font-bold text-white flex items-center gap-2">
          <span>📜</span> My Active Municipal Vouchers &amp; QR Claims
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {redeemedList.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-slate-900 border border-white/10 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">{item.id}</span>
                  <h4 className="font-bold text-sm text-white">{item.title}</h4>
                  <div className="text-xs text-slate-400 mt-0.5">Issuer: {item.authority}</div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  ACTIVE
                </span>
              </div>

              {/* Digital Code Box */}
              <div className="p-3 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-cyan-300 tracking-wider">{item.code}</span>
                <button
                  type="button"
                  onClick={() => setActiveVoucher(item)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-bold cursor-pointer"
                >
                  Show QR
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Redeemed: {item.date}</span>
                <span>Valid Till: {item.expiry}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Voucher QR Modal */}
      {activeVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-white/20 p-6 space-y-4 text-center shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400">{activeVoucher.id}</span>
              <button
                type="button"
                onClick={() => setActiveVoucher(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <h4 className="font-['Outfit'] text-lg font-extrabold text-white">{activeVoucher.title}</h4>

            {/* Simulated Deterministic QR Code */}
            <div className="p-4 bg-white rounded-2xl mx-auto w-48 h-48 flex items-center justify-center shadow-inner">
              <svg viewBox="0 0 100 100" className="w-40 h-40">
                {/* QR Position Squares */}
                <rect x="5" y="5" width="28" height="28" fill="#090d16" rx="2" />
                <rect x="9" y="9" width="20" height="20" fill="#ffffff" />
                <rect x="13" y="13" width="12" height="12" fill="#090d16" />

                <rect x="67" y="5" width="28" height="28" fill="#090d16" rx="2" />
                <rect x="71" y="9" width="20" height="20" fill="#ffffff" />
                <rect x="75" y="13" width="12" height="12" fill="#090d16" />

                <rect x="5" y="67" width="28" height="28" fill="#090d16" rx="2" />
                <rect x="9" y="71" width="20" height="20" fill="#ffffff" />
                <rect x="13" y="75" width="12" height="12" fill="#090d16" />

                {/* Matrix dots */}
                <rect x="38" y="10" width="8" height="8" fill="#090d16" />
                <rect x="50" y="10" width="8" height="8" fill="#090d16" />
                <rect x="38" y="22" width="8" height="8" fill="#090d16" />
                <rect x="38" y="38" width="12" height="12" fill="#090d16" />
                <rect x="55" y="38" width="8" height="8" fill="#090d16" />
                <rect x="10" y="38" width="12" height="12" fill="#090d16" />
                <rect x="25" y="42" width="8" height="8" fill="#090d16" />
                <rect x="68" y="42" width="16" height="8" fill="#090d16" />
                <rect x="38" y="68" width="8" height="16" fill="#090d16" />
                <rect x="55" y="68" width="16" height="8" fill="#090d16" />
                <rect x="75" y="75" width="10" height="10" fill="#090d16" />
              </svg>
            </div>

            <div className="font-mono text-sm font-bold text-cyan-300 bg-slate-950 p-2 rounded-xl border border-white/10">
              {activeVoucher.code}
            </div>

            <p className="text-xs text-slate-400">
              Present this QR to your Municipal Tax Revenue Officer or PRTC Bus Conductor for instant 1-tap redemption.
            </p>

            <button
              type="button"
              onClick={() => setActiveVoucher(null)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
