import React from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';

export default function Sidebar() {
  const room              = useGameStore((s) => s.room);
  const myId              = useGameStore((s) => s.myId);
  const myRole            = useGameStore((s) => s.myRole);
  const testNames         = useGameStore((s) => s.testNames);
  const testsPassed       = useGameStore((s) => s.testsPassed);
  const testsTotal        = useGameStore((s) => s.testsTotal);
  const sabotages         = useGameStore((s) => s.sabotages);
  const sabotagesDone     = useGameStore((s) => s.sabotagesDone);
  const setSabotagesDone  = useGameStore((s) => s.setSabotagesDone);
  const disconnectedIds   = useGameStore((s) => s.disconnectedPlayerIds);

  const players    = room?.players || [];
  const isImpostor = myRole === 'impostor';

  function handleTestClick(idx) {
    if (idx !== testsPassed) return;
    socket.emit('run_tests');
  }

  function handleSabotageClick(idx) {
    if (idx !== sabotagesDone) return;
    setSabotagesDone(idx + 1); // optimistic
    socket.emit('sabotage_done', { index: idx });
  }

  return (
    <div className="game-sidebar">
      {/* ── Players ──────────────────────────────────────────── */}
      <div className="sidebar-section-title">Players</div>
      {players.map((p) => {
        const isDisconnected = disconnectedIds.includes(p.id);
        return (
          <div key={p.id} className="sidebar-player" style={{ opacity: isDisconnected ? 0.4 : 1 }}>
            <div
              className="sidebar-player-dot"
              style={{
                background: isDisconnected ? '#555' : p.color,
                borderColor: isDisconnected ? '#333' : undefined,
              }}
            />
            <span
              className="sidebar-player-name"
              style={{ color: isDisconnected ? '#666' : p.color }}
            >
              {p.colorName || p.name}
              {p.id === myId ? ' (You)' : ''}
              {isDisconnected ? ' ✗' : ''}
            </span>
          </div>
        );
      })}

      {/* ── Test Cases ───────────────────────────────────────── */}
      <div className="sidebar-section-title" style={{ marginTop: 16 }}>
        Test Cases<br />
        <span style={{ fontSize: 9 }}>({testsPassed}/{testsTotal})</span>
      </div>
      {testNames.map((name, i) => (
        <div
          key={i}
          className={`test-case${i < testsPassed ? ' passed' : ''}`}
          onClick={() => handleTestClick(i)}
          title={i < testsPassed ? 'Passed ✓' : i === testsPassed ? 'Click to run tests' : 'Fix earlier tests first'}
        >
          <div className="test-case-dot" />
          <span>{name}</span>
        </div>
      ))}
      <div className="sidebar-note">Tests lock once<br />passed ✓</div>

      {/* ── Sabotage Panel (impostor only) ───────────────────── */}
      {isImpostor && (
        <div>
          <div className="sidebar-section-title sabotage-title" style={{ marginTop: 16 }}>
            \ Sabotage<br />
            <span style={{ fontSize: 9 }}>({sabotagesDone}/{sabotages.length})</span>
          </div>
          {sabotages.map((s, i) => (
            <div
              key={i}
              className={`sab-task${i < sabotagesDone ? ' done' : ''}`}
              onClick={() => handleSabotageClick(i)}
              title={i < sabotagesDone ? 'Done ✓' : i === sabotagesDone ? 'Click to execute sabotage' : 'Complete previous sabotage first'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="test-case-dot" />
                {s.instruction}
              </div>
              <div className="sab-line-hint">{s.hint}</div>
            </div>
          ))}
          <div className="sidebar-note sabotage-tip">Tip: Be sneaky! Blend<br />in with fixes.</div>
        </div>
      )}
    </div>
  );
}
