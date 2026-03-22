import React from 'react';
import useGameStore from '../store/gameStore';
import useTimer from '../hooks/useTimer';

const LANG_BADGE = {
  python:     { name: 'Python',     emoji: '🐍', color: '#c3e88d', bg: '#1a2e1a', border: '#27ae60' },
  javascript: { name: 'JavaScript', emoji: '⚡', color: '#f7dc6f', bg: '#2e2a1a', border: '#e67e22' },
};

export default function TopBar() {
  const serverSeconds = useGameStore((s) => s.gameSecondsLeft);
  const category      = useGameStore((s) => s.chosenCategory);
  const aliveCount    = useGameStore((s) => s.aliveCount);
  const testsPassed   = useGameStore((s) => s.testsPassed);
  const testsTotal    = useGameStore((s) => s.testsTotal);
  const language      = useGameStore((s) => s.gameLanguage);
  const title         = useGameStore((s) => s.gameTitle);
  const room          = useGameStore((s) => s.room);

  const { seconds, urgent } = useTimer(serverSeconds, 60);
  const lang = LANG_BADGE[language] || LANG_BADGE.python;

  const minutes = Math.floor(seconds / 60);
  const secs    = seconds % 60;
  const timeStr = `${minutes}:${String(secs).padStart(2, '0')}`;

  const progress = Math.round((testsPassed / testsTotal) * 100);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 12px', background: '#2a1a08',
      borderBottom: '3px solid #5a3a10', height: 56, flexShrink: 0,
    }}>
      {/* Category + language */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 8,
          color: '#f5a623', letterSpacing: 1,
        }}>
          {category}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 7,
            color: lang.color, background: lang.bg,
            border: `1px solid ${lang.border}`,
            padding: '2px 6px',
          }}>
            {lang.emoji} {lang.name}
          </span>
          {title && (
            <span style={{
              fontFamily: "'VT323', monospace", fontSize: 14,
              color: '#8b9', letterSpacing: 1,
            }}>
              {title}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#c8a870' }}>
            BUGS FIXED
          </span>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: '#f5a623' }}>
            {testsPassed}/{testsTotal}
          </span>
        </div>
        <div style={{ height: 8, background: '#2a2a2a', border: '1px solid #4a4a4a' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: progress >= 100
              ? '#27ae60'
              : urgent ? '#c0392b' : '#f5a623',
            transition: 'width 0.5s ease-out',
          }} />
        </div>
      </div>

      {/* Timer */}
      <div style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 18,
        color: urgent ? '#c0392b' : '#f5e6c0',
        background: '#1a1208',
        border: `2px solid ${urgent ? '#c0392b' : '#8b7355'}`,
        boxShadow: `2px 2px 0 ${urgent ? '#7a0000' : '#5a4a30'}`,
        padding: '4px 12px',
        letterSpacing: 2,
        animation: urgent ? 'timerBounce .5s ease-in-out infinite' : 'none',
        minWidth: 80,
        textAlign: 'center',
      }}>
        {timeStr}
      </div>

      <div style={{ fontFamily: "'VT323', monospace", fontSize: 16, color: '#aaa', whiteSpace: 'nowrap' }}>
        👤 {aliveCount} alive
      </div>
    </div>
  );
}