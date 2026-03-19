import React, { useState, useEffect } from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';

export default function RejoinScreen() {
  const rejoinInfo = useGameStore((s) => s.rejoinInfo);
  const setScreen  = useGameStore((s) => s.setScreen);
  const resetGame  = useGameStore((s) => s.resetGame);

  const [secondsLeft, setSecondsLeft] = useState(60);
  const [attempting, setAttempting]   = useState(false);
  const [error, setError]             = useState(null);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  // Auto-attempt rejoin every 5 seconds
  useEffect(() => {
    if (!rejoinInfo || secondsLeft <= 0) return;
    attemptRejoin();
    const interval = setInterval(attemptRejoin, 5000);
    return () => clearInterval(interval);
  }, []);

  // Listen for rejoin result
  useEffect(() => {
    socket.on('rejoined', (data) => {
      // useSocket handles the actual state restoration
      setAttempting(false);
    });
    socket.on('rejoin_failed', ({ message }) => {
      setAttempting(false);
      setError(message);
    });
    return () => {
      socket.off('rejoined');
      socket.off('rejoin_failed');
    };
  }, []);

  function attemptRejoin() {
    if (!rejoinInfo || secondsLeft <= 0) return;
    setAttempting(true);
    setError(null);
    socket.emit('rejoin_room', {
      code: rejoinInfo.code,
      name: rejoinInfo.name,
      rejoinToken: rejoinInfo.rejoinToken,
    });
  }

  function goToMenu() {
    resetGame();
    setScreen('menu');
  }

  const expired = secondsLeft <= 0;

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#0a1a12',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 10, gap: 20,
    }}>
      {!expired ? (
        <>
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 14, color: '#f5a623', letterSpacing: 2, textAlign: 'center',
          }}>
            CONNECTION LOST
          </div>

          {/* Big countdown circle */}
          <div style={{
            width: 120, height: 120, borderRadius: '50%',
            border: `6px solid ${secondsLeft > 20 ? '#27ae60' : secondsLeft > 10 ? '#e67e22' : '#c0392b'}`,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            transition: 'border-color 0.5s',
          }}>
            <div style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 32, color: '#fff',
            }}>
              {secondsLeft}
            </div>
            <div style={{
              fontFamily: "'VT323', monospace",
              fontSize: 14, color: '#aaa',
            }}>
              seconds
            </div>
          </div>

          <div style={{
            fontFamily: "'VT323', monospace",
            fontSize: 20, color: '#7ecba0', letterSpacing: 2, textAlign: 'center',
          }}>
            {attempting ? 'Reconnecting...' : 'Waiting to reconnect...'}
          </div>

          {rejoinInfo && (
            <div style={{
              background: '#f5e6c0', border: '3px solid #8b7355',
              boxShadow: '4px 4px 0 #5a4a30', padding: '12px 24px',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: "'VT323', monospace", fontSize: 18,
                color: '#4a3a20', letterSpacing: 1,
              }}>
                Room: <span style={{ color: '#f5a623', letterSpacing: 3 }}>{rejoinInfo.code}</span>
              </div>
              <div style={{
                fontFamily: "'VT323', monospace", fontSize: 16,
                color: '#8b7355', marginTop: 4,
              }}>
                Playing as: {rejoinInfo.name}
              </div>
            </div>
          )}

          {error && (
            <div style={{
              fontFamily: "'VT323', monospace", fontSize: 18,
              color: '#c0392b', letterSpacing: 1,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={attemptRejoin}
            disabled={attempting}
            style={{
              padding: '12px 28px',
              fontFamily: "'Press Start 2P', monospace", fontSize: 10,
              background: '#27ae60', color: '#fff',
              border: '3px solid #1a6e1a', boxShadow: '4px 4px 0 #1a6e1a',
              cursor: attempting ? 'default' : 'pointer', letterSpacing: 1,
              opacity: attempting ? 0.7 : 1,
            }}
          >
            {attempting ? 'CONNECTING...' : 'REJOIN NOW'}
          </button>

          <button onClick={goToMenu} style={{
            fontFamily: "'VT323', monospace", fontSize: 18,
            color: '#666', background: 'none', border: 'none',
            cursor: 'pointer', letterSpacing: 1,
          }}>
            Give up and go to menu
          </button>
        </>
      ) : (
        <>
          <div style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 14, color: '#c0392b', letterSpacing: 2, textAlign: 'center',
          }}>
            SESSION EXPIRED
          </div>
          <div style={{
            fontFamily: "'VT323', monospace",
            fontSize: 20, color: '#aaa', letterSpacing: 1, textAlign: 'center',
          }}>
            The game continued without you.
          </div>
          <button
            onClick={goToMenu}
            style={{
              padding: '14px 32px',
              fontFamily: "'Press Start 2P', monospace", fontSize: 11,
              background: '#f5a623', color: '#fff',
              border: '3px solid #8b5e00', boxShadow: '4px 4px 0 #8b5e00',
              cursor: 'pointer', letterSpacing: 1, marginTop: 8,
            }}
          >
            BACK TO MENU
          </button>
        </>
      )}
    </div>
  );
}