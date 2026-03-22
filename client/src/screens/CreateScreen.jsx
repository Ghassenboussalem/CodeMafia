import React, { useState, useRef } from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';
import { useAuth } from '../contexts/AuthContext';
const TOGGLE = ({ label, value, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
    <span style={{ fontFamily: "'VT323', monospace", fontSize: 18, color: '#4a3a20', letterSpacing: 1 }}>
      {label}
    </span>
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 52, height: 26, borderRadius: 13, border: '2px solid #8b7355',
        background: value ? '#27ae60' : '#a89878',
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: value ? 26 : 2,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s', boxShadow: '1px 1px 2px #0004',
      }} />
    </button>
  </div>
);

const PICKER = ({ label, value, options, onChange }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontFamily: "'VT323', monospace", fontSize: 18, color: '#4a3a20', letterSpacing: 1, marginBottom: 6 }}>
      {label}
    </div>
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1, padding: '7px 4px',
            fontFamily: "'VT323', monospace", fontSize: 18,
            background: value === opt.value ? '#f5a623' : '#f0d898',
            color: value === opt.value ? '#fff' : '#4a3a20',
            border: value === opt.value ? '2px solid #8b5e00' : '2px solid #8b7355',
            boxShadow: value === opt.value ? '2px 2px 0 #8b5e00' : '2px 2px 0 #5a4a30',
            cursor: 'pointer', letterSpacing: 1,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

export default function CreateScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [shaking, setShaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    isPublic: false,
    roundDuration: 60,
    maxRounds: 4,
    impostorCount: 1,
    chatEnabled: true,
    spectatorAllowed: true,
  });
  const inputRef = useRef();

  function shake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 400);
    inputRef.current?.focus();
  }

  function setSetting(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleCreate() {
    const playerName = user ? user.username : name.trim();
    if (!playerName) return shake();
    socket.emit('create_room', { name: playerName, settings });
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

        {/* Conditional: name input for guests, username display for logged-in users */}
        {!user ? (
          <>
            <div className="dialog-label">Enter your name!</div>
            <input
              ref={inputRef}
              className={`dialog-input${shaking ? ' shake' : ''}`}
              type="text"
              placeholder="Player name..."
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </>
        ) : (
          <div style={{
            background: '#f0d898',
            border: '2px solid #8b7355',
            padding: '10px 12px',
            marginBottom: 16,
            fontFamily: "'VT323', monospace",
            fontSize: 20,
            color: '#4a3a20',
            letterSpacing: 1,
          }}>
            Playing as: <span style={{ color: '#f5a623' }}>{user.username}</span>
          </div>
        )}

        {/* Settings toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            width: '100%', padding: '8px', marginBottom: 12,
            fontFamily: "'Press Start 2P', monospace", fontSize: 9,
            background: '#f0d898', color: '#4a3a20',
            border: '2px solid #8b7355', boxShadow: '2px 2px 0 #5a4a30',
            cursor: 'pointer', letterSpacing: 1, textAlign: 'left',
          }}
        >
          {showSettings ? '▼' : '▶'} GAME SETTINGS
        </button>

        {showSettings && (
          <div style={{
            background: '#fffbe8', border: '2px solid #c4a840',
            padding: '12px 14px', marginBottom: 14,
          }}>
            <TOGGLE
              label="Public Room"
              value={settings.isPublic}
              onChange={(v) => setSetting('isPublic', v)}
            />
            <TOGGLE
              label="Allow Spectators"
              value={settings.spectatorAllowed}
              onChange={(v) => setSetting('spectatorAllowed', v)}
            />
            <TOGGLE
              label="Chat During Rounds"
              value={settings.chatEnabled}
              onChange={(v) => setSetting('chatEnabled', v)}
            />
            <PICKER
              label="Round Duration"
              value={settings.roundDuration}
              options={[{ label: '30s', value: 30 }, { label: '60s', value: 60 }, { label: '90s', value: 90 }]}
              onChange={(v) => setSetting('roundDuration', v)}
            />
            <PICKER
              label="Number of Rounds"
              value={settings.maxRounds}
              options={[{ label: '2', value: 2 }, { label: '4', value: 4 }, { label: '6', value: 6 }]}
              onChange={(v) => setSetting('maxRounds', v)}
            />
            <PICKER
              label="Impostors"
              value={settings.impostorCount}
              options={[{ label: '1', value: 1 }, { label: '2', value: 2 }]}
              onChange={(v) => setSetting('impostorCount', v)}
            />
          </div>
        )}

        <div className="dialog-buttons">
          <button className="btn btn-back" onClick={() => setScreen('menu')}>BACK</button>
          <button className="btn btn-orange" onClick={handleCreate}>CREATE</button>
        </div>
      </div>
      <div className="bottom-hint">3–5 Players • Find the Impostor</div>
    </div>
  );
}