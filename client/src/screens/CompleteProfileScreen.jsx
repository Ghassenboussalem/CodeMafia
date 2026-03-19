import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useGameStore from '../store/gameStore';

const ROLES = [
  { value: 'player',    label: '🎮 Just playing for fun',  desc: 'Casual games with friends' },
  { value: 'student',   label: '📚 Student',                desc: 'Learning through gameplay' },
  { value: 'developer', label: '💻 Developer',              desc: 'Sharpen your coding skills' },
  { value: 'teacher',   label: '🏫 Teacher / Educator',     desc: 'Engage your students' },
];

export default function CompleteProfileScreen() {
  const { user, completeProfile } = useAuth();
  const setScreen = useGameStore((s) => s.setScreen);

  const [username, setUsername] = useState(user?.username || '');
  const [role,     setRole]     = useState('player');
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit() {
    setError(null);
    if (username.length < 3) { setError('Username must be at least 3 characters'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Letters, numbers and underscores only');
      return;
    }
    setLoading(true);
    try {
      await completeProfile({ username, role });
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
      overflowY: 'auto', padding: '20px 0',
    }}>
      <div className="title-area">
        <span className="title-code">CODE</span>
        <span className="title-mafia">MAFIA</span>
        <div className="subtitle">Sabotage or Survive</div>
      </div>

      <div className="dialog" style={{ width: 400 }}>

        {/* Google avatar if available */}
        {user?.avatar_url && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <img
              src={user.avatar_url}
              alt="avatar"
              style={{
                width: 56, height: 56, borderRadius: '50%',
                border: '3px solid #8b7355', boxShadow: '3px 3px 0 #5a4a30',
              }}
            />
          </div>
        )}

        <div style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 11,
          color: '#4a3a20', marginBottom: 6, letterSpacing: 1, textAlign: 'center',
        }}>
          ALMOST THERE!
        </div>
        <div style={{
          fontFamily: "'VT323', monospace", fontSize: 17,
          color: '#8b7355', marginBottom: 18, letterSpacing: 1, textAlign: 'center',
        }}>
          Set up your profile to continue
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

        {/* Username */}
        <div className="dialog-label">Choose your username</div>
        <input
          className="dialog-input"
          type="text"
          placeholder="CoolPlayer99"
          maxLength={20}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />

        {/* Role */}
        <div className="dialog-label" style={{ marginBottom: 10 }}>
          Who are you?
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {ROLES.map((r) => (
            <div
              key={r.value}
              onClick={() => setRole(r.value)}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                background: role === r.value ? '#fff8e0' : '#f0d898',
                border: role === r.value ? '2px solid #f5a623' : '2px solid #8b7355',
                boxShadow: role === r.value ? '3px 3px 0 #8b5e00' : '3px 3px 0 #5a4a30',
                transition: 'all 0.1s',
              }}
            >
              <div style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 9,
                color: '#4a3a20', letterSpacing: 1, marginBottom: 3,
              }}>
                {r.label}
              </div>
              <div style={{
                fontFamily: "'VT323', monospace", fontSize: 15,
                color: '#8b7355', letterSpacing: 1,
              }}>
                {r.desc}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
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
          {loading ? '...' : "LET'S GO! →"}
        </button>
      </div>
    </div>
  );
}