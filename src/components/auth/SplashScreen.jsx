import React, { useState, useEffect } from 'react';

/**
 * SplashScreen - Initial Application Launch Screen
 * Displays for 2.5 seconds with animated EcoLoop circular logo, pulse glow,
 * and slogan: "Connecting Informal Waste Systems to the Circular Economy".
 * Checks session persistence via GET /api/v1/auth/me (HTTP-Only cookies).
 */
export default function SplashScreen({ onFinish }) {
  const [sessionUser, setSessionUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;

    // 1. Check session in background
    fetch('/api/v1/auth/me', {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.data?.user) {
          setSessionUser(data.data.user);
        }
      })
      .catch((err) => {
        // No active session cookie or network error
        console.log('[EcoLoop Splash] No active session cookie detected:', err.message);
      })
      .finally(() => {
        if (isMounted) setCheckingAuth(false);
      });

    // 2. Smooth 2.5 second progress animation
    const startTime = Date.now();
    const duration = 2500;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(interval);
        // Transition to next screen
        setTimeout(() => {
          if (onFinish) {
            onFinish(sessionUser);
          }
        }, 150);
      }
    }, 50);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [onFinish, sessionUser]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background ambient circular gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Brand Container */}
      <div className="relative z-10 flex flex-col items-center max-w-md px-6 text-center">
        {/* Animated Circular EcoLoop Emblem */}
        <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
          {/* Rotating outer orbit ring */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-500/40 animate-[spin_8s_linear_infinite]" />
          
          {/* Glowing pulse ring */}
          <div className="absolute inset-2 rounded-full border border-cyan-400/50 bg-gradient-to-tr from-emerald-500/15 to-cyan-500/15 backdrop-blur-sm animate-ping opacity-30" />
          
          {/* Core icon container */}
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center shadow-2xl shadow-emerald-500/40 border border-emerald-400/40 transform hover:scale-105 transition-transform duration-300">
            <svg
              className="w-11 h-11 text-white animate-[spin_12s_linear_infinite]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
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

        {/* Brand Name */}
        <h1 className="font-['Outfit'] text-4xl md:text-5xl font-black tracking-tight mb-2">
          Eco<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">Loop</span>
        </h1>

        {/* National Waste Inclusion Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          CPCB EPR & Municipal Circular Economy Engine
        </div>

        {/* Core Slogan */}
        <p className="text-slate-300 text-sm md:text-base font-medium leading-relaxed max-w-sm mb-8">
          &ldquo;Connecting Informal Waste Systems to the Circular Economy&rdquo;
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-xs bg-slate-900 border border-white/10 rounded-full h-2 overflow-hidden p-0.5 shadow-inner mb-3">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-75 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between w-full max-w-xs text-[11px] text-slate-500 font-mono">
          <span>{checkingAuth ? 'Checking Session...' : sessionUser ? 'Session Verified' : 'Initializing...'}</span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="absolute bottom-6 text-[11px] text-slate-600 font-mono">
        Patiala Municipal Corporation Pilot · SWM Rules 2026 Compliant
      </div>
    </div>
  );
}
