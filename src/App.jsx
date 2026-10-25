import React, { useState, useEffect } from 'react';
import SplashScreen from './components/auth/SplashScreen.jsx';
import AuthModal from './components/auth/AuthModal.jsx';
import MunicipalDashboard from './pages/MunicipalDashboard.jsx';
import CitizenDashboard from './pages/CitizenDashboard.jsx';

/**
 * EcoLoop Master Application Entrypoint
 * Workflow Lifecycle:
 * 1. App Launch: SplashScreen (2.5s timer, animated circular logo, slogan)
 * 2. Auth Checking: GET /api/v1/auth/me (HTTP-Only Cookie persistence with credentials: 'include')
 * 3. Unauthenticated: AuthModal (Dual-Option: Municipal/Enterprise vs. Citizen Household)
 * 4. Authenticated:
 *    - Citizen -> CitizenDashboard (Live Waste Truck Tracker + Green Token & Voucher Redemption)
 *    - Municipal/Enterprise -> MunicipalDashboard (Global Municipal Nav: Route Optimizer, B2B, Ledger, Segregation)
 */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check HTTP-Only cookie session on initial mount
    fetch('/api/v1/auth/me', {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.user) {
          setUser(data.data.user);
        } else if (data.success && data.user) {
          setUser(data.user);
        }
      })
      .catch((err) => {
        console.log('[EcoLoop Session] Unauthenticated initial state:', err.message);
      })
      .finally(() => {
        // Handled by SplashScreen onFinish or completes loading
      });
  }, []);

  // 1. Initial Launch: Splash Screen
  if (loading) {
    return (
      <SplashScreen
        onFinish={(checkedUser) => {
          if (checkedUser) {
            setUser(checkedUser);
          }
          setLoading(false);
        }}
      />
    );
  }

  // 2. Unauthenticated: Dual-Option Login / Register Modal
  if (!user) {
    return (
      <AuthModal
        onLoginSuccess={(userData) => {
          setUser(userData);
        }}
      />
    );
  }

  // 3. Dynamic Role-Based Routing
  const isCitizen =
    user.role === 'CITIZEN' ||
    user.role === 'CITIZEN_HOUSEHOLD' ||
    user.role === 'Citizen';

  return (
    <div className="min-h-screen bg-slate-950 text-white font-['Plus_Jakarta_Sans',sans-serif]">
      {isCitizen ? (
        <CitizenDashboard user={user} onLogout={() => setUser(null)} />
      ) : (
        <MunicipalDashboard user={user} onLogout={() => setUser(null)} />
      )}
    </div>
  );
}
