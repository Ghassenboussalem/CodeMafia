import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [xp,      setXp]      = useState(null);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('cm_token');
    if (token) {
      api.get('/auth/me')
        .then(({ user, xp, stats }) => {
          setUser(user);
          setXp(xp);
          setStats(stats);
        })
        .catch(() => {
          localStorage.removeItem('cm_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // Handle Google OAuth callback — token comes back in URL hash
    const hash = window.location.hash;
    if (hash.startsWith('#token=')) {
      const token = hash.slice(7);
      localStorage.setItem('cm_token', token);
      window.location.hash = '';
      api.get('/auth/me')
        .then(({ user, xp, stats }) => {
          setUser(user);
          setXp(xp);
          setStats(stats);
        })
        .catch(() => localStorage.removeItem('cm_token'))
        .finally(() => setLoading(false));
    }
  }, []);

  const register = useCallback(async ({ email, password, username, role }) => {
    const { user, token } = await api.post('/auth/register', { email, password, username, role });
    localStorage.setItem('cm_token', token);
    setUser(user);
    return user;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { user, token } = await api.post('/auth/login', { email, password });
    localStorage.setItem('cm_token', token);
    setUser(user);
    // Refresh full profile
    const { xp, stats } = await api.get('/auth/me');
    setXp(xp);
    setStats(stats);
    return user;
  }, []);

  const loginWithGoogle = useCallback(() => {
    window.location.href = `${import.meta.env.VITE_SERVER_URL}/auth/google`;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('cm_token');
    setUser(null);
    setXp(null);
    setStats(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const { user, xp, stats } = await api.get('/auth/me');
      setUser(user);
      setXp(xp);
      setStats(stats);
    } catch {}
  }, []);

  const upgradeToPro = useCallback(async () => {
    const { url } = await api.post('/stripe/create-checkout');
    window.location.href = url;
  }, []);

  const openBillingPortal = useCallback(async () => {
    const { url } = await api.post('/stripe/portal');
    window.location.href = url;
  }, []);

  return (
    <AuthContext.Provider value={{
      user, xp, stats, loading,
      register, login, loginWithGoogle, logout,
      refreshProfile, upgradeToPro, openBillingPortal,
      isLoggedIn: !!user,
      isPro: user?.tier === 'pro',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}