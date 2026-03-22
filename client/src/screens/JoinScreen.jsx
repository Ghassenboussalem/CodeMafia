import React, { useState, useRef } from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';
import { useAuth } from '../contexts/AuthContext';

export default function JoinScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const { user }  = useAuth();

  const [name,       setName]       = useState('');
  const [code,       setCode]       = useState('');
  const [shakeField, setShakeField] = useState(null);
  const nameRef = useRef();
  const codeRef = useRef();

  function shake(field) {
    setShakeField(field);
    setTimeout(() => setShakeField(null), 400);
    (field === 'name' ? nameRef : codeRef).current?.focus();
  }

  function handleJoin() {
    const playerName = user ? user.username : name.trim();
    if (!playerName) return shake('name');
    if (code.trim().length < 4) return shake('code');
    socket.emit('join_room', {
      name: playerName,
      code: code.trim().toUpperCase(),
    });
  }

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

      <div className="dialog">
        {user ? (
          <div style={{
            background: '#f0d898', border: '2px solid #8b7355',
            padding: '10px 12px', marginBottom: 14,
            fontFamily: "'VT323', monospace", fontSize: 20,
            color: '#4a3a20', letterSpacing: 1,
          }}>
            Playing as: <span style={{ color: '#f5a623' }}>{user.username}</span>
          </div>
        ) : (
          <>
            <div className="dialog-label">Your name</div>
            <input
              ref={nameRef}
              className={`dialog-input${shakeField === 'name' ? ' shake' : ''}`}
              type="text"
              placeholder="Player name..."
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              style={{ marginBottom: 10 }}
            />
          </>
        )}

        <div className="dialog-label">Lobby Code</div>
        <input
          ref={codeRef}
          className={`dialog-input${shakeField === 'code' ? ' shake' : ''}`}
          type="text"
          placeholder="e.g. J3BI5F..."
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          style={{ textTransform: 'uppercase' }}
          autoFocus={!!user}
        />
        <div className="dialog-buttons">
          <button className="btn btn-back" onClick={() => setScreen('menu')}>BACK</button>
          <button className="btn btn-green" onClick={handleJoin}>JOIN</button>
        </div>
      </div>
      <div className="bottom-hint">3–5 Players • Find the Impostor</div>
    </div>
  );
}