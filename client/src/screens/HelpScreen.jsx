import React, { useState } from 'react';
import useGameStore from '../store/gameStore';
import { useAuth } from '../contexts/AuthContext';

// ── Pixel art scene components ─────────────────────────────────────────────

function PixelPlayer({ color, label, crown, check, sus, eliminated, x, y }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Body */}
      <rect x="8" y="12" width="16" height="18" fill={color} />
      {/* Head */}
      <rect x="6" y="2" width="20" height="16" fill={color} />
      {/* Eyes */}
      <rect x="10" y="8" width="4" height="4" fill="white" />
      <rect x="18" y="8" width="4" height="4" fill="white" />
      <rect x="11" y="9" width="2" height="2" fill="#222" />
      <rect x="19" y="9" width="2" height="2" fill="#222" />
      {/* Crown */}
      {crown && (
        <g>
          <rect x="6" y="-4" width="4" height="6" fill="#f5a623" />
          <rect x="14" y="-6" width="4" height="8" fill="#f5a623" />
          <rect x="22" y="-4" width="4" height="6" fill="#f5a623" />
          <rect x="6" y="0" width="20" height="2" fill="#f5a623" />
        </g>
      )}
      {/* Check */}
      {check && (
        <g>
          <rect x="24" y="-8" width="10" height="10" fill="#27ae60" rx="2" />
          <rect x="26" y="-2" width="3" height="3" fill="white" />
          <rect x="29" y="-6" width="3" height="7" fill="white" />
        </g>
      )}
      {/* Sus */}
      {sus && (
        <g>
          <rect x="24" y="-8" width="10" height="10" fill="#c0392b" rx="2" />
          <rect x="28" y="-6" width="2" height="5" fill="white" />
          <rect x="28" y="-0" width="2" height="2" fill="white" />
        </g>
      )}
      {/* Eliminated X */}
      {eliminated && (
        <g>
          <line x1="4" y1="0" x2="28" y2="28" stroke="#c0392b" strokeWidth="4" />
          <line x1="28" y1="0" x2="4" y2="28" stroke="#c0392b" strokeWidth="4" />
        </g>
      )}
      {/* Label */}
      {label && (
        <text x="16" y="40" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, fill: color }}>
          {label}
        </text>
      )}
    </g>
  );
}

function PixelCode({ lines, highlight }) {
  const colors = {
    kw: '#c792ea', fn: '#82aaff', str: '#c3e88d',
    num: '#f78c6c', cm: '#546e7a', todo: '#ffcb6b', normal: '#c8d8e8',
  };
  return (
    <rect x="0" y="0" width="100%" height="100%" fill="#1a2030">
      {lines.map((line, i) => (
        <text key={i} x="8" y={20 + i * 18}
          style={{
            fontFamily: 'monospace', fontSize: 11,
            fill: highlight === i ? '#ffcb6b' : colors[line.type] || colors.normal,
          }}>
          {line.text}
        </text>
      ))}
    </rect>
  );
}

// ── Slides ─────────────────────────────────────────────────────────────────

