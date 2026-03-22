import React, { useState, useEffect, useRef } from 'react';
import PixelCharacter, {
  SUIT_COLORS, VISOR_COLORS, HAT_OPTIONS, DEFAULT_CHARACTER,
} from './PixelCharacter';
import socket from '../socket';
import useGameStore from '../store/gameStore';

const WALK_INTERVAL = 180; // ms per frame

export default function CharacterPicker({ onClose }) {
  const myCharacter = useGameStore((s) => s.myCharacter);
  const setMyCharacter = useGameStore((s) => s.setMyCharacter);

  const [suit,  setSuit]  = useState(myCharacter?.suitColor  ?? DEFAULT_CHARACTER.suitColor);
  const [visor, setVisor] = useState(myCharacter?.visorColor ?? DEFAULT_CHARACTER.visorColor);
  const [hat,   setHat]   = useState(myCharacter?.hat        ?? DEFAULT_CHARACTER.hat);
  const [frame, setFrame] = useState(0);

  // Walking animation
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % 4), WALK_INTERVAL);
    return () => clearInterval(t);
  }, []);

  function handleConfirm() {
    const character = { suitColor: suit, visorColor: visor, hat };
    setMyCharacter(character);
    socket.emit('set_character', character);
    onClose?.();
  }

  const swatch = (hex, selected, onClick) => (
    <div
      key={hex}
      onClick={onClick}
      style={{
        width: 28, height: 28,
        background: hex,
        border: selected ? '3px solid #fff' : '2px solid #444',
        boxShadow: selected ? '0 0 0 1px #f5a623, inset 0 0 0 1px #000' : '2px 2px 0 #000',
        cursor: 'pointer',
        imageRendering: 'pixelated',
        transition: 'transform 0.08s',
        transform: selected ? 'scale(1.2)' : 'scale(1)',
      }}
    />
  );

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0a0a1acc',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200,
    }}>
      <div style={{
        background: '#1a1a2e',
        border: '4px solid #f5a623',
        boxShadow: '8px 8px 0 #000',
        padding: '28px 32px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 20, minWidth: 320,
      }}>
        {/* Title */}
        <div style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 11, color: '#f5a623', letterSpacing: 2,
        }}>
          PICK YOUR CHARACTER
        </div>

        {/* Preview — walking animation */}
        <div style={{
          background: '#0d1117',
          border: '2px solid #333',
          padding: '16px 24px',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          minHeight: 100,
        }}>
          <PixelCharacter
            suitColor={suit}
            visorColor={visor}
            hat={hat}
            size={8}
            animate
            frame={frame}
          />
        </div>

        {/* Suit color */}
        <div style={{ width: '100%' }}>
          <div style={{
            fontFamily: "'VT323', monospace", fontSize: 14,
            color: '#ccc', marginBottom: 8, letterSpacing: 1,
          }}>
            SUIT
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUIT_COLORS.map(({ id, hex }) =>
              swatch(hex, suit === hex, () => setSuit(hex))
            )}
          </div>
        </div>

        {/* Visor color */}
        <div style={{ width: '100%' }}>
          <div style={{
            fontFamily: "'VT323', monospace", fontSize: 14,
            color: '#ccc', marginBottom: 8, letterSpacing: 1,
          }}>
            VISOR
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {VISOR_COLORS.map(({ id, hex }) =>
              swatch(hex, visor === hex, () => setVisor(hex))
            )}
          </div>
        </div>

        {/* Hat */}
        <div style={{ width: '100%' }}>
          <div style={{
            fontFamily: "'VT323', monospace", fontSize: 14,
            color: '#ccc', marginBottom: 8, letterSpacing: 1,
          }}>
            ACCESSORY
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {HAT_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setHat(id)}
                style={{
                  background: hat === id ? '#f5a623' : '#2a2a3e',
                  border: `2px solid ${hat === id ? '#c07800' : '#444'}`,
                  boxShadow: hat === id ? '3px 3px 0 #8a5500' : '2px 2px 0 #000',
                  color: '#fff', fontSize: 18,
                  width: 42, height: 42,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.08s',
                  transform: hat === id ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px',
              fontFamily: "'Press Start 2P', monospace", fontSize: 8,
              background: '#2a2a3e', color: '#aaa',
              border: '2px solid #444', boxShadow: '3px 3px 0 #000',
              cursor: 'pointer', letterSpacing: 1,
            }}
          >
            CANCEL
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '10px 22px',
              fontFamily: "'Press Start 2P', monospace", fontSize: 8,
              background: '#5cb85c', color: '#fff',
              border: '3px solid #2e6e2e', boxShadow: '3px 3px 0 #1a4e1a',
              cursor: 'pointer', letterSpacing: 1,
            }}
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
}
