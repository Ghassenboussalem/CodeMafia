import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import useGameStore from '../store/gameStore';

const RANK_COLORS = ['#f5a623', '#aaa', '#8b5e00'];
const RANK_ICONS  = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const setScreen = useGameStore((s) => s.setScreen);
  const [board,   setBoard]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/leaderboard')
      .then(({ leaderboard }) => setBoard(leaderboard))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      position: 'absolute', inset: 0, overflowY: 'auto',
      background: 'linear-gradient(180deg,#0a0a1a 0%,#1a1a2e 100%)',
      zIndex: 10, padding: '24px 16px',
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => setScreen('menu')}
            style={{
              padding: '8px 14px',
              fontFamily: "'Press Start 2P', monospace", fontSize: 9,
              background: '#a89878', color: '#f5e6c0',
              border: '2px solid #5a4a30', boxShadow: '2px 2px 0 #5a4a30',
              cursor: 'pointer',
            }}
          >
            ← BACK
          </button>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 14,
            color: '#f5a623', textShadow: '3px 3px 0 #8b5e00',
            flex: 1, textAlign: 'center', letterSpacing: 2,
          }}>
            🏆 LEADERBOARD
          </div>
        </div>

        {loading ? (
          <div style={{
            fontFamily: "'VT323', monospace", fontSize: 22,
            color: '#aaa', textAlign: 'center', animation: 'blink 1s step-end infinite',
          }}>
            Loading...
          </div>
        ) : board.length === 0 ? (
          <div style={{
            background: '#f5e6c0', border: '4px solid #8b7355',
            boxShadow: '5px 5px 0 #5a4a30', padding: '24px',
            textAlign: 'center',
            fontFamily: "'VT323', monospace", fontSize: 20, color: '#4a3a20',
          }}>
            No players yet. Be the first!
          </div>
        ) : (
          board.map((entry) => {
            const isMe = entry.userId === user?.id;
            const rankColor = RANK_COLORS[entry.rank - 1] || '#f5e6c0';
            return (
              <div
                key={entry.userId}
                style={{
                  background: isMe ? '#fff8e0' : '#f5e6c0',
                  border: `3px solid ${isMe ? '#f5a623' : '#8b7355'}`,
                  boxShadow: `4px 4px 0 ${isMe ? '#8b5e00' : '#5a4a30'}`,
                  padding: '12px 16px', marginBottom: 8,
                  display: 'flex', alignItems: 'center', gap: 14,
                }}
              >
                {/* Rank */}
                <div style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: entry.rank <= 3 ? 22 : 13,
                  color: rankColor,
                  width: 40, textAlign: 'center', flexShrink: 0,
                }}>
                  {entry.rank <= 3 ? RANK_ICONS[entry.rank - 1] : `#${entry.rank}`}
                </div>

                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  border: '2px solid #8b7355', overflow: 'hidden',
                  background: '#f0d898', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20,
                }}>
                  {entry.avatarUrl
                    ? <img src={entry.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '👤'}
                </div>

                {/* Name + level */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: '#4a3a20' }}>
                      {entry.username}
                    </span>
                    {entry.tier === 'pro' && (
                      <span style={{
                        fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                        background: '#f5a623', color: '#fff', padding: '2px 5px',
                        border: '1px solid #8b5e00',
                      }}>PRO</span>
                    )}
                    {isMe && (
                      <span style={{ fontFamily: "'VT323', monospace", fontSize: 16, color: '#8b7355' }}>
                        (You)
                      </span>
                    )}
                  </div>
                  <div style={{ fontFamily: "'VT323', monospace", fontSize: 15, color: '#8b7355', marginTop: 2 }}>
                    Level {entry.level}
                  </div>
                </div>

                {/* XP */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: '#f5a623' }}>
                    {entry.xp.toLocaleString()}
                  </div>
                  <div style={{ fontFamily: "'VT323', monospace", fontSize: 14, color: '#a09060' }}>
                    XP
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}