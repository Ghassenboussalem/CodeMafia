import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';
import PixelCharacter, { DEFAULT_CHARACTER } from '../components/PixelCharacter';
import CharacterPicker from '../components/CharacterPicker';

const WALK_INTERVAL = 200;

function CountdownOverlay({ count, onCancel }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#0a1a0aee',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', zIndex: 50, gap: 20,
    }}>
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: '#7ecba0', letterSpacing: 2 }}>
        ALL PLAYERS READY!
      </div>
      <div style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: 80,
        color: '#f5a623', textShadow: '4px 4px 0 #8b5e00',
        animation: 'bounce 0.4s ease-out',
      }}>
        {count}
      </div>
      <div style={{ fontFamily: "'VT323', monospace", fontSize: 18, color: '#aaa', letterSpacing: 2 }}>
        Game starting soon...
      </div>
      <button
        onClick={onCancel}
        style={{
          marginTop: 8, padding: '10px 24px',
          fontFamily: "'Press Start 2P', monospace", fontSize: 10,
          background: '#a89878', color: '#f5e6c0',
          border: '2px solid #5a4a30', boxShadow: '3px 3px 0 #5a4a30',
          cursor: 'pointer', letterSpacing: 1,
        }}
      >
        NOT READY
      </button>
      <style>{`@keyframes bounce{0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.2)}100%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

export default function LobbyScreen() {
  const room      = useGameStore((s) => s.room);
  const myId      = useGameStore((s) => s.myId);
  const setScreen = useGameStore((s) => s.setScreen);
  const resetGame = useGameStore((s) => s.resetGame);

  const [copied,     setCopied]     = useState(false);
  const [ready,      setReady]      = useState(false);
  const [countdown,  setCountdown]  = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [frame,      setFrame]      = useState(0);

  const realPlayers = room?.players?.filter((p) => !p.isBot) || [];
  const canReady = realPlayers.length >= 1;
  const isHost   = room?.hostId === myId;

  // Walking animation
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % 4), WALK_INTERVAL);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    socket.on('countdown_start',    ({ count })       => setCountdown(count));
    socket.on('countdown_tick',     ({ count })       => setCountdown(count));
    socket.on('countdown_cancelled', ({ room: r })   => {
      setCountdown(null); setReady(false);
      useGameStore.getState().setRoom(r);
    });
    return () => {
      socket.off('countdown_start');
      socket.off('countdown_tick');
      socket.off('countdown_cancelled');
    };
  }, []);

  function copyCode() {
    navigator.clipboard.writeText(room.code).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1200);
  }
  function handleReady()       { if (!canReady || ready) return; setReady(true); socket.emit('player_ready'); }
  function handleCancelReady() { setReady(false); setCountdown(null); socket.emit('cancel_ready'); }
  function handleLeave()       { socket.emit('leave_room'); resetGame(); setScreen('menu'); }
  function handleKick(id)      { socket.emit('kick_player', { targetId: id }); }

  if (!room) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', zIndex: 10,
    }}>
      {countdown !== null && <CountdownOverlay count={countdown} onCancel={handleCancelReady} />}
      {showPicker && <CharacterPicker onClose={() => setShowPicker(false)} />}

      <button className="back-corner" onClick={handleLeave}>← BACK</button>
      <div className="lobby-title">LOBBY</div>

      {/* Room code */}
      <div className="lobby-code-box">
        <span className="lobby-code-label">Lobby Code:</span>
        <span className="lobby-code-value">{room.code}</span>
        <button className="btn-copy" onClick={copyCode}>{copied ? '✓' : '⧉'}</button>
      </div>

      {/* Players */}
      <div className="players-box">
        <div className="players-header">
          <span>👤</span>
          <span>Players ({room.players.length}/5)</span>
        </div>

        {room.players.map((p) => {
          const char = p.character || DEFAULT_CHARACTER;
          const isBot = p.isBot;
          return (
            <div className="player-row" key={p.id}
              style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                {isBot ? (
                  <span style={{ fontSize: 22 }}>🤖</span>
                ) : (
                  <PixelCharacter
                    suitColor={char.suitColor} visorColor={char.visorColor}
                    hat={char.hat} size={4} animate frame={frame}
                  />
                )}
                <span className="player-name" style={{ color: p.color }}>
                  {p.name}
                  {isBot && <span style={{ color: '#7aaa7a', fontSize: 10 }}> (AI)</span>}
                  {p.id === myId && <span style={{ color: '#8b7355' }}> (You)</span>}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="player-badge">
                  {p.id === room.hostId
                    ? <span style={{ color: '#f5a623' }}>★</span>
                    : p.ready ? <span style={{ color: '#27ae60' }}>✓</span> : null}
                </span>
                {isHost && p.id !== myId && !isBot && (
                  <button onClick={() => handleKick(p.id)} title={`Kick ${p.name}`}
                    style={{
                      background: '#c0392b', color: '#fff',
                      border: '2px solid #7a0000', boxShadow: '2px 2px 0 #7a0000',
                      fontFamily: "'Press Start 2P', monospace", fontSize: 8,
                      padding: '4px 8px', cursor: 'pointer', letterSpacing: 1,
                    }}>
                    KICK
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {realPlayers.length < 3 && (
          <div className="waiting-text" style={{ color: '#7aaa7a' }}>
            🤖 AI bots will fill empty slots
          </div>
        )}
      </div>

      {/* Customize character */}
      <button
        onClick={() => setShowPicker(true)}
        style={{
          marginTop: 8, padding: '8px 18px',
          fontFamily: "'Press Start 2P', monospace", fontSize: 8,
          background: '#2a2a4e', color: '#a0a0ff',
          border: '2px solid #4a4a8e', boxShadow: '3px 3px 0 #1a1a3e',
          cursor: 'pointer', letterSpacing: 1,
        }}
      >
        🎮 CUSTOMIZE CHARACTER
      </button>

      <button
        className="btn-solo" onClick={handleReady}
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

      {!canReady && <div className="bottom-hint">Need at least 1 player to start</div>}
    </div>
  );
}