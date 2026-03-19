import React, { useState, useEffect } from 'react';
import useGameStore from '../store/gameStore';

export default function KickedScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const resetGame = useGameStore((s) => s.resetGame);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setShow(true), 50);
  }, []);

  function goToMenu() {
    resetGame();
    setScreen('menu');
  }

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(180deg, #0a0008 0%, #1a0010 50%, #0a0005 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 100, gap: 24,
      opacity: show ? 1 : 0,
      transition: 'opacity 0.4s ease-in',
    }}>

      {/* Boot icon */}
      <div style={{
        fontSize: 72,
        animation: 'kickBounce 0.6s cubic-bezier(0.36,0.07,0.19,0.97) 0.2s both',
      }}>
        👢
      </div>

      {/* Title */}
      <div style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 22, color: '#c0392b',
        textShadow: '0 0 20px #ff000088, 4px 4px 0 #7a0000',
        letterSpacing: 3, textAlign: 'center', lineHeight: 1.5,
        animation: 'fadeSlideUp 0.5s ease-out 0.4s both',
      }}>
        YOU WERE<br />KICKED
      </div>

      {/* Divider line */}
      <div style={{
        width: 200, height: 3,
        background: 'linear-gradient(90deg, transparent, #c0392b, transparent)',
        animation: 'fadeSlideUp 0.5s ease-out 0.5s both',
      }} />

      {/* Message box */}
      <div style={{
        background: '#f5e6c0',
        border: '4px solid #8b7355',
        boxShadow: '6px 6px 0 #5a4a30, inset 2px 2px 0 #fffbe8',
        padding: '20px 32px', textAlign: 'center',
        animation: 'fadeSlideUp 0.5s ease-out 0.6s both',
      }}>
        <div style={{
          fontFamily: "'VT323', monospace",
          fontSize: 22, color: '#4a3a20',
          letterSpacing: 1, lineHeight: 1.6,
        }}>
          The host removed you<br />from the lobby.
        </div>
        <div style={{
          fontFamily: "'VT323', monospace",
          fontSize: 17, color: '#8b7355',
          marginTop: 8, letterSpacing: 1,
        }}>
          You can create your own game<br />or join a different lobby.
        </div>
      </div>

      {/* Button */}
      <button
        onClick={goToMenu}
        style={{
          padding: '16px 36px',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 12, color: '#fff',
          background: '#f5a623',
          border: '3px solid #8b5e00',
          boxShadow: '4px 4px 0 #8b5e00',
          cursor: 'pointer', letterSpacing: 1,
          transition: 'transform .05s, box-shadow .05s',
          animation: 'fadeSlideUp 0.5s ease-out 0.8s both',
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translate(2px,2px)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = '';
          e.currentTarget.style.boxShadow = '4px 4px 0 #8b5e00';
        }}
      >
        BACK TO MENU
      </button>

      <style>{`
        @keyframes kickBounce {
          0%   { transform: translateY(-60px) rotate(-20deg); opacity: 0; }
          50%  { transform: translateY(10px) rotate(10deg); opacity: 1; }
          70%  { transform: translateY(-8px) rotate(-5deg); }
          100% { transform: translateY(0) rotate(0deg); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}