const SLIDES = [
  {
    title: 'WHAT IS CODE MAFIA?',
    subtitle: 'A multiplayer game of coding and deception',
    color: '#f5a623',
    render: () => (
      <svg viewBox="0 0 340 180" style={{ width: '100%', maxWidth: 340 }}>
        {/* Background */}
        <rect width="340" height="180" fill="#1a2a1a" />

        {/* Title card */}
        <rect x="20" y="20" width="300" height="60" fill="#f5e6c0" stroke="#8b7355" strokeWidth="3" />
        <rect x="23" y="23" width="294" height="54" fill="none" stroke="#fffbe8" strokeWidth="1" />
        <text x="170" y="50" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 13, fill: '#4a3a20' }}>
          3–5 PLAYERS
        </text>
        <text x="170" y="68" textAnchor="middle"
          style={{ fontFamily: "'VT323', monospace", fontSize: 16, fill: '#8b7355' }}>
          One hidden impostor among coders
        </text>

        {/* Players row */}
        <PixelPlayer color="#c0392b" label="Red" crown x={20} y={95} />
        <PixelPlayer color="#2980b9" label="Blue" x={80} y={95} />
        <PixelPlayer color="#27ae60" label="Green" x={140} y={95} />
        <PixelPlayer color="#e67e22" label="Orange" sus x={200} y={95} />
        <PixelPlayer color="#8e44ad" label="Purple" x={260} y={95} />

        {/* VS label */}
        <rect x="130" y="155" width="80" height="18" fill="#c0392b" />
        <text x="170" y="168" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, fill: 'white' }}>
          FIND THE IMPOSTOR
        </text>
      </svg>
    ),
    points: [
      '3 to 5 players join the same lobby',
      'One player is secretly the impostor',
      'Civilians try to fix buggy code',
      'The impostor tries to sabotage it',
      'Vote out the impostor to win!',
    ],
  },

  {
    title: 'THE LOBBY',
    subtitle: 'Creating and joining a game',
    color: '#27ae60',
    render: () => (
      <svg viewBox="0 0 340 180" style={{ width: '100%', maxWidth: 340 }}>
        <rect width="340" height="180" fill="#5ab0e0" />
        <rect x="0" y="152" width="340" height="28" fill="#5cb85c" />

        {/* Lobby box */}
        <rect x="20" y="15" width="300" height="130" fill="#f5e6c0" stroke="#8b7355" strokeWidth="3" />

        {/* Code box */}
        <rect x="35" y="28" width="270" height="30" fill="#f0d898" stroke="#8b7355" strokeWidth="2" />
        <text x="50" y="48" style={{ fontFamily: "'VT323', monospace", fontSize: 14, fill: '#4a3a20' }}>
          Lobby Code:
        </text>
        <text x="160" y="48" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, fill: '#f5a623' }}>
          J3BI5F
        </text>
        <rect x="285" y="31" width="14" height="24" fill="#a89878" stroke="#5a4a30" strokeWidth="1" />

        {/* Players */}
        <PixelPlayer color="#c0392b" label="Red" crown check x={30} y={65} />
        <PixelPlayer color="#2980b9" label="Blue" check x={90} y={65} />
        <PixelPlayer color="#27ae60" label="You" x={150} y={65} />

        {/* Ready button */}
        <rect x="120" y="128" width="100" height="16" fill="#5cb85c" stroke="#2e6e2e" strokeWidth="2" />
        <text x="170" y="140" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, fill: 'white' }}>
          READY!
        </text>
      </svg>
    ),
    points: [
      'Click CREATE GAME to start a lobby',
      'Share the 6-letter code with friends',
      'Friends click JOIN GAME and enter the code',
      'Need at least 3 players to start',
      'Everyone clicks READY to begin',
    ],
  },

  {
    title: 'ROLE REVEAL',
    subtitle: 'You are either a Civilian or the Impostor',
    color: '#e94fa0',
    render: () => (
      <svg viewBox="0 0 340 180" style={{ width: '100%', maxWidth: 340 }}>
        <rect width="340" height="180" fill="#0a1a12" />

        {/* Civilian side */}
        <rect x="10" y="15" width="150" height="150" fill="#0a2a12" stroke="#27ae60" strokeWidth="2" />
        <text x="85" y="40" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, fill: '#27ae60' }}>
          CIVILIAN
        </text>
        <PixelPlayer color="#27ae60" x={62} y={45} />
        <text x="85" y="120" textAnchor="middle"
          style={{ fontFamily: "'VT323', monospace", fontSize: 13, fill: '#7ecba0' }}>
          Fix the bugs!
        </text>
        <text x="85" y="135" textAnchor="middle"
          style={{ fontFamily: "'VT323', monospace", fontSize: 12, fill: '#7ecba0' }}>
          Find the impostor!
        </text>
        <text x="85" y="150" textAnchor="middle"
          style={{ fontFamily: "'VT323', monospace", fontSize: 12, fill: '#7ecba0' }}>
          Pass all 3 tests!
        </text>

        {/* Impostor side */}
        <rect x="180" y="15" width="150" height="150" fill="#2a0a0a" stroke="#c0392b" strokeWidth="2" />
        <text x="255" y="40" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, fill: '#c0392b' }}>
          IMPOSTOR
        </text>
        <PixelPlayer color="#c0392b" x={232} y={45} />
        <text x="255" y="120" textAnchor="middle"
          style={{ fontFamily: "'VT323', monospace", fontSize: 13, fill: '#f0a0a0' }}>
          Sabotage code!
        </text>
        <text x="255" y="135" textAnchor="middle"
          style={{ fontFamily: "'VT323', monospace", fontSize: 12, fill: '#f0a0a0' }}>
          Stay hidden!
        </text>
        <text x="255" y="150" textAnchor="middle"
          style={{ fontFamily: "'VT323', monospace", fontSize: 12, fill: '#f0a0a0' }}>
          Survive 4 rounds!
        </text>

        {/* VS */}
        <text x="170" y="98" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, fill: '#fff' }}>
          VS
        </text>
      </svg>
    ),
    points: [
      'After voting for a category, roles are assigned secretly',
      'Only you know your role — never tell anyone!',
      'Civilians see green CIVILIAN on their screen',
      'The impostor sees red IMPOSTOR on their screen',
      'With 2 impostors they know each other',
    ],
  },

  {
    title: 'THE CODE EDITOR',
    subtitle: 'Everyone shares the same live code',
    color: '#2980b9',
    render: () => (
      <svg viewBox="0 0 340 180" style={{ width: '100%', maxWidth: 340 }}>
        <rect width="340" height="180" fill="#1a2030" />

        {/* Line numbers */}
        {[1,2,3,4,5,6,7].map(n => (
          <text key={n} x="16" y={22 + n * 20}
            style={{ fontFamily: 'monospace', fontSize: 11, fill: '#556' }}>
            {n}
          </text>
        ))}

        {/* Code lines */}
        {[
          { text: '# Counter Class', fill: '#546e7a', x: 32, y: 42 },
          { text: '', fill: '#c8d8e8', x: 32, y: 62 },
          { text: 'class Counter:', fill: '#ffcb6b', x: 32, y: 82 },
          { text: '  def increment(self):', fill: '#82aaff', x: 32, y: 102 },
          { text: '    self.count += 1', fill: '#89ddff', x: 32, y: 122 },
          { text: '# TODO: Fix decrement', fill: '#ffcb6b', x: 32, y: 142, bg: true },
          { text: '  self.count -= 2', fill: '#f78c6c', x: 32, y: 162 },
        ].map((line, i) => (
          <g key={i}>
            {line.bg && <rect x="30" y="132" width="260" height="16" fill="#2a1a00" />}
            <text x={line.x} y={line.y}
              style={{ fontFamily: 'monospace', fontSize: 11, fill: line.fill }}>
              {line.text}
            </text>
          </g>
        ))}

        {/* Live indicator */}
        <rect x="240" y="8" width="90" height="18" fill="#27ae60" opacity="0.9" />
        <circle cx="252" cy="17" r="4" fill="white" />
        <text x="260" y="21"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, fill: 'white' }}>
          LIVE SYNC
        </text>

        {/* Bug highlight arrow */}
        <rect x="295" y="130" width="40" height="20" fill="#c0392b" opacity="0.9" />
        <text x="315" y="144" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, fill: 'white' }}>
          BUG!
        </text>
        <line x1="293" y1="140" x2="260" y2="148" stroke="#c0392b" strokeWidth="2" />
      </svg>
    ),
    points: [
      'All players edit the same code simultaneously',
      'Changes appear live on everyone\'s screen — like Google Docs',
      'The code has 3 bugs marked with # TODO',
      'Civilians fix the bugs to pass test cases',
      'The impostor secretly re-introduces bugs or makes new ones',
    ],
  },

  {
    title: 'TEST CASES & SABOTAGE',
    subtitle: 'How civilians win and how the impostor wins',
    color: '#8e44ad',
    render: () => (
      <svg viewBox="0 0 340 180" style={{ width: '100%', maxWidth: 340 }}>
        <rect width="340" height="180" fill="#1e2e1e" />

        {/* Test cases panel */}
        <rect x="10" y="10" width="150" height="160" fill="#1a2a1a" stroke="#2a3a2a" strokeWidth="2" />
        <text x="85" y="28" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, fill: '#c8a870' }}>
          TEST CASES
        </text>
        <text x="85" y="40" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, fill: '#888' }}>
          (2/3)
        </text>

        {/* Test 1 passed */}
        <rect x="18" y="48" width="134" height="24" fill="#d4f0d4" stroke="#27ae60" strokeWidth="1" />
        <circle cx="30" cy="60" r="5" fill="#27ae60" />
        <text x="40" y="64"
          style={{ fontFamily: "'VT323', monospace", fontSize: 13, fill: '#4a3a20' }}>
          increment works ✓
        </text>

        {/* Test 2 passed */}
        <rect x="18" y="78" width="134" height="24" fill="#d4f0d4" stroke="#27ae60" strokeWidth="1" />
        <circle cx="30" cy="90" r="5" fill="#27ae60" />
        <text x="40" y="94"
          style={{ fontFamily: "'VT323', monospace", fontSize: 13, fill: '#4a3a20' }}>
          decrement works ✓
        </text>

        {/* Test 3 not passed */}
        <rect x="18" y="108" width="134" height="24" fill="#f5e6c0" stroke="#8b7355" strokeWidth="1" />
        <circle cx="30" cy="120" r="5" fill="none" stroke="#8b7355" strokeWidth="2" />
        <text x="40" y="124"
          style={{ fontFamily: "'VT323', monospace", fontSize: 13, fill: '#4a3a20' }}>
          reset works
        </text>

        <text x="85" y="158" textAnchor="middle"
          style={{ fontFamily: "'VT323', monospace", fontSize: 12, fill: '#8b9' }}>
          Auto-run when you type!
        </text>

        {/* Sabotage panel */}
        <rect x="175" y="10" width="155" height="160" fill="#2a1a1a" stroke="#3a2a2a" strokeWidth="2" />
        <text x="252" y="28" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, fill: '#e55' }}>
          SABOTAGE
        </text>
        <text x="252" y="40" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, fill: '#888' }}>
          IMPOSTOR ONLY
        </text>

        {/* Sab task done */}
        <rect x="183" y="48" width="139" height="30" fill="#1a3a1a" stroke="#27ae60" strokeWidth="1" />
        <text x="193" y="62"
          style={{ fontFamily: "'VT323', monospace", fontSize: 12, fill: '#90e090' }}>
          ✓ Make increment add 2
        </text>
        <text x="193" y="74"
          style={{ fontFamily: "'VT323', monospace", fontSize: 11, fill: '#e94fa0' }}>
          Line 9 · Done
        </text>

        {/* Sab task pending */}
        <rect x="183" y="84" width="139" height="30" fill="#3a1a1a" stroke="#c0392b" strokeWidth="1" />
        <text x="193" y="98"
          style={{ fontFamily: "'VT323', monospace", fontSize: 12, fill: '#f0a0a0' }}>
          Make reset set to 100
        </text>
        <text x="193" y="110"
          style={{ fontFamily: "'VT323', monospace", fontSize: 11, fill: '#e94fa0' }}>
          Line 18 · Click to do
        </text>

        <text x="252" y="158" textAnchor="middle"
          style={{ fontFamily: "'VT323', monospace", fontSize: 12, fill: '#c88' }}>
          Only you can see this!
        </text>
      </svg>
    ),
    points: [
      'Civilians: click test cases or just edit code — tests run automatically',
      'Pass all 3 tests before round 4 ends → Civilians win',
      'Impostor: complete 3 sabotage tasks from your secret panel',
      'Survive all 4 rounds without being voted out → Impostor wins',
      'Passed tests are locked — they cannot go backwards',
    ],
  },

  {
    title: 'EMERGENCY MEETING',
    subtitle: 'Call a vote when you suspect someone',
    color: '#c0392b',
    render: () => (
      <svg viewBox="0 0 340 180" style={{ width: '100%', maxWidth: 340 }}>
        {/* Dark overlay */}
        <rect width="340" height="180" fill="#0d2030" />

        {/* Emergency box */}
        <rect x="70" y="15" width="200" height="80" fill="#c0392b" stroke="#7a0000" strokeWidth="3" />
        <rect x="73" y="18" width="194" height="74" fill="none" stroke="#ff6666" strokeWidth="1" opacity="0.4" />
        <text x="170" y="50" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, fill: 'white' }}>
          EMERGENCY
        </text>
        <text x="170" y="68" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, fill: 'white' }}>
          MEETING!
        </text>
        <text x="170" y="85" textAnchor="middle"
          style={{ fontFamily: "'VT323', monospace", fontSize: 14, fill: '#ffaaaa' }}>
          Called by Red
        </text>

        {/* Players voting */}
        <PixelPlayer color="#c0392b" label="Red" x={20} y={100} />
        <PixelPlayer color="#2980b9" label="Blue" sus x={80} y={100} />
        <PixelPlayer color="#27ae60" label="Green" x={140} y={100} />
        <PixelPlayer color="#e67e22" label="Orange" sus x={200} y={100} />
        <PixelPlayer color="#8e44ad" label="Purple" x={260} y={100} />

        {/* Emergency button */}
        <rect x="115" y="158" width="110" height="18" fill="#c0392b" stroke="#7a0000" strokeWidth="2" />
        <text x="170" y="171" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, fill: 'white' }}>
          ⚠ EMERGENCY
        </text>
      </svg>
    ),
    points: [
      'Each player gets ONE emergency meeting per game',
      'Press the red EMERGENCY button at the bottom of the screen',
      'The round timer pauses immediately',
      'Everyone gets 30 seconds to vote someone out',
      'Use chat to discuss who you think the impostor is!',
    ],
  },

  {
    title: 'VOTING',
    subtitle: 'Find and eliminate the impostor',
    color: '#e67e22',
    render: () => (
      <svg viewBox="0 0 340 180" style={{ width: '100%', maxWidth: 340 }}>
        <rect width="340" height="180" fill="#0d2030" />

        <text x="170" y="22" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, fill: 'white' }}>
          WHO IS THE IMPOSTOR?
        </text>

        {/* Vote rows */}
        {[
          { name: 'Red (You)', color: '#c0392b', badge: '!', bg: '#fff8e0', border: '#f5a623', y: 30 },
          { name: 'Blue', color: '#2980b9', badge: '', bg: '#f5e6c0', border: '#8b7355', y: 62 },
          { name: 'Green', color: '#27ae60', badge: '★', bg: '#f5e6c0', border: '#8b7355', y: 94 },
          { name: 'Orange', color: '#e67e22', badge: '', bg: '#f8e0e0', border: '#c0392b', voted: true, y: 126 },
        ].map((row) => (
          <g key={row.name}>
            <rect x="30" y={row.y} width="200" height="26"
              fill={row.bg} stroke={row.border} strokeWidth="2" />
            <rect x="38" y={row.y + 4} width="16" height="16" fill={row.color} />
            <text x="62" y={row.y + 16}
              style={{ fontFamily: "'VT323', monospace", fontSize: 15, fill: row.color }}>
              {row.name}
            </text>
            {row.badge && (
              <text x="218" y={row.y + 16}
                style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, fill: row.color }}>
                {row.badge}
              </text>
            )}
            {row.voted && (
              <text x="245" y={row.y + 16}
                style={{ fontFamily: "'VT323', monospace", fontSize: 13, fill: '#c0392b' }}>
                ← voted
              </text>
            )}
          </g>
        ))}

        {/* Skip button */}
        <rect x="30" y="158" width="200" height="16" fill="#f5e6c0" stroke="#8b7355" strokeWidth="1" />
        <text x="130" y="170" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, fill: '#4a3a20' }}>
          SKIP VOTE
        </text>

        {/* Timer */}
        <rect x="250" y="30" width="80" height="40" fill="#f5e6c0" stroke="#8b7355" strokeWidth="2" />
        <text x="290" y="50" textAnchor="middle"
          style={{ fontFamily: "'VT323', monospace", fontSize: 22, fill: '#c0392b' }}>
          18s
        </text>
        <text x="290" y="64" textAnchor="middle"
          style={{ fontFamily: "'VT323', monospace", fontSize: 12, fill: '#8b7355' }}>
          remaining
        </text>
      </svg>
    ),
    points: [
      'You cannot vote for yourself',
      'The player with the most votes gets eliminated',
      'On a tie — nobody gets eliminated',
      'If you eliminate the impostor → Civilians win immediately',
      'If you eliminate the wrong person → game continues',
      'Eliminated players become spectators and can watch',
    ],
  },

  {
    title: 'WIN CONDITIONS',
    subtitle: 'How each side wins',
    color: '#f5a623',
    render: () => (
      <svg viewBox="0 0 340 180" style={{ width: '100%', maxWidth: 340 }}>
        {/* Split background */}
        <rect x="0" y="0" width="170" height="180" fill="#0a2a12" />
        <rect x="170" y="0" width="170" height="180" fill="#1a0a0a" />

        {/* Civilians win */}
        <text x="85" y="22" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, fill: '#27ae60' }}>
          CIVILIANS WIN
        </text>

        {/* Win condition 1 */}
        <rect x="8" y="30" width="154" height="32" fill="#0a3a1a" stroke="#27ae60" strokeWidth="1" />
        <text x="16" y="44"
          style={{ fontFamily: "'VT323', monospace", fontSize: 12, fill: '#7ecba0' }}>
          Vote out the impostor
        </text>
        <text x="16" y="56"
          style={{ fontFamily: "'VT323', monospace", fontSize: 11, fill: '#27ae60' }}>
          at any point in the game
        </text>

        {/* Win condition 2 */}
        <rect x="8" y="68" width="154" height="32" fill="#0a3a1a" stroke="#27ae60" strokeWidth="1" />
        <text x="16" y="82"
          style={{ fontFamily: "'VT323', monospace", fontSize: 12, fill: '#7ecba0' }}>
          Pass all 3 tests
        </text>
        <text x="16" y="94"
          style={{ fontFamily: "'VT323', monospace", fontSize: 11, fill: '#27ae60' }}>
          before round 4 ends
        </text>

        <text x="85" y="125" textAnchor="middle" style={{ fontSize: 36 }}>🏆</text>
        <PixelPlayer color="#27ae60" x={62} y={130} />

        {/* Impostor wins */}
        <text x="255" y="22" textAnchor="middle"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, fill: '#c0392b' }}>
          IMPOSTOR WINS
        </text>

        {/* Win condition 1 */}
        <rect x="178" y="30" width="154" height="32" fill="#3a0a0a" stroke="#c0392b" strokeWidth="1" />
        <text x="186" y="44"
          style={{ fontFamily: "'VT323', monospace", fontSize: 12, fill: '#f0a0a0' }}>
          Survive all 4 rounds
        </text>
        <text x="186" y="56"
          style={{ fontFamily: "'VT323', monospace", fontSize: 11, fill: '#c0392b' }}>
          without being voted out
        </text>

        {/* Win condition 2 */}
        <rect x="178" y="68" width="154" height="32" fill="#3a0a0a" stroke="#c0392b" strokeWidth="1" />
        <text x="186" y="82"
          style={{ fontFamily: "'VT323', monospace", fontSize: 12, fill: '#f0a0a0' }}>
          Outlast the civilians
        </text>
        <text x="186" y="94"
          style={{ fontFamily: "'VT323', monospace", fontSize: 11, fill: '#c0392b' }}>
          only 2 players remain
        </text>

        <text x="255" y="125" textAnchor="middle" style={{ fontSize: 36 }}>💀</text>
        <PixelPlayer color="#c0392b" x={232} y={130} />

        {/* Divider */}
        <line x1="170" y1="0" x2="170" y2="180" stroke="#333" strokeWidth="2" />
      </svg>
    ),
    points: [
      'Civilians win by voting out the impostor OR passing all tests',
      'Impostor wins by surviving all 4 rounds',
      'Impostor also wins if only 2 players remain (them + 1 civilian)',
      'Each round is 60 seconds of coding time',
      'You can only call one emergency meeting per game',
    ],
  },

  {
    title: 'TIPS & TRICKS',
    subtitle: 'How to play smart',
    color: '#8e44ad',
    render: () => (
      <svg viewBox="0 0 340 180" style={{ width: '100%', maxWidth: 340 }}>
        <rect width="340" height="180" fill="#0a0a1a" />

        {/* Tip cards */}
        {[
          { icon: '👁', tip: 'Watch who edits suspicious lines', color: '#f5a623', y: 12 },
          { icon: '💬', tip: 'Use chat to coordinate with your team', color: '#2980b9', y: 50 },
          { icon: '🔑', tip: 'Call emergency early if you are sure', color: '#c0392b', y: 88 },
          { icon: '🎭', tip: 'As impostor, pretend to fix bugs', color: '#8e44ad', y: 126 },
        ].map((tip) => (
          <g key={tip.tip}>
            <rect x="10" y={tip.y} width="320" height="32"
              fill="#1a1a2a" stroke={tip.color} strokeWidth="2" />
            <text x="26" y={tip.y + 21}
              style={{ fontSize: 18 }}>
              {tip.icon}
            </text>
            <text x="54" y={tip.y + 21}
              style={{ fontFamily: "'VT323', monospace", fontSize: 16, fill: tip.color }}>
              {tip.tip}
            </text>
          </g>
        ))}

        <text x="170" y="170" textAnchor="middle"
          style={{ fontFamily: "'VT323', monospace", fontSize: 14, fill: '#555' }}>
          Good luck. Trust no one. 👀
        </text>
      </svg>
    ),
    points: [
      '👁 Watch the code — suspicious edits are a big tell',
      '💬 Chat is your weapon — build trust or sow doubt',
      '🔑 Save your emergency for when you are sure',
      '🎭 Impostor: blend in, fix one bug to look innocent',
      '⏱ Check who is editing when tests start failing',
    ],
  },
];

