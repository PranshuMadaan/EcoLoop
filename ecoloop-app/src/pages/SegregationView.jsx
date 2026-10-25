import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Layers, 
  Search, 
  QrCode, 
  ShieldCheck, 
  Sparkles, 
  Camera, 
  TrendingUp, 
  FileSpreadsheet,
  Clock
} from 'lucide-react';

const wardComplianceData = [
  {
    wardId: 'Ward 14 (Aundh / Baner)',
    totalHouseholds: 8420,
    compliancePct: 91.4,
    status: 'COMPLIANT', // Green
    wetKg: 4210,
    dryKg: 3480,
    sanitaryKg: 210,
    domesticHazardousKg: 45,
    lastAudit: '12 mins ago',
  },
  {
    wardId: 'Ward 15 (Pashan / Sutarwadi)',
    totalHouseholds: 6150,
    compliancePct: 86.2,
    status: 'COMPLIANT', // Green
    wetKg: 3100,
    dryKg: 2200,
    sanitaryKg: 180,
    domesticHazardousKg: 30,
    lastAudit: '25 mins ago',
  },
  {
    wardId: 'Ward 21 (Kothrud / Karve Rd)',
    totalHouseholds: 9800,
    compliancePct: 78.5,
    status: 'MODERATE', // Amber
    wetKg: 4900,
    dryKg: 2800,
    sanitaryKg: 320,
    domesticHazardousKg: 95,
    lastAudit: '40 mins ago',
  },
  {
    wardId: 'Ward 08 (Shivajinagar Gaothan)',
    totalHouseholds: 7200,
    compliancePct: 62.1,
    status: 'NON_COMPLIANT', // Red
    wetKg: 3400,
    dryKg: 1100,
    sanitaryKg: 410,
    domesticHazardousKg: 140,
    lastAudit: '1 hour ago',
  },
  {
    wardId: 'Ward 03 (Hadapsar Industrial)',
    totalHouseholds: 11200,
    compliancePct: 58.4,
    status: 'NON_COMPLIANT', // Red
    wetKg: 5200,
    dryKg: 1800,
    sanitaryKg: 540,
    domesticHazardousKg: 210,
    lastAudit: '2 hours ago',
  }
];

const initialPickupLogs = [
  {
    logId: 'LOG-9401',
    timestamp: '11:02 AM',
    qrHash: '#PUN-W14-D402',
    society: 'Mayur Heights, Flat 402, Aundh',
    grade: 'GRADE_A',
    wetKg: 2.4,
    dryKg: 1.8,
    hazardousKg: 0.0,
    aiPurityScore: 96,
    inspector: 'Ramesh Kale (SW-342)',
    flagged: false,
  },
  {
    logId: 'LOG-9400',
    timestamp: '10:58 AM',
    qrHash: '#PUN-W14-D401',
    society: 'Mayur Heights, Flat 401, Aundh',
    grade: 'GRADE_A',
    wetKg: 1.9,
    dryKg: 2.1,
    hazardousKg: 0.0,
    aiPurityScore: 94,
    inspector: 'Ramesh Kale (SW-342)',
    flagged: false,
  },
  {
    logId: 'LOG-9399',
    timestamp: '10:45 AM',
    qrHash: '#PUN-W14-D318',
    society: 'Sai Heritage, Flat 302, Baner',
    grade: 'GRADE_B',
    wetKg: 3.1,
    dryKg: 1.2,
    hazardousKg: 0.1,
    aiPurityScore: 78,
    inspector: 'Sunita Devi (SW-198)',
    flagged: false,
  },
  {
    logId: 'LOG-9398',
    timestamp: '10:31 AM',
    qrHash: '#PUN-W08-D114',
    society: 'Shivaji Gali Society, Door 14',
    grade: 'GRADE_C',
    wetKg: 4.8,
    dryKg: 0.4,
    hazardousKg: 0.8,
    aiPurityScore: 42,
    inspector: 'MCD Inspector K. Sharma',
    flagged: true,
  },
  {
    logId: 'LOG-9397',
    timestamp: '10:15 AM',
    qrHash: '#PUN-W21-D205',
    society: 'Kothrud Residency, Flat 205',
    grade: 'GRADE_A',
    wetKg: 2.2,
    dryKg: 2.5,
    hazardousKg: 0.0,
    aiPurityScore: 92,
    inspector: 'Ramesh Kale (SW-342)',
    flagged: false,
  }
];

