import React from 'react';
import useGameStore from '../store/gameStore';
import useTimer from '../hooks/useTimer';

export default function TopBar() {
  const currentRound    = useGameStore((s) => s.currentRound);
  const serverSeconds   = useGameStore((s) => s.roundSecondsLeft);
  const category        = useGameStore((s) => s.chosenCategory);
  const aliveCount      = useGameStore((s) => s.aliveCount);

  // useTimer smoothly interpolates between server ticks
  const { seconds, urgent } = useTimer(serverSeconds, 10);

  return (
    <div className="game-topbar">
      <div className="game-round-badge">Round {currentRound}/4</div>
      <div className="game-category-label">{category}</div>
      <div className={`game-timer-box${urgent ? ' urgent' : ''}`}>{seconds}s</div>
      <div className="game-alive-label">👤 {aliveCount} alive</div>
    </div>
  );
}
