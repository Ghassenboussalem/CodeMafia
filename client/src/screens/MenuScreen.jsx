import React, { useState, useEffect } from 'react';
import useGameStore from '../store/gameStore';
import { useAuth } from '../contexts/AuthContext';
import PixelCharacter, { DEFAULT_CHARACTER } from '../components/PixelCharacter';
import CharacterPicker from '../components/CharacterPicker';

const WALK_INTERVAL = 180;

export default function MenuScreen() {
  const setScreen    = useGameStore((s) => s.setScreen);
  const myCharacter  = useGameStore((s) => s.myCharacter);
  const { user, isLoggedIn, isPro } = useAuth();

  const [showPicker, setShowPicker] = useState(false);
  const [frame,      setFrame]      = useState(0);

  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % 4), WALK_INTERVAL);
    return () => clearInterval(t);
  }, []);

  const char = myCharacter || DEFAULT_CHARACTER;

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', zIndex: 10,
    }}>
      {/* Character picker modal */}
      {showPicker && <CharacterPicker onClose={() => setShowPicker(false)} />}

      {/* Top right — profile or login */}
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
        {isLoggedIn ? (
          <button
            onClick={() => setScreen('profile')}
            style={{
              padding: '8px 14px',
              fontFamily: "'Press Start 2P', monospace", fontSize: 8,
              background: '#f5e6c0', color: '#4a3a20',
              border: '2px solid #8b7355', boxShadow: '2px 2px 0 #5a4a30',
              cursor: 'pointer', letterSpacing: 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {isPro && <span style={{ color: '#f5a623' }}>★</span>}
            {user.username}
          </button>
        ) : (
          <>
            <button onClick={() => setScreen('login')} style={{
              padding: '8px 14px', fontFamily: "'Press Start 2P', monospace", fontSize: 8,
              background: '#f5e6c0', color: '#4a3a20',
              border: '2px solid #8b7355', boxShadow: '2px 2px 0 #5a4a30', cursor: 'pointer',
            }}>LOGIN</button>
            <button onClick={() => setScreen('register')} style={{
              padding: '8px 14px', fontFamily: "'Press Start 2P', monospace", fontSize: 8,
              background: '#f5a623', color: '#fff',
              border: '2px solid #8b5e00', boxShadow: '2px 2px 0 #8b5e00', cursor: 'pointer',
            }}>SIGN UP</button>
          </>
        )}
      </div>

      {/* ── Left panel — character ───────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        // On desktop: bottom-left. On mobile: hide it (CSS media handles this)
        left: 28, bottom: 80,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        // Hide below 600px — added via inline media won't work in React; we use className
      }} className="menu-character-panel">
        {/* Character preview on a little pixel "floor" */}
        <div style={{
          background: '#0d1117',
          border: '3px solid #2a3a4a',
          padding: '14px 18px 10px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          boxShadow: '4px 4px 0 #000',
        }}>
          <PixelCharacter
            suitColor={char.suitColor}
            visorColor={char.visorColor}
            hat={char.hat}
            size={8}
            animate
            frame={frame}
          />
          {/* pixel floor line */}
          <div style={{
            width: '100%', height: 3,
            background: 'repeating-linear-gradient(90deg,#3a4a5a 0,#3a4a5a 4px,transparent 4px,transparent 8px)',
          }} />
        </div>

        <button
          onClick={() => setShowPicker(true)}
          style={{
            padding: '7px 14px',
            fontFamily: "'Press Start 2P', monospace", fontSize: 7,
            background: '#2a2a4e', color: '#a0a0ff',
            border: '2px solid #4a4a8e', boxShadow: '3px 3px 0 #1a1a3e',
            cursor: 'pointer', letterSpacing: 1,
            whiteSpace: 'nowrap',
          }}
        >
          🎮 CUSTOMIZE
        </button>
      </div>

      {/* ── Title ───────────────────────────────────────────────────────── */}
      <div className="title-area">
        <span className="title-code">CODE</span>
        <span className="title-mafia">MAFIA</span>
        <div className="subtitle">Sabotage or Survive</div>
      </div>

      {/* ── Menu buttons ────────────────────────────────────────────────── */}
      <div className="menu-buttons">
        <button className="btn-big btn-big-create" onClick={() => setScreen('create')}>
          ⚔ CREATE GAME
        </button>
        <button className="btn-big btn-big-join" onClick={() => setScreen('join')}>
          🔑 JOIN GAME
        </button>
        <button className="btn-big" onClick={() => setScreen('browser')}
          style={{ background: '#2980b9', color: '#fff', boxShadow: '4px 4px 0 #1a5a8a', border: '3px solid #1a5a8a' }}>
          🌐 PUBLIC GAMES
        </button>
        <button className="btn-big" onClick={() => setScreen('leaderboard')}
          style={{ background: '#8e44ad', color: '#fff', boxShadow: '4px 4px 0 #5a2080', border: '3px solid #5a2080' }}>
          🏆 LEADERBOARD
        </button>
        <button className="btn-big" onClick={() => setScreen('help')}
          style={{ background: '#16a085', color: '#fff', boxShadow: '4px 4px 0 #0a6050', border: '3px solid #0a6050' }}>
          ❓ HOW TO PLAY
        </button>
      </div>

      <div className="bottom-hint">3–5 Players • Find the Impostor</div>
    </div>
  );
}