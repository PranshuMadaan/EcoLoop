import React, { useState } from 'react';

export function CreateListingModal({ isOpen, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [materialGrade, setMaterialGrade] = useState('PET_CLEAR');
  const [weightKg, setWeightKg] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [locationCity, setLocationCity] = useState('Bengaluru');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!weightKg || Number(weightKg) <= 0) {
      setError('Please provide a valid scrap lot weight.');
      return;
    }
    if (!pricePerKg || Number(pricePerKg) <= 0) {
      setError('Please provide a valid reserve price per kg.');
      return;
    }

    setSubmitting(true);
    const res = await onSubmit({
      title: title || `${materialGrade} Aggregated Lot - ${locationCity}`,
      material_grade: materialGrade,
      weight_kg: Number(weightKg),
      price_per_kg: Number(pricePerKg),
      location_city: locationCity,
      description,
      seller_organization: 'Bengaluru Central DWCC Hub',
    });
    setSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Failed to publish listing');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl relative text-white">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div>
            <h3 className="font-['Outfit'] font-bold text-lg text-white">Post Aggregated Scrap Lot</h3>
            <p className="text-xs text-slate-400">List segregated DWCC municipal scrap for recycler competitive bidding</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Material Grade</label>
            <select
              value={materialGrade}
              onChange={(e) => setMaterialGrade(e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-emerald-500"
            >
              <option value="PET_CLEAR">PET Clear Plastic Bottles (Grade 1)</option>
              <option value="HDPE_RIGID">HDPE Rigid Drums & Bales (Grade 2)</option>
              <option value="CARDBOARD_OCC">Old Corrugated Cardboard (OCC)</option>
              <option value="E_WASTE_PCB">Accredited Printed Circuit Boards (PCB)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Weight (kg)</label>
              <input
                type="number"
                step="10"
                min="10"
                placeholder="e.g. 500"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Reserve Price (₹/kg)</label>
              <input
                type="number"
                step="0.5"
                min="1"
                placeholder="e.g. 28.50"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">DWCC Aggregation City</label>
              <input
                type="text"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Lot Title (Optional)</label>
              <input
                type="text"
                placeholder="Auto-generated if empty"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">MoEFCC Batch Notes</label>
            <textarea
              rows="2"
              placeholder="Segregated and baled at BBMP South DWCC center. Moisture content < 4%."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
            >
              {submitting ? 'Publishing Lot...' : '✓ Publish to Auction Feed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
