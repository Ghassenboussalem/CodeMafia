import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useGameStore from '../store/gameStore';

const ROLES = [
  { value: 'player',    label: '🎮 Just playing for fun',  desc: 'Casual games with friends' },
  { value: 'student',   label: '📚 Student',                desc: 'Learning through gameplay' },
  { value: 'developer', label: '💻 Developer',              desc: 'Sharpen your coding skills' },
  { value: 'teacher',   label: '🏫 Teacher / Educator',     desc: 'Engage your students' },
];

export default function RegisterScreen() {
  const { register, loginWithGoogle } = useAuth();
  const setScreen = useGameStore((s) => s.setScreen);

  const [step,     setStep]     = useState(1);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role,     setRole]     = useState('player');
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  function handleStep1(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (username.length < 3)  { setError('Username must be at least 3 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username: letters, numbers and underscores only');
      return;
    }
    setStep(2);
  }

  async function handleStep2() {
    setError(null);
    setLoading(true);
    try {
      await register({ email, password, username, role });
      setScreen('menu');
    } catch (err) {
      setError(err.message);
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', zIndex: 10,
      overflowY: 'auto', padding: '20px 16px',
    }}>

      {/* Back button — top left */}
      <button
        onClick={() => step === 2 ? setStep(1) : setScreen('menu')}
        className="back-corner"
      >
        ← {step === 2 ? 'BACK' : 'MENU'}
      </button>

      <div className="title-area">
        <span className="title-code">CODE</span>
        <span className="title-mafia">MAFIA</span>
        <div className="subtitle">Sabotage or Survive</div>
      </div>

      <div className="dialog" style={{ width: 400 }}>

        {/* Step dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {[1, 2].map((s) => (
            <div key={s} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: step >= s ? '#f5a623' : '#c4a840',
              border: '2px solid #8b5e00',
            }} />
          ))}
        </div>

        <div style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 11,
          color: '#4a3a20', marginBottom: 18, letterSpacing: 1, textAlign: 'center',
        }}>
          {step === 1 ? 'CREATE ACCOUNT' : 'WHO ARE YOU?'}
        </div>

        {error && (
          <div style={{
            background: '#fde8e8', border: '2px solid #c0392b',
            padding: '8px 12px', marginBottom: 14,
            fontFamily: "'VT323', monospace", fontSize: 17, color: '#c0392b',
          }}>
            ⚠ {error}
          </div>
        )}

        {step === 1 && (
          <>
            {/* Google signup */}
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
              <span style={{
                fontSize: 16, fontFamily: 'sans-serif',
                fontWeight: 'bold', color: '#4285f4',
              }}>G</span>
              SIGN UP WITH GOOGLE
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 2, background: '#c4a840' }} />
              <span style={{ fontFamily: "'VT323', monospace", fontSize: 16, color: '#8b7355' }}>OR</span>
              <div style={{ flex: 1, height: 2, background: '#c4a840' }} />
            </div>

            <form onSubmit={handleStep1}>
              <div className="dialog-label">Username</div>
              <input
                className="dialog-input"
                type="text" placeholder="YourName123" maxLength={20}
                value={username} onChange={(e) => setUsername(e.target.value)}
                required autoFocus
              />
              <div className="dialog-label">Email</div>
              <input
                className="dialog-input"
                type="email" placeholder="your@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="dialog-label">Password</div>
              <input
                className="dialog-input"
                type="password" placeholder="Min 8 characters"
                value={password} onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="submit"
                style={{
                  width: '100%', padding: '13px 0', marginTop: 4,
                  fontFamily: "'Press Start 2P', monospace", fontSize: 11,
                  background: '#f5a623', color: '#fff',
                  border: '3px solid #8b5e00', boxShadow: '4px 4px 0 #8b5e00',
                  cursor: 'pointer', letterSpacing: 1,
                }}
              >
                NEXT →
              </button>
            </form>

            {/* Switch to login */}
            <div style={{
              textAlign: 'center', marginTop: 16,
              fontFamily: "'VT323', monospace", fontSize: 18, color: '#8b7355',
            }}>
              Already have an account?{' '}
              <span
                style={{ color: '#f5a623', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => setScreen('login')}
              >
                Login here
              </span>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div style={{
              fontFamily: "'VT323', monospace", fontSize: 17,
              color: '#8b7355', marginBottom: 14, letterSpacing: 1, textAlign: 'center',
            }}>
              This helps us tailor your experience
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              {ROLES.map((r) => (
                <div
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  style={{
                    padding: '12px 14px', cursor: 'pointer',
                    background: role === r.value ? '#fff8e0' : '#f0d898',
                    border: role === r.value ? '2px solid #f5a623' : '2px solid #8b7355',
                    boxShadow: role === r.value ? '3px 3px 0 #8b5e00' : '3px 3px 0 #5a4a30',
                    transition: 'all 0.1s',
                  }}
                >
                  <div style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 9, color: '#4a3a20', letterSpacing: 1, marginBottom: 4,
                  }}>
                    {r.label}
                  </div>
                  <div style={{
                    fontFamily: "'VT323', monospace",
                    fontSize: 15, color: '#8b7355', letterSpacing: 1,
                  }}>
                    {r.desc}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleStep2}
              disabled={loading}
              style={{
                width: '100%', padding: '14px 0',
                fontFamily: "'Press Start 2P', monospace", fontSize: 11,
                background: '#27ae60', color: '#fff',
                border: '3px solid #1a6e1a', boxShadow: '4px 4px 0 #1a6e1a',
                cursor: loading ? 'default' : 'pointer',
                letterSpacing: 1, opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? '...' : 'JOIN!'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}