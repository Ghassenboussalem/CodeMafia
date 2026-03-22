import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [xp,      setXp]      = useState(null);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    try {
      const { user, xp, stats } = await api.get('/auth/me');
      setUser(user);
      setXp(xp);
      setStats(stats);
      return user;
    } catch {
      localStorage.removeItem('cm_token');
      return null;
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authToken = params.get('auth_token');
    const isNewUser = params.get('new_user') === '1';
    const authError = params.get('auth_error');

    if (authError) {
      window.history.replaceState({}, '', window.location.pathname);
      setLoading(false);
      return;
    }

    if (authToken) {
      localStorage.setItem('cm_token', authToken);
      window.history.replaceState({}, '', window.location.pathname);

      loadMe().then((user) => {
        if (user && isNewUser && !user.profile_complete) {
          window.__needsProfileSetup = true;
        }
        setLoading(false);
      });
      return;
    }

    const stored = localStorage.getItem('cm_token');
    if (stored) {
      loadMe().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async ({ email, password, username, role }) => {
    const { user, token } = await api.post('/auth/register', {
      email, password, username, role,
    });
    localStorage.setItem('cm_token', token);
    setUser(user);
    return user;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const { user, token } = await api.post('/auth/login', { email, password });
    localStorage.setItem('cm_token', token);
    setUser(user);
    const { xp, stats } = await api.get('/auth/me');
    setXp(xp);
    setStats(stats);
    return user;
  }, []);

  const loginWithGoogle = useCallback(() => {
    window.location.href = `${import.meta.env.VITE_SERVER_URL}/auth/google`;
  }, []);

  const completeProfile = useCallback(async ({ username, role }) => {
    const { user: updated } = await api.post('/auth/complete-profile', { username, role });
    setUser(updated);
    return updated;
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

  const dismissTutorial = useCallback(async () => {
    try {
      await api.post('/auth/dismiss-tutorial');
      setUser((prev) => prev ? { ...prev, show_tutorial: false } : prev);
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{
      user, xp, stats, loading,
      register, login, loginWithGoogle,
      completeProfile, logout,
      refreshProfile, upgradeToPro, openBillingPortal,
      dismissTutorial,
      isLoggedIn: !!user,
      isPro: user?.tier === 'pro',
      needsProfileSetup: user && user.profile_complete === false,
      shouldShowTutorial: user && user.show_tutorial === true,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}