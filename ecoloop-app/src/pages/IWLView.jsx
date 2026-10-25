import React, { useState } from 'react';
import { 
  Users, 
  Printer, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Sparkles, 
  Award, 
  CreditCard, 
  QrCode, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Calculator,
  Download,
  AlertCircle
} from 'lucide-react';

export default function IWLView() {
  // Worker Profile State
  const [worker, setWorker] = useState({
    id: 'SW-342',
    name: 'Ramesh Kale',
    cooperative: 'SWaCH Pune Cooperative • SBM 2.0 Certified',
    ward: 'Ward 14 (Aundh/Baner), Pune',
    verifiedId: true,
    weeklyVolumeKg: 148, // > 100 kg/week qualifies for Tier 2!
    vpa: 'ramesh.swach@sbi',
    bloodGroup: 'O+',
    emergencyContact: '+91 98220 91823',
    photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
    todayEarnings: 840.00,
    collectionsCount: 6,
  });

  // Voice Weigh Calculator State
  const [materialType, setMaterialType] = useState('PET'); // PET, HDPE, OCC, E_WASTE
  const [weightInput, setWeightInput] = useState(42.5);
  const [purityRating, setPurityRating] = useState(94); // > 90% qualifies for Tier 1!
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Payout Transaction History & Active Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [payoutList, setPayoutList] = useState([
    {
      utr: '849201948123',
      timestamp: 'Today, 10:42 AM',
      workerName: 'Ramesh Kale',
      material: 'PET Bottles (Clean Baled)',
      weightKg: 28.0,
      basePay: 798.00,
      tier1Bonus: 79.80,
      tier2Bonus: 119.70,
      totalPayout: 997.50,
      status: 'PAID_INSTANT_UPI',
      vpa: 'ramesh.swach@sbi',
    },
    {
      utr: '721098453219',
      timestamp: 'Today, 08:15 AM',
      workerName: 'Ramesh Kale',
      material: 'HDPE Containers',
      weightKg: 18.5,
      basePay: 629.00,
      tier1Bonus: 62.90,
      tier2Bonus: 94.35,
      totalPayout: 786.25,
      status: 'PAID_INSTANT_UPI',
      vpa: 'ramesh.swach@sbi',
    }
  ]);

  // Pricing Matrix (₹/kg)
  const materialRates = {
    PET: 28.50,
    HDPE: 34.00,
    OCC: 12.00,
    E_WASTE: 450.00,
  };

  // Calculations for Bonus Engine:
  const baseRate = materialRates[materialType] || 28.50;
  const rawBase = Number((weightInput * baseRate).toFixed(2));
  
  // Tier 1 Bonus: +10% boost for high purity segregation (>90%)
  const isTier1Qualified = purityRating >= 90;
  const tier1Amount = isTier1Qualified ? Number((rawBase * 0.10).toFixed(2)) : 0;

  // Tier 2 Bonus: +15% boost for consistent weekly volume (>100 kg) & verified municipal ID
  const isTier2Qualified = worker.weeklyVolumeKg >= 100 && worker.verifiedId;
  const tier2Amount = isTier2Qualified ? Number((rawBase * 0.15).toFixed(2)) : 0;

  const totalCalculatedPayout = Number((rawBase + tier1Amount + tier2Amount).toFixed(2));

  // Voice Weigh Voice Engine (Speech Synthesis)
  const speakCalculation = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    setIsSpeaking(true);

    const text = `वजन: ${weightInput} किलो. शुद्धता: ${purityRating} टक्के. टियर वन बोनस दहा टक्के, टियर टू बोनस पंधरा टक्के. एकूण जमा रक्कम: ${totalCalculatedPayout} रुपये.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN'; // Hindi/Marathi pronunciation
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Trigger Instant Razorpay Spot UPI Disbursal
  const handleDisburseUpi = () => {
    // Generate authentic 12-digit NPCI UTR number
    const randPart = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    const newUtr = randPart;

    const receipt = {
      utr: newUtr,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      workerName: worker.name,
      material: materialType === 'PET' ? 'PET Bottles' : materialType === 'HDPE' ? 'HDPE Plastic' : materialType === 'OCC' ? 'OCC Cardboard' : 'E-Waste Mixed',
      weightKg: weightInput,
      basePay: rawBase,
      tier1Bonus: tier1Amount,
      tier2Bonus: tier2Amount,
      totalPayout: totalCalculatedPayout,
      status: 'PAID_INSTANT_UPI',
      vpa: worker.vpa,
    };

    setPayoutList([receipt, ...payoutList]);
    setWorker(prev => ({
      ...prev,
      todayEarnings: Number((prev.todayEarnings + totalCalculatedPayout).toFixed(2)),
      collectionsCount: prev.collectionsCount + 1,
    }));
    setActiveReceipt(receipt);

    // Audio confirmation chime
    if ('speechSynthesis' in window) {
      const confirmSpeech = new SpeechSynthesisUtterance(`UPI Payment of ${totalCalculatedPayout} rupees transferred successfully to ${worker.name}.`);
      confirmSpeech.lang = 'en-IN';
      window.speechSynthesis.speak(confirmSpeech);
    }
  };

  // Trigger Printable Worker ID Card
  const triggerPrintId = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Deck */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              MODULE 03
            </span>
            <h1 className="text-xl sm:text-2xl font-bold font-['Outfit'] text-white">
              Informal Worker Ledger (IWL)
            </h1>
            <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Dignity Deck • 2-Tier Bonus Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Empowering informal waste pickers with Bluetooth digital scale telemetry, voice weigh verification, Tier 1 &amp; Tier 2 bonus boosts, and instant 12-digit UTR spot UPI payouts.
          </p>
        </div>

        {/* Worker Quick Status Summary */}
        <div className="flex items-center gap-4 bg-slate-900/90 px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono">
          <div>
            <span className="text-slate-400 block text-[10px]">Today's Spot Disbursed</span>
            <span className="text-lg font-black text-emerald-400 font-mono">₹{worker.todayEarnings.toFixed(2)}</span>
          </div>
          <div className="border-l border-slate-800 pl-3">
            <span className="text-slate-400 block text-[10px]">Weekly Volume</span>
            <span className="text-base font-bold text-teal-300 font-mono">{worker.weeklyVolumeKg} kg</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Interface: Worker ID & Voice Weigh Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ================================================================= */}
        {/* LEFT COLUMN (5 COLS): PRINTABLE DIGITAL WORKER ID & TIER STATUS  */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Official Printable Worker ID Card */}
          <div className="glass-panel p-5 rounded-3xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 relative shadow-2xl printable-card">
            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-bold font-mono tracking-wider text-indigo-300 uppercase">
                  SBM 2.0 Digital Technician ID
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ACTIVE COOPERATIVE
              </span>
            </div>

            <div className="flex items-start gap-4">
              {/* Photo Avatar */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-indigo-400/80 overflow-hidden shadow-md flex items-center justify-center font-bold text-2xl text-indigo-200">
                  RK
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-900"></span>
              </div>

              {/* Personal Details */}
              <div className="space-y-1 text-xs">
                <h3 className="text-lg font-bold text-white font-['Outfit'] leading-tight">
                  {worker.name}
                </h3>
                <p className="text-indigo-300 font-mono text-[11px]">
                  ID: <strong className="text-white">#{worker.id}</strong> • Pune Ward 14
                </p>
                <p className="text-[11px] text-slate-400">
                  SWaCH Waste Pickers Cooperative
                </p>
                <div className="flex items-center gap-3 pt-1 text-[10px] font-mono text-slate-400">
                  <span>Blood: <strong className="text-slate-200">{worker.bloodGroup}</strong></span>
                  <span>•</span>
                  <span>UPI: <strong className="text-teal-300">{worker.vpa}</strong></span>
                </div>
              </div>
            </div>

            {/* QR Barcode and Emergency Verification Strip */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-white p-1 rounded-lg flex items-center justify-center">
                  <QrCode className="w-10 h-10 text-slate-950" />
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  <div>PMC Verification Hash:</div>
                  <div className="text-slate-200 font-bold">#PUN-SW342-9981</div>
                  <div className="text-emerald-400">Doorstep QR Scanner Auth</div>
                </div>
              </div>

              <button
                type="button"
                onClick={triggerPrintId}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print ID Card</span>
              </button>
            </div>
          </div>

          {/* 2-Tier Bonus Engine Status Panel */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Incentive Boost Engine (Active Tiers)</span>
            </h4>

            {/* Tier 1 Card */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              isTier1Qualified 
                ? 'bg-emerald-950/40 border-emerald-500/50 shadow-sm'
                : 'bg-slate-950/50 border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center border border-emerald-500/40">
                    T1
                  </span>
                  <div>
                    <div className="font-bold text-xs text-white">Tier 1: High-Purity Bonus</div>
                    <div className="text-[10px] text-slate-400 font-mono">Requires &gt;90% clean single-grade sort</div>
                  </div>
                </div>
                <span className="text-xs font-black font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  +10% Boost
                </span>
              </div>
              <div className="mt-2 text-[11px] font-mono text-slate-300 flex items-center justify-between border-t border-slate-800/80 pt-2">
                <span>Current Batch Purity:</span>
                <span className="text-emerald-400 font-bold">{purityRating}% {isTier1Qualified ? '✓ Qualified' : '✗ Under 90%'}</span>
              </div>
            </div>

            {/* Tier 2 Card */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              isTier2Qualified 
                ? 'bg-teal-950/40 border-teal-500/50 shadow-sm'
                : 'bg-slate-950/50 border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center border border-teal-500/40">
                    T2
                  </span>
                  <div>
                    <div className="font-bold text-xs text-white">Tier 2: Volume &amp; Identity Bonus</div>
                    <div className="text-[10px] text-slate-400 font-mono">&gt;100 kg/week + Verified Municipal ID</div>
                  </div>
                </div>
                <span className="text-xs font-black font-mono text-teal-300 bg-teal-950 px-2 py-0.5 rounded border border-teal-800">
                  +15% Boost
                </span>
              </div>
              <div className="mt-2 text-[11px] font-mono text-slate-300 flex items-center justify-between border-t border-slate-800/80 pt-2">
                <span>Weekly Volume Logged:</span>
                <span className="text-teal-300 font-bold">{worker.weeklyVolumeKg} kg / 100 kg ✓ Qualified</span>
              </div>
            </div>

            {/* Total Combined Boost HUD */}
            <div className="p-3 bg-gradient-to-r from-emerald-950/60 to-indigo-950/60 rounded-xl border border-emerald-500/30 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">Total Effective Incentive:</span>
              <span className="text-sm font-black text-emerald-400">
                +{(isTier1Qualified ? 10 : 0) + (isTier2Qualified ? 15 : 0)}% Additional Payout
              </span>
            </div>
          </div>

        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN (7 COLS): VOICE WEIGH CALCULATOR & SPOT UPI DISBURSAL*/}
        {/* ================================================================= */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Voice Weigh Calculator Card */}
          <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-['Outfit'] text-white">
                    Smart Voice Weigh Telemetry Calculator
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    आवाज वजन मोजा • Multilingual Audio Speech Assistance
                  </p>
                </div>
              </div>

              {/* Speak Audio Button */}
              <button
                type="button"
                onClick={speakCalculation}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono flex items-center gap-1.5 transition-colors"
              >
                {isSpeaking ? (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>Speaking...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-slate-400" />
                    <span>बोलून मोजा (Voice Read)</span>
                  </>
                )}
              </button>
            </div>

            {/* Input Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Material Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                  Material Grade:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'PET', label: 'PET Bottles', rate: '₹28.50' },
                    { key: 'HDPE', label: 'HDPE Regrind', rate: '₹34.00' },
                    { key: 'OCC', label: 'OCC Paper', rate: '₹12.00' },
                    { key: 'E_WASTE', label: 'E-Waste', rate: '₹450.00' },
                  ].map(item => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setMaterialType(item.key)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        materialType === item.key
                          ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-xs">{item.label}</div>
                      <div className="text-[10px] font-mono text-emerald-400">{item.rate}/kg</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Weight & Purity Sliders */}
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">BLE Scale Weight:</span>
                    <span className="text-emerald-400 font-bold">{weightInput} kg</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="150"
                    step="0.5"
                    value={weightInput}
                    onChange={(e) => setWeightInput(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>5 kg</span>
                    <span>150 kg</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">Purity Assay Score:</span>
                    <span className="text-teal-300 font-bold">{purityRating}%</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="100"
                    step="1"
                    value={purityRating}
                    onChange={(e) => setPurityRating(Number(e.target.value))}
                    className="w-full accent-teal-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>60% (Mixed)</span>
                    <span className="text-emerald-400">90%+ (Tier 1 Purity Boost)</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Itemized Calculation Summary Box */}
            <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 font-mono space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Base Weight Payout ({weightInput} kg × ₹{baseRate}/kg):</span>
                <span className="text-white font-bold">₹{rawBase.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>+ Tier 1 High Purity Bonus (+10%):</span>
                <span className="font-bold">+₹{tier1Amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-teal-300">
                <span>+ Tier 2 Volume &amp; Identity Bonus (+15%):</span>
                <span className="font-bold">+₹{tier2Amount.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-sm sm:text-base">
                <span className="text-slate-200 font-bold">Total Spot UPI Disbursal:</span>
                <span className="text-2xl font-black text-emerald-400">
                  ₹{totalCalculatedPayout.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Instant Razorpay Spot UPI Button */}
            <button
              type="button"
              onClick={handleDisburseUpi}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99]"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Instant Spot Razorpay UPI Disbursal (12-Digit UTR)</span>
            </button>
          </div>

          {/* Real-Time Payout Transaction Receipts History */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Recent Spot Disbursals ({payoutList.length})</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-500">NPCI 256-Bit Encrypted</span>
            </div>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto">
              {payoutList.map((p) => (
                <div 
                  key={p.utr}
                  onClick={() => setActiveReceipt(p)}
                  className="p-3 rounded-xl bg-slate-950/70 hover:bg-slate-950 border border-slate-800/80 cursor-pointer transition-all flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{p.material} ({p.weightKg} kg)</span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800">
                        SUCCESS
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      UTR: <strong className="text-slate-200">{p.utr}</strong> • {p.timestamp}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-bold font-mono text-emerald-400">
                      ₹{p.totalPayout.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-indigo-300 font-mono">
                      View Receipt ↗
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Official 12-Digit UTR Razorpay UPI Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-3xl border border-emerald-500/50 bg-[#0a111e] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold font-['Outfit'] text-white">
                  Spot UPI Payout Voucher
                </h3>
              </div>
              <button 
                onClick={() => setActiveReceipt(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2.5">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">12-Digit NPCI UTR:</span>
                <span className="text-emerald-400 font-bold">{activeReceipt.utr}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">Beneficiary:</span>
                <span className="text-white font-bold">{activeReceipt.workerName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">VPA Handle:</span>
                <span className="text-teal-300">{activeReceipt.vpa}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">Base Weight Amount:</span>
                <span className="text-slate-200">₹{activeReceipt.basePay.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">Tier 1 Purity Boost (+10%):</span>
                <span className="text-emerald-400">+₹{activeReceipt.tier1Bonus.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-500">Tier 2 Volume Boost (+15%):</span>
                <span className="text-teal-300">+₹{activeReceipt.tier2Bonus.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 text-sm font-bold">
                <span className="text-white">Total Disbursed:</span>
                <span className="text-emerald-400 text-lg">₹{activeReceipt.totalPayout.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Receipt PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveReceipt(null)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                Close Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
