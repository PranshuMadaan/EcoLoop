import React, { useState, useEffect } from 'react';
import SplashScreen from './components/auth/SplashScreen';
import AuthModal from './components/auth/AuthModal';
import MunicipalDashboard from './pages/MunicipalDashboard';
import CitizenDashboard from './pages/CitizenDashboard';

export default function App() {
  const [splashActive, setSplashActive] = useState(true);
  const [user, setUser] = useState(null);

  // Initial session persistence check on mount
  useEffect(() => {
    fetch('/api/v1/auth/me', {
      method: 'GET',
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && (data.user || data.data?.user)) {
          setUser(data.user || data.data?.user);
        }
      })
      .catch(err => {
        console.log('[App] Session check notice:', err.message);
      });
  }, []);

  // Complete logout handler with cookie and storage cleanup
  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore
    }

    // Clear client tokens & cookies
    try {
      localStorage.removeItem('ecoloop_auth_session');
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    } catch {
      // ignore
    }

    setUser(null);
  };

  // 1. Initial Launch: Splash Screen (Runs for 2.5 seconds with animated logo & slogan)
  if (splashActive) {
    return (
      <SplashScreen 
        onComplete={(verifiedSession) => {
          if (verifiedSession) {
            setUser(verifiedSession);
          }
          setSplashActive(false);
        }} 
      />
    );
  }

  // 2. Unauthenticated: Dual-Option Login / Register Screen
  if (!user) {
    return (
      <AuthModal 
        onLoginSuccess={(authenticatedUser) => setUser(authenticatedUser)} 
      />
    );
  }

  // 3. Authenticated: Dynamic Role-Specific Routing
  const isCitizen = user.role === 'CITIZEN_HOUSEHOLD' || user.isCitizen;

  if (isCitizen) {
    return (
      <CitizenDashboard 
        user={user} 
        onLogout={handleLogout} 
      />
    );
  }

  // Default to Municipal Command Shell (ULB, DWCC, Recycler, Waste Picker)
  return (
    <MunicipalDashboard 
      user={user} 
      onLogout={handleLogout} 
    />
  );
}