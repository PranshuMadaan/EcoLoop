import React, { useState } from 'react';
import { 
  Coins, 
  Gift, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  Ticket, 
  ShoppingBag, 
  Bus, 
  Building2, 
  Flame, 
  Clock, 
  QrCode,
  Copy,
  Check
} from 'lucide-react';

export default function VoucherSection({ tokenBalance = 1450, onRedeemTokens }) {
  const [balance, setBalance] = useState(tokenBalance);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [redeemedCode, setRedeemedCode] = useState(null);
  const [copied, setCopied] = useState(false);

  // Voucher Catalog items
  const vouchers = [
    {
      id: 'VOUCHER-PMC-TAX',
      title: 'Municipal Property Tax Rebate (5% Discount)',
      category: 'Municipal Rebate',
      costTokens: 500,
      rupeeValue: 1250,
      icon: Building2,
      color: 'from-emerald-500 to-teal-600',
      description: 'Official 5% property tax rebate voucher directly credited to your PMC/MCD Property Assessment Account.',
      partner: 'Pune Municipal Corporation (PMC)',
      validity: 'Valid for Financial Year 2026-27',
    },
    {
      id: 'VOUCHER-METRO-PASS',
      title: 'Pune Metro / PMPML Public Transit Pass',
      category: 'Public Transit',
      costTokens: 350,
      rupeeValue: 500,
      icon: Bus,
      color: 'from-cyan-500 to-sky-600',
      description: '1-Month unlimited travel pass or Metro Smart Card wallet recharge for Pune Metro Line 1 & Line 2.',
      partner: 'MahaMetro & PMPML Transit',
      validity: '30 Days from activation',
    },
    {
      id: 'VOUCHER-GROCERY-RELIANCE',
      title: 'Reliance Smart / BigBasket Kirana Voucher',
      category: 'Grocery & Essentials',
      costTokens: 250,
      rupeeValue: 250,
      icon: ShoppingBag,
      color: 'from-indigo-500 to-purple-600',
      description: '₹250 instant discount coupon code valid across Reliance Smart Superstore, BigBasket, and local Kiranas.',
      partner: 'Reliance Retail & Woohoo Pine Labs',
      validity: 'Valid for 90 Days',
    },
    {
      id: 'VOUCHER-ELECTRICITY-DISCOUNT',
      title: 'MSEDCL Clean Energy Utility Rebate (₹150)',
      category: 'Green Utility',
      costTokens: 150,
      rupeeValue: 150,
      icon: Flame,
      color: 'from-amber-500 to-rose-600',
      description: 'Direct billing credit applied on your consumer power meter bill for zero wet waste municipal diversion.',
      partner: 'Maharashtra State Electricity Distribution',
      validity: 'Applied on next monthly cycle',
    }
  ];

  // Token Activity History
  const tokenHistory = [
    { id: 1, reason: 'Doorstep Grade A Waste Segregation (Flat 402)', amount: +15, date: 'Today, 10:45 AM' },
    { id: 2, reason: 'Dry Baled PET Packaging Verification', amount: +25, date: 'Yesterday' },
    { id: 3, reason: 'Consecutive 14-Day Source Segregation Streak', amount: +100, date: 'Oct 22, 2026' },
    { id: 4, reason: 'Redeemed: Reliance Smart Grocery Voucher', amount: -250, date: 'Oct 18, 2026' },
  ];

  const handleRedeem = (voucher) => {
    if (balance < voucher.costTokens) {
      alert(`Insufficient Green Tokens. You need ${voucher.costTokens} GT to redeem this voucher.`);
      return;
    }

    const code = `ECO-${voucher.id.slice(8, 12)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newBal = balance - voucher.costTokens;
    setBalance(newBal);
    if (onRedeemTokens) onRedeemTokens(newBal);

    setRedeemedCode({
      voucher,
      code,
      timestamp: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    });
    setSelectedVoucher(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Green Tokens Balances & Highlights */}
      <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">
              Civic Segregation Green Account
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-4xl sm:text-5xl font-black font-['Outfit'] text-white">
              {balance.toLocaleString()}
            </span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              Green Tokens (GT)
            </span>
          </div>

          <p className="text-xs text-slate-400 font-mono">
            Guaranteed value: <strong className="text-white">1 GT = ₹1.00</strong> • Accumulated via verified doorstep waste audits
          </p>
        </div>

        {/* Gamified Streak & Household Badges */}
        <div className="flex items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
          <div className="text-center px-2">
            <div className="flex items-center justify-center gap-1 text-amber-400">
              <Flame className="w-5 h-5 fill-current" />
              <span className="text-xl font-black font-mono">18</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Day Clean Streak</span>
          </div>
          <div className="h-8 w-[1px] bg-slate-800"></div>
          <div className="text-center px-2">
            <div className="text-xl font-black font-mono text-emerald-400">
              100%
            </div>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Grade A Audits</span>
          </div>
        </div>
      </div>

      {/* Voucher Catalog Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold font-['Outfit'] text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-emerald-400" />
              <span>Redemption Marketplace</span>
            </h3>
            <p className="text-xs text-slate-400">
              Swap accumulated Green Tokens for tax rebates, transit tickets, and grocery vouchers.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {vouchers.map((v) => {
            const IconComp = v.icon;
            const canAfford = balance >= v.costTokens;

            return (
              <div
                key={v.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${v.color} p-2 text-slate-950 flex items-center justify-center shadow-md`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-emerald-400 uppercase font-semibold">
                          {v.category}
                        </span>
                        <h4 className="font-bold text-sm text-white font-['Outfit']">
                          {v.title}
                        </h4>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                    {v.description}
                  </p>

                  <div className="mt-3 text-[11px] font-mono text-slate-500 flex items-center justify-between">
                    <span>Partner: <strong className="text-slate-300">{v.partner}</strong></span>
                    <span>{v.validity}</span>
                  </div>
                </div>

                {/* Bottom Action Strip */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Cost to Redeem</span>
                    <div className="text-lg font-black font-mono text-emerald-400">
                      {v.costTokens} <span className="text-xs font-normal text-slate-400">GT</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => handleRedeem(v)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                      canAfford
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-md active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <span>{canAfford ? 'Redeem Voucher' : 'Need More Tokens'}</span>
                    {canAfford && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Token Ledger History Strip */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>Recent Token Accrual Activity</span>
        </h4>

        <div className="divide-y divide-slate-800/60 font-mono text-xs">
          {tokenHistory.map((h) => (
            <div key={h.id} className="py-2.5 flex items-center justify-between">
              <div>
                <span className="text-slate-200 font-sans text-xs">{h.reason}</span>
                <span className="text-[10px] text-slate-500 block">{h.date}</span>
              </div>
              <span className={`font-bold ${h.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {h.amount > 0 ? `+${h.amount}` : h.amount} GT
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Redemption Success Modal with Coupon Barcode */}
      {redeemedCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-emerald-500/60 bg-[#09121e] space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/40">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold font-['Outfit'] text-white">
                Voucher Redeemed Successfully!
              </h3>
              <p className="text-xs text-slate-400">
                {redeemedCode.voucher.title}
              </p>
            </div>

            {/* Generated Coupon Code Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-[10px] text-slate-500 font-mono uppercase">
                Unique Claim Coupon Code
              </div>

              <div className="text-2xl font-black font-mono text-emerald-400 tracking-wider">
                {redeemedCode.code}
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(redeemedCode.code)}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono flex items-center justify-center gap-1.5 border border-slate-800 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Coupon Code'}</span>
              </button>

              <div className="text-[11px] text-slate-400 font-sans pt-1">
                Present this code on the PMC Property Tax portal, MahaMetro kiosk, or at checkout counter.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRedeemedCode(null)}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
