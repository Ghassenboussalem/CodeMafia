import React, { useState } from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';

export default function LobbyScreen() {
  const room   = useGameStore((s) => s.room);
  const myId   = useGameStore((s) => s.myId);
  const setScreen = useGameStore((s) => s.setScreen);
  const resetGame = useGameStore((s) => s.resetGame);
  const [copied, setCopied]   = useState(false);
  const [ready, setReady]     = useState(false);

  if (!room) return null;

  const me = room.players.find((p) => p.id === myId);
  const canReady = room.players.length >= 3;

  function copyCode() {
    navigator.clipboard.writeText(room.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  function handleReady() {
    if (!canReady) return;
    setReady(true);
    socket.emit('player_ready');
  }

  function handleLeave() {
    socket.emit('leave_room');
    resetGame();
    setScreen('menu');
  }

  return (
    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:10 }}>
      <button className="back-corner" onClick={handleLeave}>← BACK</button>

      <div className="lobby-title">LOBBY</div>

      {/* Code box */}
      <div className="lobby-code-box">
        <span className="lobby-code-label">Lobby Code:</span>
        <span className="lobby-code-value">{room.code}</span>
        <button className="btn-copy" onClick={copyCode}>{copied ? '✓' : '⧉'}</button>
      </div>

      {/* Players list */}
      <div className="players-box">
        <div className="players-header">
          <span>👤</span>
          <span>Players ({room.players.length}/5)</span>
        </div>
        {room.players.map((p) => (
          <div className="player-row" key={p.id}>
            <div className="player-color" style={{ background: p.color }} />
            <span className="player-name" style={{ color: p.color }}>
              {p.name}
              {p.id === myId && <span style={{ color: '#8b7355' }}> (You)</span>}
            </span>
            <span className="player-badge">
              {p.id === room.hostId
                ? <span style={{ color: '#f5a623' }}>★</span>
                : p.ready
                  ? <span style={{ color: '#27ae60' }}>✓</span>
                  : null}
            </span>
          </div>
        ))}
        {!canReady && (
          <div className="waiting-text">Waiting for more players...</div>
        )}
      </div>

      <button
        className="btn-solo"
        onClick={handleReady}
        disabled={!canReady || ready}
        style={{
          background: ready ? '#3a9e3a' : canReady ? '#5cb85c' : '#7aaa7a',
          color: '#fff',
          boxShadow: ready ? '4px 4px 0 #1a5e1a' : '4px 4px 0 #2e6e2e',
          border: ready ? '3px solid #1a5e1a' : '3px solid #2e6e2e',
          cursor: canReady && !ready ? 'pointer' : 'default',
        }}
      >
        {ready ? '✓ READY!' : 'READY!'}
      </button>

      {!canReady && (
        <div className="bottom-hint">Need at least 3 players to start</div>
      )}
    </div>
  );
}
