import React, { useState, useEffect } from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import CodeEditor from '../components/CodeEditor';
import Chat from '../components/Chat';
import SabotagePanel from '../components/SabotagePanel';
import QuizOverlay from '../components/QuizOverlay';
import LightsOutEffect from '../components/LightsOutEffect';

// Detect mobile once (SSR-safe)
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth <= 600);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth <= 600);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}


// ── Standup Button (replaces Emergency button) ────────────────────────────
function StandupButton() {
  const emergencyUsed    = useGameStore((s) => s.emergencyUsed);
  const setEmergencyUsed = useGameStore((s) => s.setEmergencyUsed);

  if (emergencyUsed) return null;

  return (
    <button
      className="emergency-btn"
      onClick={() => {
        setEmergencyUsed(true);
        socket.emit('call_emergency');
      }}
      style={{ background: '#e67e22', borderColor: '#8a4a00', boxShadow: '4px 4px 0 #8a4a00' }}
    >
      📢 CALL STANDUP
    </button>
  );
}

// ── Standup Overlay (replaces Emergency overlay) ──────────────────────────
function StandupOverlay({ caller }) {
  return (
    <div className="emergency-overlay">
      <div className="emergency-box">
        <div className="emergency-title"
          style={{ background: '#e67e22', borderColor: '#8a4a00', boxShadow: '6px 6px 0 #8a4a00' }}>
          STANDUP<br />CALLED!
        </div>
        <div className="emergency-caller">
          {caller} called a sprint review
        </div>
        <div className="emergency-sub">
          Who shipped the bug? Voting begins shortly...
        </div>
      </div>
      <Chat mini />
    </div>
  );
}

// ── Vote Overlay ──────────────────────────────────────────────────────────
function VoteOverlay() {
  const myId            = useGameStore((s) => s.myId);
  const room            = useGameStore((s) => s.room);
  const votingPlayers   = useGameStore((s) => s.votingPlayers);
  const secondsLeft     = useGameStore((s) => s.voteSecondsLeftPlayer);
  const myPlayerVote    = useGameStore((s) => s.myPlayerVote);
  const setMyPlayerVote = useGameStore((s) => s.setMyPlayerVote);

  const urgent = secondsLeft <= 10;
  const locked = myPlayerVote !== null;

  function castVote(targetId) {
    if (locked) return;
    setMyPlayerVote(targetId);
    socket.emit('cast_player_vote', { targetId });
  }

  function skipVote() {
    if (locked) return;
    setMyPlayerVote('skip');
    socket.emit('skip_vote');
  }

  return (
    <div className="player-vote-overlay">
      <div className="player-vote-box">
        <div className="pvote-title" style={{ color: '#e67e22' }}>
          WHO SHIPPED THE BUG?
        </div>
        <div className="pvote-sub">
          Vote to remove a dev from the sprint
        </div>
        <div className={`pvote-timer${urgent ? ' urgent' : ''}`}>
          {secondsLeft}s
        </div>

        {votingPlayers.map((p) => {
          const isMe     = p.id === myId;
          const selected = myPlayerVote === p.id;
          return (
            <div
              key={p.id}
              className={`pvote-row${selected ? ' selected-vote' : ''}${isMe || locked ? ' no-hover' : ''}`}
              onClick={() => !isMe && castVote(p.id)}
            >
              <div className="pvote-color" style={{ background: p.color }} />
              <span className="pvote-name" style={{ color: p.color }}>
                {p.name}
                {isMe && <span style={{ color: '#8b7355' }}> (You)</span>}
                {p.id === room?.hostId && <span style={{ color: '#f5a623' }}> ★</span>}
              </span>
              {isMe && <span className="pvote-badge" style={{ color: '#c0392b' }}>!</span>}
            </div>
          );
        })}

        <button
          className="pvote-skip"
          onClick={skipVote}
          disabled={locked}
          style={{ opacity: locked ? 0.6 : 1 }}
        >
          SKIP — NO SUSPECT
        </button>

        {locked && (
          <div style={{
            fontFamily: "'VT323', monospace", fontSize: 16,
            color: '#aaa', letterSpacing: 1, marginTop: 4,
          }}>
            Vote recorded. Waiting for others...
          </div>
        )}
      </div>
      <Chat mini />
    </div>
  );
}

