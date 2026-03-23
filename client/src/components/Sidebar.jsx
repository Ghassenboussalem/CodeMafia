import React, { useState } from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';
import ActivityFeed from './ActivityFeed';

export default function Sidebar() {
  const room             = useGameStore((s) => s.room);
  const myId             = useGameStore((s) => s.myId);
  const myRole           = useGameStore((s) => s.myRole);
  const testResults      = useGameStore((s) => s.testResults);
  const testsPassed      = useGameStore((s) => s.testsPassed);
  const gameSections     = useGameStore((s) => s.gameSections);
  const disconnectedIds  = useGameStore((s) => s.disconnectedPlayerIds);
  const impostorGoals    = useGameStore((s) => s.impostorGoals);
  const lineAuthors      = useGameStore((s) => s.lineAuthors);
  const fixHints         = useGameStore((s) => s.fixHints);
  const sabotageHints    = useGameStore((s) => s.sabotageHints);
  const shuffleOffset    = useGameStore((s) => s.shuffleOffset);

  const [expandedTest, setExpandedTest] = useState(null); // testName of expanded hint

  const players    = room?.players || [];
  const isImpostor = myRole === 'impostor';

  // Build section test groups
  const sectionTests = gameSections.map((section, sIdx) => ({
    ...section,
    tests: testResults.filter((t) => t.section === sIdx),
  }));

  // Build quick lookup: testName → fixHint
  const fixHintMap = {};
  fixHints.forEach((h) => { fixHintMap[h.testName] = h; });

  // Build quick lookup: testName → sabotageHint
  const sabotageHintMap = {};
  sabotageHints.forEach((h) => { sabotageHintMap[h.testName] = h; });

  // Unique editors — who has touched the code
  const editorMap = {};
  Object.values(lineAuthors).forEach((a) => {
    if (a?.playerId) editorMap[a.playerId] = a;
  });
  const activeEditors = Object.values(editorMap);

  function renderTest(test, tIdx) {
    const hint        = isImpostor ? sabotageHintMap[test.name] : fixHintMap[test.name];
    const isExpanded  = expandedTest === test.name;
    // Impostor: highlight tests they could break (passed tests are targets)
    // Civilian: highlight tests they should fix (failed tests need fixing)
    const showHint    = isImpostor ? test.passed : !test.passed;

    return (
      <div key={tIdx}>
        <div
          className={`test-case${test.passed ? ' passed' : ''}`}
          style={{ cursor: hint && showHint ? 'pointer' : 'default' }}
          onClick={() => {
            if (hint && showHint) {
              setExpandedTest(isExpanded ? null : test.name);
            }
          }}
          title={hint && showHint ? 'Click for hint' : undefined}
        >
          <div className="test-case-dot" />
          <span style={{ fontSize: 13, flex: 1 }}>{test.name}</span>
          {hint && showHint && (
            <span style={{
              fontSize: 10, color: isImpostor ? '#e94fa0' : '#5af',
              marginLeft: 4, opacity: 0.8,
            }}>
              {isExpanded ? '▲' : '?'}
            </span>
          )}
        </div>

        {/* Expanded hint panel */}
        {isExpanded && hint && (
          <div style={{
            background:  isImpostor ? '#2a1520' : '#151f2a',
            border:      `1px solid ${isImpostor ? '#c0392b66' : '#2980b966'}`,
            padding:     '6px 8px',
            marginBottom: 4,
            fontFamily:  "'VT323', monospace",
            lineHeight:  1.5,
          }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>
              Line {hint.line + (isImpostor ? 0 : shuffleOffset)}
            </div>
            <div style={{ fontSize: 13, color: isImpostor ? '#f0a0a0' : '#a0cfff', marginBottom: 4 }}>
              {hint.hint}
            </div>
            {hint.code && hint.code !== '(already correct)' && (
              <div style={{
                background: '#0d1117', padding: '3px 6px',
                fontFamily: "'VT323', monospace", fontSize: 12,
                color: isImpostor ? '#ff8888' : '#7ec8a0',
                whiteSpace: 'pre', borderLeft: `2px solid ${isImpostor ? '#c0392b' : '#27ae60'}`,
              }}>
                {hint.code}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="game-sidebar" style={{ width: 210 }}>

      {/* ── Players ─────────────────────────────────────────── */}
      <div className="sidebar-section-title">Dev Team</div>
      {players.map((p) => {
        const isDisconnected = disconnectedIds.includes(p.id);
        const editorCount    = Object.values(lineAuthors).filter((a) => a?.playerId === p.id).length;
        return (
          <div key={p.id} className="sidebar-player"
            style={{ opacity: isDisconnected ? 0.4 : 1 }}>
            <div className="sidebar-player-dot"
              style={{ background: isDisconnected ? '#555' : p.color }} />
            <div style={{ flex: 1 }}>
              <span className="sidebar-player-name"
                style={{ color: isDisconnected ? '#666' : p.color }}>
                {p.colorName || p.name}
                {p.id === myId ? ' (You)' : ''}
                {isDisconnected ? ' ✗' : ''}
              </span>
              {editorCount > 0 && (
                <span style={{
                  fontFamily: "'VT323', monospace", fontSize: 12,
                  color: '#888', marginLeft: 4,
                }}>
                  {editorCount} edits
                </span>
              )}
            </div>
            {p.id === room?.hostId && (
              <span style={{ color: '#f5a623', fontSize: 10 }}>★</span>
            )}
          </div>
        );
      })}

      {/* ── Test Cases (grouped by section) ─────────────────── */}
      <div className="sidebar-section-title" style={{ marginTop: 14 }}>
        Bug Tracker
        <span style={{ fontSize: 8, marginLeft: 6 }}>
          ({testsPassed}/{testResults.length})
        </span>
        {!isImpostor && fixHints.length > 0 && (
          <span style={{ fontSize: 9, color: '#5af', marginLeft: 6, opacity: 0.7 }}>
            click ? for hint
          </span>
        )}
        {isImpostor && sabotageHints.length > 0 && (
          <span style={{ fontSize: 9, color: '#e94fa0', marginLeft: 6, opacity: 0.7 }}>
            click ? to sabotage
          </span>
        )}
      </div>

      {sectionTests.length > 0 ? (
        sectionTests.map((section, sIdx) => (
          <div key={sIdx} style={{ marginBottom: 8 }}>
            <div style={{
              fontFamily: "'VT323', monospace", fontSize: 13,
              color: '#c8a870', letterSpacing: 1, marginBottom: 4,
              borderLeft: '2px solid #c8a870',
              paddingLeft: 4,
            }}>
              {section.title}
            </div>
            {section.tests.map((test, tIdx) => renderTest(test, tIdx))}
          </div>
        ))
      ) : (
        testResults.map((test, i) => renderTest(test, i))
      )}

      {/* ── Impostor Goals (impostor only) ──────────────────── */}
      {isImpostor && (
        <div style={{ marginTop: 14 }}>
          <div className="sidebar-section-title sabotage-title">
            Stealth Mode
          </div>
          <div style={{
            fontFamily: "'VT323', monospace", fontSize: 13,
            color: '#c88', marginBottom: 6, lineHeight: 1.4,
          }}>
            You see the same hints as civilians. Edit code like you're helping — but subtly break things. Use your ⚡ sabotage powers wisely.
          </div>
        </div>
      )}

      {/* ── Activity Feed ─────────────────────────────────────── */}
      <ActivityFeed />

      <div className="sidebar-note" style={{ marginTop: 8 }}>
        Tests update live as you edit
      </div>
    </div>
  );
}