// ── Main Help Screen ───────────────────────────────────────────────────────

export default function HelpScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const { shouldShowTutorial, dismissTutorial } = useAuth();
  const [slide, setSlide] = useState(0);
  const current = SLIDES[slide];
  const isFirst = slide === 0;
  const isLast  = slide === SLIDES.length - 1;

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#0a0a1a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', zIndex: 10, overflowY: 'auto',
      padding: '16px',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', width: '100%',
        maxWidth: 560, marginBottom: 12, gap: 12,
      }}>
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
          fontFamily: "'Press Start 2P', monospace", fontSize: 11,
          color: '#f5a623', textShadow: '2px 2px 0 #8b5e00',
          flex: 1, textAlign: 'center', letterSpacing: 2,
        }}>
          HOW TO PLAY
        </div>
        <div style={{
          fontFamily: "'VT323', monospace", fontSize: 18,
          color: '#888', whiteSpace: 'nowrap',
        }}>
          {slide + 1} / {SLIDES.length}
        </div>
      </div>

      {/* Skip tutorial button — only shown for new users */}
      {shouldShowTutorial && (
        <button
          onClick={async () => {
            await dismissTutorial();
            setScreen('menu');
          }}
          style={{
            position: 'absolute', top: 16, right: 16,
            fontFamily: "'VT323', monospace", fontSize: 18,
            color: '#555', background: 'none', border: 'none',
            cursor: 'pointer', letterSpacing: 1,
          }}
        >
          SKIP TUTORIAL →
        </button>
      )}

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            onClick={() => setSlide(i)}
            style={{
              width: i === slide ? 20 : 8,
              height: 8,
              background: i === slide ? current.color : '#333',
              border: `2px solid ${i === slide ? current.color : '#555'}`,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          />
        ))}
      </div>

      {/* Slide card */}
      <div style={{
        width: '100%', maxWidth: 560,
        background: '#1a1a2a',
        border: `3px solid ${current.color}`,
        boxShadow: `6px 6px 0 ${current.color}44`,
        marginBottom: 14,
        overflow: 'hidden',
      }}>

        {/* Slide title */}
        <div style={{
          background: current.color,
          padding: '12px 16px',
        }}>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 12,
            color: '#fff', letterSpacing: 1, marginBottom: 4,
          }}>
            {current.title}
          </div>
          <div style={{
            fontFamily: "'VT323', monospace", fontSize: 16,
            color: 'rgba(255,255,255,0.8)', letterSpacing: 1,
          }}>
            {current.subtitle}
          </div>
        </div>

        {/* Pixel art illustration */}
        <div style={{
          background: '#111',
          borderBottom: `2px solid ${current.color}44`,
          padding: 8,
          display: 'flex',
          justifyContent: 'center',
        }}>
          {current.render()}
        </div>

        {/* Bullet points */}
        <div style={{ padding: '14px 18px' }}>
          {current.points.map((point, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              marginBottom: 10,
            }}>
              <div style={{
                width: 8, height: 8, background: current.color,
                flexShrink: 0, marginTop: 5,
              }} />
              <div style={{
                fontFamily: "'VT323', monospace", fontSize: 17,
                color: '#c8d8e8', letterSpacing: 1, lineHeight: 1.4,
              }}>
                {point}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation buttons */}
      <div style={{
        display: 'flex', gap: 12, width: '100%', maxWidth: 560,
        marginBottom: 16,
      }}>
        <button
          onClick={() => setSlide((s) => Math.max(0, s - 1))}
          disabled={isFirst}
          style={{
            flex: 1, padding: '12px 0',
            fontFamily: "'Press Start 2P', monospace", fontSize: 10,
            background: isFirst ? '#333' : '#a89878',
            color: isFirst ? '#555' : '#f5e6c0',
            border: `2px solid ${isFirst ? '#444' : '#5a4a30'}`,
            boxShadow: isFirst ? 'none' : '3px 3px 0 #5a4a30',
            cursor: isFirst ? 'default' : 'pointer',
            letterSpacing: 1,
          }}
        >
          ← PREV
        </button>

        {isLast ? (
          <button
            onClick={async () => {
              if (shouldShowTutorial) await dismissTutorial();
              setScreen('menu');
            }}
            style={{
              flex: 2, padding: '12px 0',
              fontFamily: "'Press Start 2P', monospace", fontSize: 10,
              background: '#27ae60', color: '#fff',
              border: '2px solid #1a6e1a', boxShadow: '3px 3px 0 #1a6e1a',
              cursor: 'pointer', letterSpacing: 1,
            }}
          >
            🎮 START PLAYING!
          </button>
        ) : (
          <button
            onClick={() => setSlide((s) => Math.min(SLIDES.length - 1, s + 1))}
            style={{
              flex: 2, padding: '12px 0',
              fontFamily: "'Press Start 2P', monospace", fontSize: 10,
              background: current.color, color: '#fff',
              border: `2px solid ${current.color}`,
              boxShadow: `3px 3px 0 ${current.color}88`,
              cursor: 'pointer', letterSpacing: 1,
            }}
          >
            NEXT →
          </button>
        )}
      </div>

      {/* Slide jump thumbnails */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6,
        width: '100%', maxWidth: 560, justifyContent: 'center',
        marginBottom: 8,
      }}>
        {SLIDES.map((s, i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            style={{
              padding: '5px 10px',
              fontFamily: "'VT323', monospace", fontSize: 14,
              background: i === slide ? s.color : '#1a1a2a',
              color: i === slide ? '#fff' : '#888',
              border: `2px solid ${i === slide ? s.color : '#333'}`,
              cursor: 'pointer', letterSpacing: 1,
            }}
          >
            {i + 1}. {s.title.split(' ').slice(0, 2).join(' ')}
          </button>
        ))}
      </div>

    </div>
  );
}