export default function SegregationView() {
  const [pickupLogs, setPickupLogs] = useState(initialPickupLogs);
  const [filterGrade, setFilterGrade] = useState('ALL');
  const [searchHash, setSearchHash] = useState('');
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);

  // Toggle Red Flag on household
  const handleToggleFlag = (logId) => {
    setPickupLogs(prev => prev.map(item => {
      if (item.logId === logId) {
        return { ...item, flagged: !item.flagged };
      }
      return item;
    }));
  };

  const filteredLogs = pickupLogs.filter(item => {
    const matchesGrade = filterGrade === 'ALL' || item.grade === filterGrade;
    const matchesSearch = item.qrHash.toLowerCase().includes(searchHash.toLowerCase()) || item.society.toLowerCase().includes(searchHash.toLowerCase());
    return matchesGrade && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Deck */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              MODULE 04
            </span>
            <h1 className="text-xl sm:text-2xl font-bold font-['Outfit'] text-white">
              Waste Segregation Engine &amp; Ward Audit
            </h1>
            <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Source Compliance • SBM 2.0
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Tracking doorstep source segregation compliance rates across municipal wards with QR household telemetry and AI optical sort auditing.
          </p>
        </div>

        {/* Global Compliance HUD */}
        <div className="flex items-center gap-3 bg-slate-900/90 px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono">
          <div>
            <span className="text-slate-400 text-[10px] block">Overall City Compliance</span>
            <span className="text-lg font-black text-emerald-400 font-mono">81.8%</span>
          </div>
          <div className="border-l border-slate-800 pl-3">
            <span className="text-slate-400 text-[10px] block">SBM 2.0 Target</span>
            <span className="text-base font-bold text-teal-300 font-mono">85.0%+</span>
          </div>
        </div>
      </div>

      {/* Ward Compliance Rate Grid (Green, Amber, Red) */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold font-['Outfit'] text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Municipal Ward Segregation League Table</span>
            </h3>
            <p className="text-xs text-slate-400">
              Color status indicates compliance: Green (≥85%), Amber (70-84%), Red (&lt;70%).
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Moderate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Non-Compliant
            </span>
          </div>
        </div>

        {/* Ward Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wardComplianceData.map((ward) => {
            const isGreen = ward.compliancePct >= 85;
            const isAmber = ward.compliancePct >= 70 && ward.compliancePct < 85;
            const isRed = ward.compliancePct < 70;

            const borderColor = isGreen ? 'border-emerald-500/40' : isAmber ? 'border-amber-500/40' : 'border-rose-500/40';
            const badgeBg = isGreen ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : isAmber ? 'bg-amber-950/80 text-amber-300 border-amber-800' : 'bg-rose-950/80 text-rose-300 border-rose-800';

            return (
              <div 
                key={ward.wardId}
                className={`p-4 rounded-xl bg-slate-950/80 border ${borderColor} space-y-3 transition-all hover:scale-[1.01]`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white truncate max-w-[200px]">
                    {ward.wardId}
                  </h4>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badgeBg}`}>
                    {ward.status}
                  </span>
                </div>

                {/* Progress Meter */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-400">Compliance Rate</span>
                    <span className={`font-bold ${isGreen ? 'text-emerald-400' : isAmber ? 'text-amber-400' : 'text-rose-400'}`}>
                      {ward.compliancePct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${isGreen ? 'bg-emerald-500' : isAmber ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${ward.compliancePct}%` }}
                    ></div>
                  </div>
                </div>

                {/* Waste Fractions Split */}
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono pt-1 border-t border-slate-800/80">
                  <div className="bg-slate-900 p-1 rounded">
                    <span className="text-slate-500 block">Wet Org</span>
                    <span className="text-slate-200 font-bold">{ward.wetKg} kg</span>
                  </div>
                  <div className="bg-slate-900 p-1 rounded">
                    <span className="text-slate-500 block">Dry Recyc</span>
                    <span className="text-emerald-400 font-bold">{ward.dryKg} kg</span>
                  </div>
                  <div className="bg-slate-900 p-1 rounded">
                    <span className="text-slate-500 block">Sanitary</span>
                    <span className="text-slate-300 font-bold">{ward.sanitaryKg} kg</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>{ward.totalHouseholds.toLocaleString()} Households</span>
                  <span>Audit: {ward.lastAudit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Doorstep Household Collection & Audit Logs */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold font-['Outfit'] text-white uppercase tracking-wider flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Door-to-Door Household Collection Telemetry Logs</span>
            </h3>
            <p className="text-xs text-slate-400">
              Real-time scans logged by waste pickers using BLE scales and tactile audit ratings.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search Door QR..."
                value={searchHash}
                onChange={(e) => setSearchHash(e.target.value)}
                className="bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 font-mono"
              />
            </div>

            <div className="flex gap-1 text-[11px] font-mono">
              {['ALL', 'GRADE_A', 'GRADE_B', 'GRADE_C'].map(g => (
                <button
                  key={g}
                  onClick={() => setFilterGrade(g)}
                  className={`px-2.5 py-1 rounded-lg font-bold ${
                    filterGrade === g 
                      ? 'bg-emerald-500 text-slate-950' 
                      : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  {g === 'ALL' ? 'All' : g.replace('GRADE_', 'Grade ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pickup Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px]">
                <th className="py-2.5 px-3">Log ID / Time</th>
                <th className="py-2.5 px-3">Household Address &amp; QR Hash</th>
                <th className="py-2.5 px-3">Segregation Grade</th>
                <th className="py-2.5 px-3">AI Vision Score</th>
                <th className="py-2.5 px-3">Weight Breakdown</th>
                <th className="py-2.5 px-3">Inspector</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map(item => (
                <tr 
                  key={item.logId}
                  className={`hover:bg-slate-900/40 transition-colors ${item.flagged ? 'bg-rose-950/20' : ''}`}
                >
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-200">{item.logId}</span>
                    <span className="text-[10px] text-slate-500 block">{item.timestamp}</span>
                  </td>

                  <td className="py-3 px-3 font-sans">
                    <div className="font-semibold text-white">{item.society}</div>
                    <span className="text-[11px] text-teal-400 font-mono">{item.qrHash}</span>
                  </td>

                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.grade === 'GRADE_A' 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : item.grade === 'GRADE_B' 
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {item.grade === 'GRADE_A' ? '★ Grade A (Clean)' : item.grade === 'GRADE_B' ? 'Grade B (Mixed)' : 'Grade C (Contaminated)'}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <span className={`font-bold ${item.aiPurityScore >= 90 ? 'text-emerald-400' : item.aiPurityScore >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {item.aiPurityScore}%
                    </span>
                  </td>

                  <td className="py-3 px-3 text-[11px]">
                    <span className="text-slate-300">Wet: {item.wetKg}kg</span> • <span className="text-emerald-400">Dry: {item.dryKg}kg</span>
                    {item.hazardousKg > 0 && <span className="text-rose-400 block text-[10px]">Haz: {item.hazardousKg}kg</span>}
                  </td>

                  <td className="py-3 px-3 text-[11px] text-slate-400 font-sans">
                    {item.inspector}
                  </td>

                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleToggleFlag(item.logId)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                        item.flagged 
                          ? 'bg-rose-600 text-white border-rose-500' 
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {item.flagged ? 'Flagged Non-Compliant' : 'Flag Household'}
                    </button>
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
