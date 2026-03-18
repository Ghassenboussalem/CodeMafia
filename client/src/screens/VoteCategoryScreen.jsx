import React from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';
import VoteCategoryTimer from '../components/VoteCategoryTimer';

export default function VoteCategoryScreen() {
  const categories  = useGameStore((s) => s.categories);
  const counts      = useGameStore((s) => s.categoryVoteCounts);
  const myVote      = useGameStore((s) => s.myVote);
  const setMyVote   = useGameStore((s) => s.setMyVote);

  function castVote(cat) {
    if (myVote) return;
    setMyVote(cat);
    socket.emit('cast_category_vote', { category: cat });
  }

  return (
    <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:10 }}>
      <div className="vote-title">VOTE CATEGORY</div>
      <VoteCategoryTimer />
      <div className="vote-grid">
        {categories.map((cat) => (
          <div
            key={cat}
            className={`vote-card${myVote === cat ? ' selected' : ''}${myVote ? ' locked' : ''}`}
            onClick={() => castVote(cat)}
          >
            <span style={{ whiteSpace: 'pre-line' }}>{cat}</span>
            {counts[cat] > 0 && <span className="vote-count">{counts[cat]}</span>}
          </div>
        ))}
      </div>
      <div className="vote-status">
        {myVote ? 'Vote recorded! Waiting for others...' : '\u00a0'}
      </div>
    </div>
  );
}
