import React, { useState, useEffect } from 'react';

// Benchmark scrap prices (₹/kg)
const DEFAULT_RATES = {
  PET_CLEAR: { name: 'PET Clear Bottles', rate: 22.0 },
  HDPE_RIGID: { name: 'HDPE Rigid Plastic', rate: 18.5 },
  CORRUGATED_CARDBOARD: { name: 'Cardboard / गत्ता', rate: 12.0 },
  LDPE_FILM: { name: 'LDPE Polythene Film', rate: 8.5 },
  FERROUS_METAL: { name: 'Ferrous Metal / लोहा', rate: 32.0 },
  E_WASTE_MIXED: { name: 'E-Waste Mixed', rate: 45.0 },
  ALUMINIUM: { name: 'Aluminium Cans', rate: 85.0 },
  GLASS_CLEAR: { name: 'Glass Bottles', rate: 3.5 },
};

/**
 * VoiceWeighCalculator: Operator Interface for DWCC Hubs
 * Features large audio pulse visualizer, auto Gross - Tare deduction,
 * and high-visibility bold INR payout display.
 */
export default function VoiceWeighCalculator({
  onWeighInSubmit,
  selectedWorker = null,
  activeHubName = 'SWaCH DWCC Kothrud, Pune',
}) {
  const [materialGrade, setMaterialGrade] = useState('PET_CLEAR');
  const [grossWeight, setGrossWeight] = useState('');
  const [tareWeight, setTareWeight] = useState('2.5'); // Default tare for standard collection gunny sack
  const [ratePerKg, setRatePerKg] = useState(DEFAULT_RATES.PET_CLEAR.rate);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('hi');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update rate when material grade changes
  useEffect(() => {
    if (DEFAULT_RATES[materialGrade]) {
      setRatePerKg(DEFAULT_RATES[materialGrade].rate);
    }
  }, [materialGrade]);

  // Derived Weight Math with precision rounding
  const grossNum = parseFloat(grossWeight) || 0;
  const tareNum = parseFloat(tareWeight) || 0;
  const netWeight = Math.max(0, parseFloat((grossNum - tareNum).toFixed(2)));
  const totalPayout = Math.max(0, parseFloat((netWeight * ratePerKg).toFixed(2)));

  // Simulated Voice Logging with Audio Visualizer
  const handleToggleVoice = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    setVoiceTranscript('Listening... Speak weight and material grade');

    // Simulate speech-to-text processing after 2.2 seconds
    setTimeout(() => {
      setIsRecording(false);
      // Sample simulated voice notes based on chosen language
      const simulatedInputs = {
        hi: { text: '28 किलो पीईटी प्लास्टिक', grade: 'PET_CLEAR', gross: 30.5, tare: 2.5 },
        mr: { text: '35 किलो पुठ्ठा गत्ता', grade: 'CORRUGATED_CARDBOARD', gross: 37.0, tare: 2.0 },
        kn: { text: '20 ಕೆಜಿ ಪ್ಲಾಸ್ಟಿಕ್ ಬಾಟಲಿ', grade: 'PET_CLEAR', gross: 22.5, tare: 2.5 },
        en: { text: '42 kg rigid HDPE drums', grade: 'HDPE_RIGID', gross: 45.0, tare: 3.0 },
      };

      const match = simulatedInputs[selectedLanguage] || simulatedInputs.hi;
      setVoiceTranscript(`"${match.text}" → Parsed: ${match.gross - match.tare}kg ${match.grade}`);
      setMaterialGrade(match.grade);
      setGrossWeight(match.gross.toString());
      setTareWeight(match.tare.toString());
    }, 2200);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (netWeight <= 0) {
      alert('Gross weight must be strictly greater than Tare weight.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        worker_id: selectedWorker?.worker_id || '77777777-7777-7777-7777-777777777701',
        material_grade: materialGrade,
        gross_weight_kg: grossNum,
        tare_weight_kg: tareNum,
        net_weight_kg: netWeight,
        applied_rate_per_kg: ratePerKg,
        total_payable_inr: totalPayout,
        dwcc_center_name: activeHubName,
        voice_transcript: voiceTranscript || null,
      };

      if (onWeighInSubmit) {
        await onWeighInSubmit(payload);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white">
      {/* Header with Hub Tag */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>⚖️ DWCC Digital Weigh-In Kiosk</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{activeHubName}</p>
        </div>

        {/* Language Selector for STT */}
        <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
          {[
            { id: 'hi', label: 'हिंदी' },
            { id: 'mr', label: 'मराठी' },
            { id: 'kn', label: 'ಕನ್ನಡ' },
            { id: 'en', label: 'ENG' },
          ].map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => setSelectedLanguage(lang.id)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                selectedLanguage === lang.id
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Voice Assistant Visualizer Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-800 to-teal-950/60 border border-emerald-500/30 rounded-2xl p-4 mb-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
        {/* Pulsing Audio Visualizer Button */}
        <button
          type="button"
          onClick={handleToggleVoice}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xl ${
            isRecording
              ? 'bg-rose-500 text-white animate-pulse ring-8 ring-rose-500/30 shadow-rose-500/50 scale-105'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 active:scale-95'
          }`}
          title="Single-Tap Voice Logging"
        >
          {isRecording ? (
            <div className="flex items-center space-x-1">
              <span className="w-1.5 h-6 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-8 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          )}
        </button>

        <p className="text-xs font-semibold text-emerald-300 mt-3">
          {isRecording ? 'Listening for weight & scrap grade...' : 'Single-Tap Voice Logging'}
        </p>

        {voiceTranscript && (
          <p className="text-[11px] font-mono text-emerald-200 mt-1 bg-slate-900/80 px-3 py-1 rounded-full border border-emerald-500/30 max-w-sm truncate">
            {voiceTranscript}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Material Grade Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Material Grade & Fair Scrap Benchmark
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(DEFAULT_RATES).map(([key, data]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMaterialGrade(key)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer min-h-[52px] flex flex-col justify-between ${
                  materialGrade === key
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span className="text-[11px] truncate block">{data.name}</span>
                <span className="text-xs font-bold text-emerald-400">₹{data.rate}/kg</span>
              </button>
            ))}
          </div>
        </div>

        {/* Gross vs. Tare Weight Inputs with Auto-Deduction */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Gross Weight (kg)
            </label>
            <input
              type="number"
              step="0.05"
              placeholder="e.g. 45.5"
              value={grossWeight}
              onChange={(e) => setGrossWeight(e.target.value)}
              required
              className="w-full min-h-[48px] px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-lg font-bold focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Tare Deduction (kg)
            </label>
            <input
              type="number"
              step="0.05"
              placeholder="e.g. 2.5"
              value={tareWeight}
              onChange={(e) => setTareWeight(e.target.value)}
              className="w-full min-h-[48px] px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 font-mono text-lg font-medium focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-emerald-400 uppercase mb-1">
              Net Weight (kg)
            </label>
            <div className="w-full min-h-[48px] px-3.5 py-2.5 bg-emerald-950/30 border border-emerald-500/40 rounded-xl text-emerald-300 font-mono text-xl font-black flex items-center">
              {netWeight > 0 ? `${netWeight} kg` : '0.00 kg'}
            </div>
          </div>
        </div>

        {/* High-Visibility Payout Display */}
        <div className="bg-gradient-to-br from-emerald-900/40 to-slate-950 border-2 border-emerald-500/50 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider block">
              Instant Total Payable
            </span>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
              ₹{totalPayout.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {netWeight} kg × ₹{ratePerKg.toFixed(2)}/kg
            </p>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              <span>⚡ Razorpay Spot UPI</span>
            </span>
            <p className="text-[10px] text-slate-400 mt-1">0% deduction • Instant UTR</p>
          </div>
        </div>

        {/* Submit & Instant Payout Button: 48px+ touch target */}
        <button
          type="submit"
          disabled={isSubmitting || netWeight <= 0}
          className="w-full min-h-[52px] px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-base font-black flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/25 transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <span>Processing Spot UPI Transfer...</span>
          ) : (
            <span>⚡ Log Weigh-In & Pay ₹{totalPayout.toFixed(2)} Instantly</span>
          )}
        </button>
      </form>
    </div>
  );
}
