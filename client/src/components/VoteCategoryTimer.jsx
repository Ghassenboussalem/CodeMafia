// Separate timer component used in VoteCategoryScreen
// so VoteCategoryScreen can import useTimer properly
import React from 'react';
import useTimer from '../hooks/useTimer';
import useGameStore from '../store/gameStore';

export default function VoteCategoryTimer() {
  const serverSeconds = useGameStore((s) => s.voteSecondsLeft);
  const { seconds, urgent } = useTimer(serverSeconds, 3);
  return (
    <div className="vote-timer-wrap">
      <div className={`vote-timer${urgent ? ' urgent' : ''}`}>{seconds}s</div>
    </div>
  );
}
