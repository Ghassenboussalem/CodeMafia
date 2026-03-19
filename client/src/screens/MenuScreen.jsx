import React from 'react';
import useGameStore from '../store/gameStore';
import { useAuth } from '../contexts/AuthContext';

export default function MenuScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const { user, isLoggedIn, isPro } = useAuth();

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', zIndex: 10,
    }}>
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
            <button
              onClick={() => setScreen('login')}
              style={{
                padding: '8px 14px',
                fontFamily: "'Press Start 2P', monospace", fontSize: 8,
                background: '#f5e6c0', color: '#4a3a20',
                border: '2px solid #8b7355', boxShadow: '2px 2px 0 #5a4a30',
                cursor: 'pointer',
              }}
            >
              LOGIN
            </button>
            <button
              onClick={() => setScreen('register')}
              style={{
                padding: '8px 14px',
                fontFamily: "'Press Start 2P', monospace", fontSize: 8,
                background: '#f5a623', color: '#fff',
                border: '2px solid #8b5e00', boxShadow: '2px 2px 0 #8b5e00',
                cursor: 'pointer',
              }}
            >
              SIGN UP
            </button>
          </>
        )}
      </div>

      <div className="title-area">
        <span className="title-code">CODE</span>
        <span className="title-mafia">MAFIA</span>
        <div className="subtitle">Sabotage or Survive</div>
      </div>

      <div className="menu-buttons">
        <button className="btn-big btn-big-create" onClick={() => setScreen('create')}>
          ⚔ CREATE GAME
        </button>
        <button className="btn-big btn-big-join" onClick={() => setScreen('join')}>
          🔑 JOIN GAME
        </button>
        <button
          className="btn-big"
          onClick={() => setScreen('browser')}
          style={{ background: '#2980b9', color: '#fff', boxShadow: '4px 4px 0 #1a5a8a', border: '3px solid #1a5a8a' }}
        >
          🌐 PUBLIC GAMES
        </button>
        <button
          className="btn-big"
          onClick={() => setScreen('leaderboard')}
          style={{ background: '#8e44ad', color: '#fff', boxShadow: '4px 4px 0 #5a2080', border: '3px solid #5a2080' }}
        >
          🏆 LEADERBOARD
        </button>
      </div>

      <div className="bottom-hint">3–5 Players • Find the Impostor</div>
    </div>
  );
}