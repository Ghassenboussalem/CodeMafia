import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useGameStore from '../store/gameStore';

export default function LoginScreen() {
  const { login, loginWithGoogle } = useAuth();
  const setScreen = useGameStore((s) => s.setScreen);

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      setScreen('menu');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', zIndex: 10,
      padding: '20px 16px', overflowY: 'auto',
    }}>

      {/* Back button — top left */}
      <button
        onClick={() => setScreen('menu')}
        className="back-corner"
      >
        ← BACK
      </button>

      <div className="title-area">
        <span className="title-code">CODE</span>
        <span className="title-mafia">MAFIA</span>
        <div className="subtitle">Sabotage or Survive</div>
      </div>

      <div className="dialog" style={{ width: 380 }}>
        <div style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 13,
          color: '#4a3a20', marginBottom: 20, letterSpacing: 1, textAlign: 'center',
        }}>
          SIGN IN
        </div>

        {error && (
          <div style={{
            background: '#fde8e8', border: '2px solid #c0392b',
            padding: '8px 12px', marginBottom: 14,
            fontFamily: "'VT323', monospace", fontSize: 17,
            color: '#c0392b', letterSpacing: 1,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Google button */}
        <button
          onClick={loginWithGoogle}
          style={{
            width: '100%', padding: '11px 0', marginBottom: 14,
            fontFamily: "'Press Start 2P', monospace", fontSize: 9,
            background: '#fff', color: '#4a3a20',
            border: '2px solid #8b7355', boxShadow: '3px 3px 0 #5a4a30',
            cursor: 'pointer', letterSpacing: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          <span style={{ fontSize: 16, fontFamily: 'sans-serif', fontWeight: 'bold', color: '#4285f4' }}>G</span>
          CONTINUE WITH GOOGLE
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 2, background: '#c4a840' }} />
          <span style={{ fontFamily: "'VT323', monospace", fontSize: 16, color: '#8b7355' }}>OR</span>
          <div style={{ flex: 1, height: 2, background: '#c4a840' }} />
        </div>

        <form onSubmit={handleLogin}>
          <div className="dialog-label">Email</div>
          <input
            className="dialog-input"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <div className="dialog-label">Password</div>
          <input
            className="dialog-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px 0', marginTop: 4,
              fontFamily: "'Press Start 2P', monospace", fontSize: 11,
              background: '#f5a623', color: '#fff',
              border: '3px solid #8b5e00', boxShadow: '4px 4px 0 #8b5e00',
              cursor: loading ? 'default' : 'pointer',
              letterSpacing: 1, opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '...' : 'LOGIN'}
          </button>
        </form>

        {/* Switch to register */}
        <div style={{
          textAlign: 'center', marginTop: 16,
          fontFamily: "'VT323', monospace", fontSize: 18, color: '#8b7355',
        }}>
          No account?{' '}
          <span
            style={{ color: '#f5a623', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => setScreen('register')}
          >
            Sign up here
          </span>
        </div>
      </div>
    </div>
  );
}