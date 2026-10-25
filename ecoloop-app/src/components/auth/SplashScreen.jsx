import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Activity } from 'lucide-react';

export default function SplashScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing EcoLoop Cryptographic Node...');

  useEffect(() => {
    let sessionUser = null;
    let checkDone = false;

    // Check session persistence via API with cookie and local storage fallback
    const checkSession = async () => {
      try {
        const res = await fetch('/api/v1/auth/me', {
          method: 'GET',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && (data.user || data.data?.user)) {
            sessionUser = data.user || data.data?.user;
          }
        }
      } catch (err) {
        console.log('[SplashScreen] API check fallback:', err.message);
      }

      // Check fallback cached session
      if (!sessionUser) {
        try {
          const cached = localStorage.getItem('ecoloop_auth_session');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.user_id) {
              sessionUser = parsed;
            }
          }
        } catch {
          // ignore
        }
      }
      checkDone = true;
    };

    checkSession();

    // 2.5 seconds progress animation
    const startTime = Date.now();
    const duration = 2500;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct < 35) {
        setStatusText('Verifying cryptographic ledger & CPCB tokens...');
      } else if (pct < 70) {
        setStatusText('Checking municipal role credentials...');
      } else if (pct < 95) {
        setStatusText('Mounting live geospatial telemetry...');
      } else {
        setStatusText('Connection secure. Launching dashboard...');
      }

      if (elapsed >= duration) {
        clearInterval(interval);
        // Complete splash and pass discovered user session
        setTimeout(() => {
          onComplete(sessionUser);
        }, 150);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070b12] text-white px-4 select-none overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none -translate-y-12"></div>
      <div className="absolute w-[450px] h-[450px] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none translate-y-36"></div>

      <div className="relative z-10 flex flex-col items-center max-w-lg text-center">
        {/* Animated Recycling Icon / Logo */}
        <div className="relative mb-8 flex items-center justify-center">
          {/* Outer rotating pulse ring */}
          <div className="absolute w-36 h-36 rounded-full border-2 border-dashed border-emerald-400/30 animate-[spin_10s_linear_infinite]"></div>
          <div className="absolute w-28 h-28 rounded-full border border-cyan-400/40 animate-ping opacity-30"></div>
          
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[2px] shadow-[0_0_50px_rgba(16,185,129,0.35)]">
            <div className="w-full h-full bg-[#0a0e17] rounded-[22px] flex items-center justify-center">
              <svg 
                className="w-12 h-12 text-emerald-400 animate-[spin_6s_ease-in-out_infinite]"
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5" />
                <path d="M11 19h8.2a1.8 1.8 0 0 0 1.7-1.1c.3-.8 0-1.8-.7-2.3L16 11" />
                <path d="m14 13-3-3 3-3" />
                <path d="M12 5V3" />
                <path d="m9 7.5 2-2 2 2" />
              </svg>
            </div>
          </div>
        </div>

        {/* Brand Name & Slogan */}
        <div className="space-y-2 mb-8">
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl sm:text-5xl font-black tracking-tight font-['Outfit']">
              Eco<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">Loop</span>
            </span>
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-400 rounded-md border border-emerald-500/30">
              v2.0
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-medium text-slate-300 tracking-wide font-['Plus_Jakarta_Sans']">
            Connecting Informal Waste Systems to the Circular Economy
          </h2>

          <p className="text-xs text-slate-500 font-mono flex items-center justify-center gap-1.5 pt-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Team EcoMirai • SBM 2.0 & Mitsui Circular Track</span>
          </p>
        </div>

        {/* Progress Bar & Telemetry Status */}
        <div className="w-full max-w-xs space-y-2.5">
          <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-75 shadow-[0_0_12px_rgba(52,211,153,0.7)]"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
            <span className="truncate max-w-[220px] text-left text-slate-300 flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              {statusText}
            </span>
            <span className="font-bold text-emerald-400">{progress}%</span>
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="mt-12 flex items-center gap-2 text-[11px] font-mono text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>HTTP-Only Encrypted Sessions • NPCI UPI & CPCB EPR Enabled</span>
        </div>
      </div>
    </div>
  );
}
