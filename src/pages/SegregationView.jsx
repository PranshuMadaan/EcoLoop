import React, { useState } from 'react';

/**
 * SegregationView - Waste Segregation Engine & Compliance Dashboard
 * Tracks source segregation compliance rates across municipal wards:
 * - Green = Compliant (>=80%)
 * - Amber = Moderately Compliant (60-79%)
 * - Red = Non-Compliant (<60%)
 * SWM Rules 2026 4-Stream Breakdown:
 * 1. Organic (Wet Waste)
 * 2. Dry Recyclable (Plastics, Paper, Glass, Metals)
 * 3. Domestic Hazardous (Sanitary, E-Waste, Paints/Chemicals)
 * 4. Non-Recyclable (Inert, Multilayer Residue)
 * Door-to-door pickup logs and non-compliance penalty issuance.
 */
export default function SegregationView({ standalone = false }) {
  const [filterWard, setFilterWard] = useState('ALL');
  const [selectedWardDetail, setSelectedWardDetail] = useState(null);
  const [alertSent, setAlertSent] = useState('');

  // Ward compliance rates in Patiala Pilot Area
  const wardComplianceData = [
    {
      wardId: 'WARD-01',
      name: 'Model Town (Ward 01)',
      compliancePct: 92.4,
      status: 'COMPLIANT_GREEN',
      totalHouseholds: 2450,
      scannedToday: 2310,
      streams: { organic: '48%', dry: '42%', hazardous: '4%', nonRecyclable: '6%' },
      inspector: 'Er. Sandeep Verma',
    },
    {
      wardId: 'WARD-02',
      name: 'Leela Bhawan (Ward 02)',
      compliancePct: 88.6,
      status: 'COMPLIANT_GREEN',
      totalHouseholds: 1890,
      scannedToday: 1780,
      streams: { organic: '52%', dry: '38%', hazardous: '3%', nonRecyclable: '7%' },
      inspector: 'Pooja Rani (Superintendent)',
    },
    {
      wardId: 'WARD-03',
      name: 'Urban Estate Phase II (Ward 03)',
      compliancePct: 76.5,
      status: 'MODERATE_AMBER',
      totalHouseholds: 3100,
      scannedToday: 2640,
      streams: { organic: '45%', dry: '35%', hazardous: '8%', nonRecyclable: '12%' },
      inspector: 'Rajinder Kumar',
    },
    {
      wardId: 'WARD-04',
      name: 'Tripuri Waste Centre (Ward 04)',
      compliancePct: 54.2,
      status: 'NON_COMPLIANT_RED',
      totalHouseholds: 2800,
      scannedToday: 1950,
      streams: { organic: '35%', dry: '25%', hazardous: '14%', nonRecyclable: '26%' },
      inspector: 'Gurjit Singh',
    },
    {
      wardId: 'WARD-05',
      name: 'Rajpura Road (Ward 05)',
      compliancePct: 81.0,
      status: 'COMPLIANT_GREEN',
      totalHouseholds: 1650,
      scannedToday: 1540,
      streams: { organic: '50%', dry: '40%', hazardous: '4%', nonRecyclable: '6%' },
      inspector: 'Er. Sandeep Verma',
    },
    {
      wardId: 'WARD-06',
      name: 'Qila Mubarak / Old City (Ward 06)',
      compliancePct: 48.7,
      status: 'NON_COMPLIANT_RED',
      totalHouseholds: 3400,
      scannedToday: 2100,
      streams: { organic: '30%', dry: '28%', hazardous: '12%', nonRecyclable: '30%' },
      inspector: 'Balwinder Singh',
    },
    {
      wardId: 'WARD-07',
      name: 'Baradari Garden (Ward 07)',
      compliancePct: 95.8,
      status: 'COMPLIANT_GREEN',
      totalHouseholds: 1200,
      scannedToday: 1180,
      streams: { organic: '60%', dry: '34%', hazardous: '2%', nonRecyclable: '4%' },
      inspector: 'Pooja Rani',
    },
    {
      wardId: 'WARD-08',
      name: 'Patiala Cantt (Ward 08)',
      compliancePct: 91.2,
      status: 'COMPLIANT_GREEN',
      totalHouseholds: 1400,
      scannedToday: 1350,
      streams: { organic: '55%', dry: '38%', hazardous: '2%', nonRecyclable: '5%' },
      inspector: 'Col. AS Brar',
    },
  ];

  // Door-to-Door Pickup Logs
  const d2dPickupLogs = [
    {
      logId: 'LOG-78291',
      timestamp: 'Today, 07:18 AM',
      householdQr: 'QR#7829-LEELA-PATIALA',
      ward: 'Leela Bhawan (Ward 02)',
      collector: 'Sunita Devi (PMC-0482)',
      organicWeightKg: 2.4,
      dryWeightKg: 1.8,
      hazardousPresent: false,
      isCompliant: true,
      tokenEarned: 15,
    },
    {
      logId: 'LOG-78292',
      timestamp: 'Today, 07:15 AM',
      householdQr: 'QR#1140-MODEL-TOWN',
      ward: 'Model Town (Ward 01)',
      collector: 'Ramesh Kumar (PMC-0518)',
      organicWeightKg: 3.1,
      dryWeightKg: 2.2,
      hazardousPresent: false,
      isCompliant: true,
      tokenEarned: 15,
    },
    {
      logId: 'LOG-78293',
      timestamp: 'Today, 07:08 AM',
      householdQr: 'QR#4412-TRIPURI-RES',
      ward: 'Tripuri (Ward 04)',
      collector: 'Gurmit Ram (PMC-0312)',
      organicWeightKg: 4.8,
      dryWeightKg: 0.8,
      hazardousPresent: true,
      isCompliant: false,
      tokenEarned: 0,
      note: 'Mixed batteries in wet waste bin. Contamination warning issued.',
    },
    {
      logId: 'LOG-78294',
      timestamp: 'Today, 06:55 AM',
      householdQr: 'QR#9920-BARADARI',
      ward: 'Baradari Garden (Ward 07)',
      collector: 'Jaspreet Kaur (PMC-0641)',
      organicWeightKg: 1.9,
      dryWeightKg: 2.5,
      hazardousPresent: false,
      isCompliant: true,
      tokenEarned: 15,
    },
  ];

  const filteredWards = wardComplianceData.filter((w) => {
    if (filterWard === 'ALL') return true;
    if (filterWard === 'GREEN') return w.status === 'COMPLIANT_GREEN';
    if (filterWard === 'AMBER') return w.status === 'MODERATE_AMBER';
    if (filterWard === 'RED') return w.status === 'NON_COMPLIANT_RED';
    return true;
  });

  const handleDispatchAction = (ward) => {
    setAlertSent(`✓ SWM Compliance Notice & Awareness Marshals dispatched to ${ward.name}!`);
    setTimeout(() => setAlertSent(''), 4000);
  };

  return (
    <div className={`w-full max-w-7xl mx-auto space-y-6 ${standalone ? 'py-6 px-4' : ''}`}>
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-md shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            SWM Rules 2026 Mandate · RFID Doorstep Monitoring
          </div>
          <h1 className="font-['Outfit'] text-2xl md:text-3xl font-extrabold text-white">
            Waste Segregation Compliance Engine
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl">
            Real-time compliance heat-map tracking source segregation across all Patiala municipal wards. Monitors 4-stream separation and awards Green Tokens for compliant households.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950 border border-white/10">
          {[
            { id: 'ALL', label: 'All Wards (8)' },
            { id: 'GREEN', label: '🟢 Compliant (&ge;80%)' },
            { id: 'AMBER', label: '🟡 Moderate (60-79%)' },
            { id: 'RED', label: '🔴 Non-Compliant (&lt;60%)' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterWard(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterWard === f.id
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {alertSent && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <span>✓</span>
          <span>{alertSent}</span>
        </div>
      )}

      {/* 4-Stream SWM Protocols Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
            <span>🟢 Wet Organic Waste</span>
            <span>50.2% Volume</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Food scraps, vegetable peels, garden foliage. Dispatched to Patiala Municipal Composting Facility.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-400">
            <span>🔵 Dry Recyclables</span>
            <span>34.8% Volume</span>
          </div>
          <p className="text-[11px] text-slate-400">
            PET bottles, HDPE rigid, paper, corrugated boxes, metals. Aggregated at DWCCs for B2B auctions.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-rose-400">
            <span>🔴 Domestic Hazardous</span>
            <span>4.5% Volume</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Diapers, sanitary pads, CFL bulbs, paint cans, button cells. Isolated for scientific incineration.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>⚫ Non-Recyclable (Inert)</span>
            <span>10.5% Volume</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Street sweepings, construction silt, unrecyclable composites. Directed to engineered landfill.
          </p>
        </div>
      </div>

      {/* Ward Compliance Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-['Outfit'] text-lg font-bold text-white flex items-center gap-2">
            <span>🗺️</span> Ward Segregation Compliance League Table
          </h3>
          <span className="text-xs text-slate-400 font-mono">Real-time RFID Doorstep Telemetry</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredWards.map((w) => {
            const isGreen = w.status === 'COMPLIANT_GREEN';
            const isAmber = w.status === 'MODERATE_AMBER';
            const statusColor = isGreen
              ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400'
              : isAmber
              ? 'border-amber-500/40 bg-amber-950/20 text-amber-400'
              : 'border-rose-500/40 bg-rose-950/20 text-rose-400';

            return (
              <div
                key={w.wardId}
                className="p-5 rounded-3xl bg-slate-900 border border-white/10 hover:border-white/20 transition-all shadow-xl space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{w.wardId}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${statusColor}`}>
                      {w.compliancePct}% COMPLIANT
                    </span>
                  </div>

                  <h4 className="font-['Outfit'] text-base font-bold text-white">{w.name}</h4>
                  <div className="text-[11px] text-slate-400">Superintendent: {w.inspector}</div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isGreen ? 'bg-emerald-500' : isAmber ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${w.compliancePct}%` }}
                    />
                  </div>

                  {/* Doorstep Scans */}
                  <div className="flex justify-between text-xs text-slate-400 pt-1">
                    <span>Doorstep Scans Today:</span>
                    <strong className="text-white font-mono">
                      {w.scannedToday} / {w.totalHouseholds}
                    </strong>
                  </div>

                  {/* 4-Stream Percentages Mini-Box */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-white/5 grid grid-cols-4 gap-1 text-center text-[10px]">
                    <div>
                      <span className="text-slate-500 block">Wet</span>
                      <strong className="text-emerald-400 font-mono">{w.streams.organic}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Dry</span>
                      <strong className="text-cyan-400 font-mono">{w.streams.dry}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Haz</span>
                      <strong className="text-rose-400 font-mono">{w.streams.hazardous}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Inert</span>
                      <strong className="text-slate-400 font-mono">{w.streams.nonRecyclable}</strong>
                    </div>
                  </div>
                </div>

                {/* Ward Action */}
                <button
                  type="button"
                  onClick={() => handleDispatchAction(w)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold font-['Outfit'] uppercase tracking-wider transition-all cursor-pointer ${
                    isGreen
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {isGreen ? 'View Detailed Audit' : '⚠️ Issue Non-Compliance Warning'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Door-to-Door Pickup Verification Logs Table */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="font-['Outfit'] text-lg font-bold text-white flex items-center gap-2">
              <span>📋</span> Door-to-Door Household Pickup Audit Log
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live RFID bag-scan timestamps and segregation awards verified by doorstep micro-tipper operators.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400">Live Synchronized</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px]">
              <tr>
                <th className="p-3">Log ID</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Household QR Hash</th>
                <th className="p-3">Ward</th>
                <th className="p-3">Collector ID</th>
                <th className="p-3">Organic (kg)</th>
                <th className="p-3">Dry (kg)</th>
                <th className="p-3">Compliance</th>
                <th className="p-3">Reward</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {d2dPickupLogs.map((log) => (
                <tr key={log.logId} className="hover:bg-slate-950/40">
                  <td className="p-3 font-mono font-bold text-slate-300">{log.logId}</td>
                  <td className="p-3 text-slate-400">{log.timestamp}</td>
                  <td className="p-3 font-mono text-cyan-300 font-bold">{log.householdQr}</td>
                  <td className="p-3 text-white font-medium">{log.ward}</td>
                  <td className="p-3 text-slate-300">{log.collector}</td>
                  <td className="p-3 font-mono text-emerald-400">{log.organicWeightKg} kg</td>
                  <td className="p-3 font-mono text-cyan-400">{log.dryWeightKg} kg</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.isCompliant
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                          : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                      }`}
                    >
                      {log.isCompliant ? '100% SEGREGATED' : 'CONTAMINATED'}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-emerald-400">
                    {log.tokenEarned > 0 ? `+${log.tokenEarned} GT` : '0 GT'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
