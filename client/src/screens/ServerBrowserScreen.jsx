import React, { useEffect, useState } from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';

function RoomCard({ room, onJoin, onSpectate }) {
  const phaseLabel = {
    lobby: 'WAITING',
    voting_category: 'STARTING',
    game: 'IN GAME',
    assigning: 'STARTING',
  }[room.phase] || room.phase.toUpperCase();

  const phaseColor = {
    lobby: '#27ae60',
    game: '#c0392b',
    voting_category: '#e67e22',
    assigning: '#e67e22',
  }[room.phase] || '#888';

  const isFull = room.playerCount >= room.maxPlayers;
  const canJoin = room.phase === 'lobby' && !isFull;
  const canSpectate = room.settings?.spectatorAllowed;

  return (
    <div style={{
      background: '#f5e6c0', border: '3px solid #8b7355',
      boxShadow: '4px 4px 0 #5a4a30',
      padding: '14px 16px', marginBottom: 10,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {/* Room info */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 13,
            color: '#f5a623', letterSpacing: 2,
          }}>
            {room.code}
          </span>
          <span style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 8,
            color: '#fff', background: phaseColor,
            padding: '3px 7px', border: `2px solid ${phaseColor}`,
          }}>
            {phaseLabel}
          </span>
        </div>
        <div style={{
          fontFamily: "'VT323', monospace", fontSize: 16,
          color: '#8b7355', letterSpacing: 1,
        }}>
          Host: {room.hostName}
          {room.chosenCategory && ` • ${room.chosenCategory}`}
          {room.phase === 'game' && ` • Round ${room.currentRound}/${room.settings?.maxRounds || 4}`}
        </div>
        <div style={{
          fontFamily: "'VT323', monospace", fontSize: 15,
          color: '#4a3a20', marginTop: 2, letterSpacing: 1,
        }}>
          👤 {room.playerCount}/{room.maxPlayers} players
          {room.spectatorCount > 0 && ` • 👁 ${room.spectatorCount} watching`}
          {room.settings?.roundDuration && ` • ${room.settings.roundDuration}s rounds`}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {canJoin && (
          <button
            onClick={() => onJoin(room.code)}
            style={{
              padding: '8px 16px',
              fontFamily: "'Press Start 2P', monospace", fontSize: 9,
              background: '#5cb85c', color: '#fff',
              border: '2px solid #2e6e2e', boxShadow: '3px 3px 0 #2e6e2e',
              cursor: 'pointer', letterSpacing: 1, whiteSpace: 'nowrap',
            }}
          >
            JOIN
          </button>
        )}
        {canSpectate && (
          <button
            onClick={() => onSpectate(room.code)}
            style={{
              padding: '8px 16px',
              fontFamily: "'Press Start 2P', monospace", fontSize: 9,
              background: '#2980b9', color: '#fff',
              border: '2px solid #1a5a8a', boxShadow: '3px 3px 0 #1a5a8a',
              cursor: 'pointer', letterSpacing: 1, whiteSpace: 'nowrap',
            }}
          >
            WATCH
          </button>
        )}
        {!canJoin && !canSpectate && (
          <span style={{
            fontFamily: "'VT323', monospace", fontSize: 16,
            color: '#a89878', letterSpacing: 1,
          }}>
            {isFull ? 'FULL' : 'CLOSED'}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ServerBrowserScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const setRoom   = useGameStore((s) => s.setRoom);

  const [rooms, setRooms]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [nameInput, setNameInput] = useState('');
  const [joiningCode, setJoiningCode] = useState(null); // code being joined
  const [error, setError]         = useState(null);

  useEffect(() => {
    // Request rooms on mount
    socket.emit('get_public_rooms');

    const onPublicRooms = ({ rooms: r }) => {
      setRooms(r);
      setLoading(false);
    };

    const onRoomJoined = ({ room, rejoinToken }) => {
      useGameStore.getState().setRoom(room);
      useGameStore.getState().setRejoinToken(rejoinToken);
      setScreen('lobby');
    };

    const onSpectating = ({ room }) => {
      useGameStore.getState().setRoom(room);
      setScreen('spectator');
    };

    const onError = ({ message }) => {
      setError(message);
      setJoiningCode(null);
    };

    socket.on('public_rooms', onPublicRooms);
    socket.on('room_joined', onRoomJoined);
    socket.on('spectating', onSpectating);
    socket.on('error', onError);

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => socket.emit('get_public_rooms'), 5000);

    return () => {
      socket.off('public_rooms', onPublicRooms);
      socket.off('room_joined', onRoomJoined);
      socket.off('spectating', onSpectating);
      socket.off('error', onError);
      clearInterval(interval);
    };
  }, []);

  function handleJoin(code) {
    if (!nameInput.trim()) {
      setError('Enter your name first');
      return;
    }
    setError(null);
    setJoiningCode(code);
    socket.emit('join_room', { name: nameInput.trim(), code });
  }

  function handleSpectate(code) {
    if (!nameInput.trim()) {
      setError('Enter your name first');
      return;
    }
    setError(null);
    socket.emit('spectate_room', { name: nameInput.trim(), code });
  }

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', zIndex: 10, padding: '24px 16px', overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, width: '100%', maxWidth: 560 }}>
        <button
          onClick={() => setScreen('menu')}
          className="back-corner"
          style={{ position: 'relative', top: 'auto', left: 'auto' }}
        >
          ← BACK
        </button>
        <div style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 16,
          color: '#f5a623', letterSpacing: 2, flex: 1, textAlign: 'center',
          textShadow: '3px 3px 0 #8b5e00',
        }}>
          PUBLIC GAMES
        </div>
        <button
          onClick={() => { setLoading(true); socket.emit('get_public_rooms'); }}
          style={{
            padding: '8px 14px',
            fontFamily: "'Press Start 2P', monospace", fontSize: 9,
            background: '#a89878', color: '#f5e6c0',
            border: '2px solid #5a4a30', boxShadow: '2px 2px 0 #5a4a30',
            cursor: 'pointer',
          }}
        >
          ↻ REFRESH
        </button>
      </div>

      {/* Name input */}
      <div style={{ width: '100%', maxWidth: 560, marginBottom: 16 }}>
        <div className="dialog" style={{ padding: '14px 16px' }}>
          <div className="dialog-label" style={{ marginBottom: 8 }}>Your name to join or watch</div>
          <input
            className="dialog-input"
            type="text" placeholder="Player name..." maxLength={20}
            value={nameInput} onChange={(e) => setNameInput(e.target.value)}
            style={{ marginBottom: 0 }}
            autoFocus
          />
          {error && (
            <div style={{
              fontFamily: "'VT323', monospace", fontSize: 17, color: '#c0392b',
              letterSpacing: 1, marginTop: 6,
            }}>
              ⚠ {error}
            </div>
          )}
        </div>
      </div>

      {/* Room list */}
      <div style={{ width: '100%', maxWidth: 560 }}>
        {loading ? (
          <div style={{
            fontFamily: "'VT323', monospace", fontSize: 22,
            color: '#8b7355', textAlign: 'center', letterSpacing: 2,
            animation: 'blink 1s step-end infinite',
          }}>
            Loading rooms...
          </div>
        ) : rooms.length === 0 ? (
          <div style={{
            background: '#f5e6c0', border: '3px solid #8b7355',
            boxShadow: '4px 4px 0 #5a4a30', padding: '24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎮</div>
            <div style={{
              fontFamily: "'VT323', monospace", fontSize: 20,
              color: '#4a3a20', letterSpacing: 1,
            }}>
              No public games right now.
            </div>
            <div style={{
              fontFamily: "'VT323', monospace", fontSize: 17,
              color: '#8b7355', marginTop: 6, letterSpacing: 1,
            }}>
              Create one and set it to Public!
            </div>
          </div>
        ) : (
          rooms.map((room) => (
            <RoomCard
              key={room.code}
              room={room}
              onJoin={handleJoin}
              onSpectate={handleSpectate}
            />
          ))
        )}
      </div>
    </div>
  );
}