// ── Vote Result ───────────────────────────────────────────────────────────
function VoteResultOverlay({ eliminated, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="vote-result-overlay">
      <div className="vote-result-box">
        <div className="vote-result-title">SPRINT REVIEW RESULT</div>
        {eliminated ? (
          <>
            <div className="vote-result-name" style={{ color: eliminated.color }}>
              {eliminated.name}
            </div>
            <div className="vote-result-sub">was removed from the sprint.</div>
          </>
        ) : (
          <>
            <div className="vote-result-name" style={{ color: '#8b7355' }}>No consensus</div>
            <div className="vote-result-sub">The sprint continues.</div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Round Banner (now says "Resuming sprint...") ──────────────────────────
function ResumeBanner({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#0d2030f0',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 20,
          color: '#e67e22', textShadow: '3px 3px 0 #8a4a00',
          animation: 'roleFadeIn .4s ease-out',
        }}>
          SPRINT RESUMED
        </div>
        <div style={{
          fontFamily: "'VT323', monospace", fontSize: 20,
          color: '#ccc', marginTop: 10, letterSpacing: 2,
        }}>
          Back to work...
        </div>
      </div>
    </div>
  );
}

// ── Main GameScreen ───────────────────────────────────────────────────────
export default function GameScreen() {
  const emergencyCaller     = useGameStore((s) => s.emergencyCaller);
  const votingPlayers       = useGameStore((s) => s.votingPlayers);
  const eliminatedPlayer    = useGameStore((s) => s.eliminatedPlayer);
  const setEliminatedPlayer = useGameStore((s) => s.setEliminatedPlayer);

  const [showResult, setShowResult] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [activeTab,  setActiveTab]  = useState('editor'); // 'sidebar' | 'editor' | 'chat'
  const isMobile = useIsMobile();

  useEffect(() => {
    if (eliminatedPlayer !== null && eliminatedPlayer !== undefined && votingPlayers.length === 0) {
      setShowResult(true);
    }
  }, [eliminatedPlayer, votingPlayers.length]);

  const showStandup = !!emergencyCaller && votingPlayers.length === 0 && !showResult;
  const showVoting  = votingPlayers.length > 0;
  const quizData    = useGameStore((s) => s.quizData);
  const frozen      = showStandup || showVoting || showResult || showBanner || !!quizData;

  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#1a2030',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <TopBar />

      <div
        className={`game-layout${isMobile ? ` tab-${activeTab}` : ''}`}
        style={{ flex: 1, overflow: 'hidden' }}
      >
        <Sidebar />
        <div className="game-editor-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <CodeEditor frozen={frozen} />
        </div>
        <div className="game-chat-panel">
          <Chat />
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="mobile-tab-bar">
        <button
          className={`mobile-tab-btn${activeTab === 'sidebar' ? ' active' : ''}`}
          onClick={() => setActiveTab('sidebar')}
        >
          <span className="mobile-tab-icon">📋</span>
          TESTS
        </button>
        <button
          className={`mobile-tab-btn${activeTab === 'editor' ? ' active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          <span className="mobile-tab-icon">💻</span>
          CODE
        </button>
        <button
          className={`mobile-tab-btn${activeTab === 'chat' ? ' active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <span className="mobile-tab-icon">💬</span>
          CHAT
        </button>
      </div>

      <StandupButton />

      {showStandup && <StandupOverlay caller={emergencyCaller} />}
      {showVoting   && <VoteOverlay />}
      {showResult   && (
        <VoteResultOverlay
          eliminated={eliminatedPlayer}
          onDone={() => {
            setShowResult(false);
            setEliminatedPlayer(null);
            setShowBanner(true);
          }}
        />
      )}
      {showBanner && <ResumeBanner onDone={() => setShowBanner(false)} />}

      {/* Sabotage UI */}
      <SabotagePanel />
      <QuizOverlay />
      <LightsOutEffect />
    </div>
  );
}