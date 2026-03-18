import React, { useState, useEffect } from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import CodeEditor from '../components/CodeEditor';
import Chat from '../components/Chat';
import EmergencyButton from '../components/EmergencyButton';

// ── Emergency Meeting Overlay ────────────────────────────────────────────
function EmergencyOverlay({ caller }) {
  return (
    <div className="emergency-overlay">
      <div className="emergency-box">
        <div className="emergency-title">EMERGENCY<br />MEETING!</div>
        <div className="emergency-caller">Called by {caller}</div>
        <div className="emergency-sub">Voting will begin shortly...</div>
      </div>
      <Chat mini />
    </div>
  );
}

// ── Player Vote Overlay ──────────────────────────────────────────────────
function PlayerVoteOverlay() {
  const myId              = useGameStore((s) => s.myId);
  const room              = useGameStore((s) => s.room);
  const votingPlayers     = useGameStore((s) => s.votingPlayers);
  const secondsLeft       = useGameStore((s) => s.voteSecondsLeftPlayer);
  const myPlayerVote      = useGameStore((s) => s.myPlayerVote);
  const setMyPlayerVote   = useGameStore((s) => s.setMyPlayerVote);

  const urgent  = secondsLeft <= 10;
  const hostId  = room?.hostId;
  const locked  = myPlayerVote !== null;

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
        <div className="pvote-title">WHO IS THE IMPOSTOR?</div>
        <div className="pvote-sub">Vote to eliminate a player or skip</div>
        <div className={`pvote-timer${urgent ? ' urgent' : ''}`}>{secondsLeft}s</div>

        {votingPlayers.map((p) => {
          const isMe     = p.id === myId;
          const selected = myPlayerVote === p.id;
          const noClick  = isMe || locked;
          return (
            <div
              key={p.id}
              className={`pvote-row${selected ? ' selected-vote' : ''}${noClick ? ' no-hover' : ''}`}
              onClick={() => !noClick && castVote(p.id)}
            >
              <div className="pvote-color" style={{ background: p.color }} />
              <span className="pvote-name" style={{ color: p.color }}>
                {p.name}
                {isMe       && <span style={{ color:'#8b7355' }}> (You)</span>}
                {p.id === hostId && <span style={{ color:'#f5a623' }}> ★</span>}
              </span>
              {isMe && <span className="pvote-badge" style={{ color:'#c0392b' }}>!</span>}
            </div>
          );
        })}

        <button
          className="pvote-skip"
          onClick={skipVote}
          disabled={locked}
          style={{ opacity: locked ? 0.6 : 1, cursor: locked ? 'default' : 'pointer' }}
        >
          SKIP VOTE
        </button>

        {locked && (
          <div style={{ fontFamily:"'VT323',monospace", fontSize:16, color:'#aaa', letterSpacing:1, marginTop:4 }}>
            Vote recorded! Waiting for others...
          </div>
        )}
      </div>
      <Chat mini />
    </div>
  );
}

// ── Vote Result Overlay ──────────────────────────────────────────────────
function VoteResultOverlay({ eliminated, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="vote-result-overlay">
      <div className="vote-result-box">
        <div className="vote-result-title">VOTE RESULT</div>
        {eliminated ? (
          <>
            <div className="vote-result-name" style={{ color: eliminated.color }}>
              {eliminated.name}
            </div>
            <div className="vote-result-sub">was eliminated.</div>
          </>
        ) : (
          <>
            <div className="vote-result-name" style={{ color: '#8b7355' }}>No one</div>
            <div className="vote-result-sub">was eliminated. Game continues.</div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Round Transition Banner ───────────────────────────────────────────────
function RoundBanner({ round, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      position:'absolute', inset:0, background:'#0d2030f0',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:60,
    }}>
      <div style={{ textAlign:'center' }}>
        <div style={{
          fontFamily:"'Press Start 2P',monospace", fontSize:32,
          color:'#f5a623', textShadow:'3px 3px 0 #8b5e00',
          animation:'roleFadeIn .4s ease-out',
        }}>
          ROUND {round}
        </div>
        <div style={{ fontFamily:"'VT323',monospace", fontSize:22, color:'#ccc', marginTop:10, letterSpacing:2 }}>
          Get ready...
        </div>
      </div>
    </div>
  );
}

// ── Main GameScreen ──────────────────────────────────────────────────────
export default function GameScreen() {
  const emergencyCaller     = useGameStore((s) => s.emergencyCaller);
  const votingPlayers       = useGameStore((s) => s.votingPlayers);
  const eliminatedPlayer    = useGameStore((s) => s.eliminatedPlayer);
  const currentRound        = useGameStore((s) => s.currentRound);
  const setEliminatedPlayer = useGameStore((s) => s.setEliminatedPlayer);

  const [showResult, setShowResult]   = useState(false);
  const [showBanner, setShowBanner]   = useState(false);
  const [bannerRound, setBannerRound] = useState(1);
  const prevRound = React.useRef(currentRound);

  // Show result overlay when eliminated is set
  useEffect(() => {
    if (eliminatedPlayer !== null && eliminatedPlayer !== undefined && votingPlayers.length === 0) {
      setShowResult(true);
    }
  }, [eliminatedPlayer, votingPlayers.length]);

  // Show round banner on round change
  useEffect(() => {
    if (currentRound > prevRound.current) {
      setBannerRound(currentRound);
      setShowBanner(true);
    }
    prevRound.current = currentRound;
  }, [currentRound]);

  function dismissResult() {
    setShowResult(false);
    setEliminatedPlayer(null);
  }

  const showEmergency = !!emergencyCaller && votingPlayers.length === 0 && !showResult;
  const showVoting    = votingPlayers.length > 0;
  const frozen        = showEmergency || showVoting || showResult || showBanner;

  return (
    <div style={{ position:'absolute', inset:0, background:'#1a2a2a', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <TopBar />

      <div className="game-layout">
        <Sidebar />
        <CodeEditor frozen={frozen} />
        <div className="game-chat-panel">
          <Chat />
        </div>
      </div>

      <EmergencyButton />

      {/* Overlays — ordered by z-index priority */}
      {showEmergency && <EmergencyOverlay caller={emergencyCaller} />}
      {showVoting    && <PlayerVoteOverlay />}
      {showResult    && <VoteResultOverlay eliminated={eliminatedPlayer} onDone={dismissResult} />}
      {showBanner    && <RoundBanner round={bannerRound} onDone={() => setShowBanner(false)} />}
    </div>
  );
}
