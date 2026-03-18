import React from 'react';
import useGameStore from '../store/gameStore';
import socket from '../socket';

export default function GameOverScreen() {
  const data      = useGameStore((s) => s.gameOverData);
  const setScreen = useGameStore((s) => s.setScreen);
  const resetGame = useGameStore((s) => s.resetGame);

  function playAgain() {
    resetGame();
    setScreen('menu');
  }

  if (!data) return null;

  if (data.abandoned) {
    return (
      <div style={{ position:'absolute', inset:0, background:'#1a1a2a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:10, gap:16 }}>
        <div style={{ fontFamily:"'VT323',monospace", fontSize:28, color:'#aaa', letterSpacing:2, textAlign:'center' }}>
          GAME ABANDONED
        </div>
        <div style={{ fontFamily:"'VT323',monospace", fontSize:18, color:'#666', letterSpacing:1, textAlign:'center' }}>
          Not enough players to continue.
        </div>
        <button
          className="btn-solo btn-orange"
          style={{ boxShadow:'4px 4px 0 #8b5e00', border:'3px solid #8b5e00', marginTop:16 }}
          onClick={playAgain}
        >
          MAIN MENU
        </button>
      </div>
    );
  }

  const civWin = data.winner === 'civilians';

  return (
    <div
      style={{
        position:'absolute', inset:0, zIndex:10,
        background: civWin
          ? 'linear-gradient(180deg,#5ab0e0 0%,#7ecbee 60%,#a8dff5 100%)'
          : 'linear-gradient(180deg,#1a0010 0%,#2a0020 60%,#1a0810 100%)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4
      }}
    >
      <div className="trophy-icon">{civWin ? '🏆' : '💀'}</div>
      <div className={`gameover-title ${civWin ? 'civ-win' : 'imp-win'}`}>
        {civWin ? 'CIVILIANS WIN!' : 'IMPOSTOR WINS!'}
      </div>
      <div className="gameover-box">
        <div className="gameover-label">The impostor was:</div>
        <div className="gameover-impostor" style={{ color: data.impostorColor || '#fff' }}>
          {data.impostorName || '???'}
        </div>
        {data.reason && (
          <div className="gameover-reason">{data.reason}</div>
        )}
      </div>
      <button
        className="btn-solo btn-orange"
        style={{ boxShadow:'4px 4px 0 #8b5e00', border:'3px solid #8b5e00', marginTop:20 }}
        onClick={playAgain}
      >
        PLAY AGAIN
      </button>
    </div>
  );
}
