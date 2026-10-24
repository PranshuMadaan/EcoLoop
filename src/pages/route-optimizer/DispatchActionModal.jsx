import React, { useState } from 'react';

/**
 * DispatchActionModal: Instant Circuit Manifest Dispatch
 */
export function DispatchActionModal({
  isOpen,
  onClose,
  manifest,
  onConfirmDispatch,
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentManifest = manifest || {
    manifest_id: 'MNFST-261024',
    manifest_hash: '0x8f2a4c1e9d3b7084route2026',
    vehicle: { id: 'TRK-EV-01', model: 'Tata Ace EV CleanPayload' },
    waypoints_count: 5,
    total_tonnage_mt: '7.20',
    est_duration_mins: 98,
    driver_name: 'Murugan Selvam',
    driver_phone: '+91 98440 99881',
  };

  const handleCopyDispatchLink = () => {
    const link = `https://ecoloop.in/driver/circuit/${currentManifest.manifest_id}?auth=${currentManifest.manifest_hash}`;
    navigator.clipboard?.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDispatch = async () => {
    setIsSubmitting(true);
    await onConfirmDispatch(notes);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-2xl relative text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold mb-1">
              <span>⚡ Route Ready for Dispatch</span>
            </div>
            <h3 className="font-['Outfit'] font-bold text-lg text-white">
              Dispatch Scrap Collection Manifest
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Manifest Summary Card */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 mb-4 text-xs space-y-2.5">
          <div className="flex justify-between items-center pb-2 border-b border-white/10">
            <span className="text-slate-400">Circuit ID</span>
            <span className="font-mono font-bold text-white">{currentManifest.manifest_id}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Assigned EV Truck</span>
            <span className="font-semibold text-emerald-400">
              {currentManifest.vehicle?.id} ({currentManifest.vehicle?.model})
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Driver Contact</span>
            <span className="font-mono text-white">
              {currentManifest.driver_name} ({currentManifest.driver_phone})
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Stops & Tonnage</span>
            <span className="font-bold text-slate-200">
              {currentManifest.waypoints_count} Hubs • {currentManifest.total_tonnage_mt} MT Total
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Est. Circuit Time</span>
            <span className="font-mono text-sky-400 font-bold">
              ~{currentManifest.est_duration_mins} Minutes
            </span>
          </div>
          <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[11px]">
            <span className="text-slate-500 uppercase">Audit Hash</span>
            <span className="font-mono text-emerald-400 truncate max-w-[200px]">
              {currentManifest.manifest_hash}
            </span>
          </div>
        </div>

        {/* Dispatch Notes */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-300 block mb-1">
            Driver Dispatch Instructions / Hub Gates
          </label>
          <input
            type="text"
            placeholder="e.g. Prioritize Koramangala 4th Block DWCC before 4:00 PM"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full h-11 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
          />
        </div>

        {/* Action Buttons: Copy Link & Confirm Dispatch */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopyDispatchLink}
            className="flex-1 min-h-[46px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{copiedLink ? '✓ Copied Driver Link' : '🔗 Copy Driver URL'}</span>
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleDispatch}
            className="flex-1 min-h-[46px] rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <span>{isSubmitting ? 'Transmitting...' : '🚀 Transmit & Lock Manifest'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default DispatchActionModal;
