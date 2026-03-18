// client/src/screens/SpectatorScreen.jsx

import React, { useRef, useEffect } from 'react';
import useGameStore from '../store/gameStore';

export default function SpectatorScreen() {
  const codeLines    = useGameStore((s) => s.codeLines);
  const chatLog      = useGameStore((s) => s.chatLog);
  const currentRound = useGameStore((s) => s.currentRound);
  const category     = useGameStore((s) => s.chosenCategory);
  const aliveCount   = useGameStore((s) => s.aliveCount);
  const room         = useGameStore((s) => s.room);
  const screen       = useGameStore((s) => s.screen);
  const chatBottomRef = useRef();

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  // When game_over arrives, useSocket redirects to game_over screen automatically
  // so this screen just needs to show spectator state while game is active

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#0a1a0a',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: '#1a0a0a', borderBottom: '3px solid #7a0000',
        padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 16, height: 48, flexShrink: 0,
      }}>
        <div style={{
          background: '#7a0000', color: '#fff',
          fontFamily: "'Press Start 2P', monospace", fontSize: 9,
          padding: '6px 12px', border: '2px solid #c0392b', letterSpacing: 1,
        }}>
          👻 ELIMINATED
        </div>
        <div style={{ fontFamily: "'VT323', monospace", fontSize: 18, color: '#c8a870', flex: 1, letterSpacing: 1 }}>
          Round {currentRound}/4 — {category}
        </div>
        <div style={{ fontFamily: "'VT323', monospace", fontSize: 16, color: '#888' }}>
          👤 {aliveCount} alive
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Player list */}
        <div style={{
          width: 160, flexShrink: 0, background: '#1e2e1e',
          borderRight: '3px solid #2a3a2a', padding: '12px 10px', overflowY: 'auto',
        }}>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 9,
            color: '#c8a870', marginBottom: 10,
          }}>
            Still Alive
          </div>
          {(room?.players || []).map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 12, height: 12, background: p.color, border: '2px solid #333', flexShrink: 0 }} />
              <span style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: p.color,
              }}>
                {p.colorName || p.name}
              </span>
            </div>
          ))}
        </div>

        {/* Live code — read only */}
        <div style={{
          flex: 1, background: '#1a2030', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            background: '#0d1520', padding: '5px 12px',
            borderBottom: '2px solid #4a7aaa',
            fontFamily: "'VT323', monospace", fontSize: 15, color: '#546e7a', letterSpacing: 1,
          }}>
            👁 Watching live — read only
          </div>
          <div style={{
            flex: 1, overflowY: 'auto', padding: '8px 0',
            fontFamily: "'VT323', monospace", fontSize: 17, lineHeight: 1.6, color: '#c8d8e8',
          }}>
            {codeLines.map((line, idx) => (
              <div key={idx} style={{ display: 'flex', minHeight: 26 }}>
                <span style={{
                  color: '#556', width: 36, textAlign: 'right',
                  paddingRight: 12, fontSize: 15, flexShrink: 0, userSelect: 'none',
                }}>
                  {idx + 1}
                </span>
                <span style={{ flex: 1, whiteSpace: 'pre', paddingRight: 8 }}>
                  {line || '\u00a0'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat — read only */}
        <div style={{
          width: 200, flexShrink: 0, background: '#f5e6c0',
          borderLeft: '3px solid #8b7355', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: '#4a3a20',
            padding: '10px 12px 8px', borderBottom: '2px solid #8b7355', background: '#f0d898',
          }}>
            Chat
          </div>
          <div style={{
            flex: 1, overflowY: 'auto', padding: '8px 10px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            {chatLog.length === 0
              ? (
                <div style={{
                  fontFamily: "'VT323', monospace", fontSize: 16,
                  color: '#a09060', textAlign: 'center', margin: 'auto',
                }}>
                  No messages yet...
                </div>
              )
              : chatLog.map((m, i) => (
                <div key={i} style={{
                  fontFamily: "'VT323', monospace", fontSize: 15,
                  lineHeight: 1.3, color: '#4a3a20', wordBreak: 'break-word',
                }}>
                  <span style={{ fontWeight: 'bold', color: m.color }}>{m.name}:</span> {m.text}
                </div>
              ))
            }
            <div ref={chatBottomRef} />
          </div>
          <div style={{
            padding: '8px 12px', borderTop: '2px solid #8b7355', background: '#f0d898',
            fontFamily: "'VT323', monospace", fontSize: 14, color: '#8b7355', letterSpacing: 1,
          }}>
            You were eliminated 👻
          </div>
        </div>
      </div>
    </div>
  );
}