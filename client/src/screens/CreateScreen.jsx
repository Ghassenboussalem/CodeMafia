import React, { useState, useRef } from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';

export default function CreateScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const [name, setName] = useState('');
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef();

  function shake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 400);
    inputRef.current?.focus();
  }

  function handleCreate() {
    if (!name.trim()) return shake();
    socket.emit('create_room', { name: name.trim() });
  }

  return (
    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:10 }}>
      <div className="title-area">
        <span className="title-code">CODE</span>
        <span className="title-mafia">MAFIA</span>
        <div className="subtitle">Sabotage or Survive</div>
      </div>
      <div className="dialog">
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
        <div className="dialog-buttons">
          <button className="btn btn-back" onClick={() => setScreen('menu')}>BACK</button>
          <button className="btn btn-orange" onClick={handleCreate}>CREATE</button>
        </div>
      </div>
      <div className="bottom-hint">3–5 Players • Find the Impostor</div>
    </div>
  );
}
