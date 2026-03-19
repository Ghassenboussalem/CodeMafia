import React from 'react';
import useGameStore from '../store/gameStore';

export default function MenuScreen() {
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', zIndex: 10,
    }}>
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
          style={{
            background: '#2980b9', color: '#fff',
            boxShadow: '4px 4px 0 #1a5a8a', border: '3px solid #1a5a8a',
          }}
        >
          🌐 PUBLIC GAMES
        </button>
      </div>
      <div className="bottom-hint">3–5 Players • Find the Impostor</div>
    </div>
  );
}