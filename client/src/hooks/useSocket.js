import { useEffect, useRef } from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';
import { getChallengeForRound } from '../utils/challenges';

export default function useSocket() {
  const autoRejoinAttempted = useRef(false);

  useEffect(() => {
    // ── Connection ────────────────────────────────────────────────────
    socket.on('connect', () => {
      const s = useGameStore.getState();
      s.setConnected(true);
      s.setMyId(socket.id);

      // Auto-attempt rejoin on reconnect if we have saved info
      if (s.rejoinInfo && !autoRejoinAttempted.current) {
        autoRejoinAttempted.current = true;
        socket.emit('rejoin_room', {
          code: s.rejoinInfo.code,
          name: s.rejoinInfo.name,
          rejoinToken: s.rejoinInfo.rejoinToken,
        });
      }
    });

    socket.on('disconnect', () => {
      const s = useGameStore.getState();
      s.setConnected(false);

      // If mid-game, save rejoin info and go to rejoin screen
      if (['game', 'voting_players', 'emergency', 'spectator'].includes(s.screen)) {
        const me = s.room?.players?.find((p) => p.id === socket.id);
        if (me && s.rejoinToken && s.room) {
          s.setRejoinInfo({
            code: s.room.code,
            name: me.name,
            rejoinToken: s.rejoinToken,
          });
          s.setScreen('rejoin');
          autoRejoinAttempted.current = false;
        }
      }
    });

    // ── Rejoin ────────────────────────────────────────────────────────
    socket.on('rejoined', ({ room, role, currentRound, category, testsPassed, sabotagesDone }) => {
      const s = useGameStore.getState();
      const challenge = getChallengeForRound(category, currentRound);
      s.setRoom(room);
      s.setMyRole(role);
      s.setChosenCategory(category);
      s.setCurrentRound(currentRound);
      s.setCodeLines([...challenge.code]);
      s.setTestNames(challenge.tests.map((t) => t.name));
      s.setSabotages(challenge.sabotages);
      s.setTestsPassed(testsPassed || 0);
      s.setSabotagesDone(sabotagesDone || 0);
      s.setRejoinInfo(null);
      s.setScreen('game');
      autoRejoinAttempted.current = false;
    });

    socket.on('rejoin_failed', ({ message }) => {
      console.warn('Rejoin failed:', message);
      // RejoinScreen handles this event directly
    });

    socket.on('player_rejoined', ({ room, name }) => {
      useGameStore.getState().setRoom(room);
    });

    // ── Kicked ────────────────────────────────────────────────────────
    socket.on('you_were_kicked', () => {
      const s = useGameStore.getState();
      s.resetGame();
      s.setScreen('kicked');
    });

    // ── Lobby ─────────────────────────────────────────────────────────
    socket.on('room_created', ({ room, rejoinToken }) => {
      const s = useGameStore.getState();
      s.setRoom(room);
      s.setRejoinToken(rejoinToken);
      s.setScreen('lobby');
    });

    socket.on('room_joined', ({ room, rejoinToken }) => {
      const s = useGameStore.getState();
      s.setRoom(room);
      s.setRejoinToken(rejoinToken);
      s.setScreen('lobby');
    });

    socket.on('room_updated',  ({ room }) => useGameStore.getState().setRoom(room));
    socket.on('player_joined', ({ room }) => useGameStore.getState().setRoom(room));
    socket.on('player_left',   ({ room }) => {
      const s = useGameStore.getState();
      s.setRoom(room);
      s.setAliveCount(room.players.length);
    });

    // ── Category Vote ─────────────────────────────────────────────────
    socket.on('vote_start', ({ categories, duration }) => {
      const s = useGameStore.getState();
      const counts = {};
      categories.forEach((c) => (counts[c] = 0));
      s.setCategories(categories);
      s.setCategoryVoteCounts(counts);
      s.setVoteSecondsLeft(duration);
      s.setMyVote(null);
      s.setScreen('vote_category');
    });
    socket.on('vote_tick',           ({ seconds }) => useGameStore.getState().setVoteSecondsLeft(seconds));
    socket.on('vote_counts_updated', ({ counts })  => useGameStore.getState().setCategoryVoteCounts(counts));
    socket.on('vote_end', ({ winner }) => {
      useGameStore.getState().setChosenCategory(winner);
      useGameStore.getState().setScreen('assigning');
    });

    // ── Role ──────────────────────────────────────────────────────────
    socket.on('role_assigned', ({ role }) => {
      useGameStore.getState().setMyRole(role);
      useGameStore.getState().setScreen('role_reveal');
    });

    // ── Game ──────────────────────────────────────────────────────────
    function loadRound(category, round) {
      const challenge = getChallengeForRound(category, round);
      const s = useGameStore.getState();
      s.setCurrentRound(round);
      s.setCodeLines([...challenge.code]);
      s.setTestNames(challenge.tests.map((t) => t.name));
      s.setTestsPassed(0);
      s.setSabotages(challenge.sabotages);
      s.setSabotagesDone(0);
      s.setRoundSecondsLeft(60);
    }

    socket.on('game_start', ({ category, round, settings }) => {
      const s = useGameStore.getState();
      loadRound(category, round);
      s.setAliveCount(s.room?.players?.length || 0);
      s.setDisconnectedPlayerIds([]);
      if (settings) {
        const room = s.room;
        if (room) s.setRoom({ ...room, settings });
      }
      s.setScreen('game');
    });

    socket.on('round_start', ({ round }) => {
      const s = useGameStore.getState();
      loadRound(s.chosenCategory, round);
      s.setEliminatedPlayer(null);
      s.setMyPlayerVote(null);
      s.setVotingPlayers([]);
      s.setEmergencyCaller(null);
      if (s.screen !== 'spectator') s.setScreen('game');
    });

    socket.on('round_tick', ({ seconds }) => useGameStore.getState().setRoundSecondsLeft(seconds));

    socket.on('code_change', ({ lineIndex, content }) => {
      useGameStore.getState().updateCodeLine(lineIndex, content);
    });

    socket.on('tests_updated', ({ testsPassed, total, results }) => {
      const s = useGameStore.getState();
      s.setTestsPassed(testsPassed);
      s.setTestsTotal(total);
      if (results) s.setTestNames(results.map((r) => r.name));
    });

    socket.on('sabotage_confirmed', ({ sabotagesDone }) => {
      useGameStore.getState().setSabotagesDone(sabotagesDone);
    });

    // ── Emergency ─────────────────────────────────────────────────────
    socket.on('emergency_called', ({ calledBy }) => {
      useGameStore.getState().setEmergencyCaller(calledBy);
    });

    socket.on('voting_start', ({ players, duration }) => {
      const s = useGameStore.getState();
      s.setVotingPlayers(players);
      s.setVoteSecondsLeftPlayer(duration);
      s.setMyPlayerVote(null);
      s.setEmergencyCaller(null);
    });

    socket.on('vote_tick_player', ({ seconds }) => {
      useGameStore.getState().setVoteSecondsLeftPlayer(seconds);
    });

    socket.on('vote_result', ({ eliminated }) => {
      const s = useGameStore.getState();
      s.setEliminatedPlayer(eliminated);
      s.setVotingPlayers([]);
      if (eliminated) {
        const room = s.room;
        if (room) {
          s.setRoom({ ...room, players: room.players.filter((p) => p.id !== eliminated.id) });
          s.setAliveCount(Math.max(0, (s.aliveCount || 1) - 1));
        }
      }
    });

    // ── Eliminated ────────────────────────────────────────────────────
    socket.on('you_were_eliminated', () => {
      const s = useGameStore.getState();
      s.setIsSpectator(true);
      s.setScreen('spectator');
    });

    // ── Disconnect tracking ───────────────────────────────────────────
    socket.on('player_disconnected', ({ playerId, room }) => {
      const s = useGameStore.getState();
      s.setRoom(room);
      s.addDisconnectedPlayer(playerId);
    });

    socket.on('player_reconnected', ({ room }) => {
      useGameStore.getState().setRoom(room);
    });

    // ── Chat ──────────────────────────────────────────────────────────
    socket.on('message_received', (msg) => useGameStore.getState().addChatMessage(msg));

    // ── Settings ──────────────────────────────────────────────────────
    socket.on('settings_updated', ({ settings }) => {
      const s = useGameStore.getState();
      const room = s.room;
      if (room) s.setRoom({ ...room, settings });
    });

    // ── Server Browser ────────────────────────────────────────────────
    socket.on('public_rooms', ({ rooms }) => {
      useGameStore.getState().setPublicRooms(rooms);
    });

    // ── Spectating ────────────────────────────────────────────────────
    socket.on('spectating', ({ room }) => {
      const s = useGameStore.getState();
      s.setRoom(room);
      s.setIsSpectator(true);
      s.setScreen('spectator');
    });

    socket.on('spectator_joined', ({ spectatorCount }) => {
      const s = useGameStore.getState();
      const room = s.room;
      if (room) s.setRoom({ ...room, spectatorCount });
    });

    socket.on('spectator_left', ({ spectatorCount }) => {
      const s = useGameStore.getState();
      const room = s.room;
      if (room) s.setRoom({ ...room, spectatorCount });
    });

    // ── Game Over ─────────────────────────────────────────────────────
    socket.on('game_over', (data) => {
      const s = useGameStore.getState();
      s.setGameOverData(data);
      s.setIsSpectator(false);
      s.setRejoinInfo(null);
      s.setScreen('game_over');
    });

    socket.on('game_abandoned', ({ message }) => {
      const s = useGameStore.getState();
      s.setGameOverData({ abandoned: true, message });
      s.setIsSpectator(false);
      s.setScreen('game_over');
    });

    socket.on('error', ({ message }) => console.warn('Server error:', message));

    return () => {
      [
        'connect', 'disconnect',
        'room_created', 'room_joined', 'room_updated', 'player_joined', 'player_left',
        'rejoined', 'rejoin_failed', 'player_rejoined', 'you_were_kicked',
        'vote_start', 'vote_tick', 'vote_counts_updated', 'vote_end',
        'role_assigned', 'game_start', 'round_start', 'round_tick',
        'code_change', 'tests_updated', 'sabotage_confirmed',
        'emergency_called', 'voting_start', 'vote_tick_player', 'vote_result',
        'you_were_eliminated', 'player_disconnected', 'player_reconnected',
        'message_received', 'game_over', 'game_abandoned', 'error',
        'settings_updated', 'public_rooms',
        'spectating', 'spectator_joined', 'spectator_left',
      ].forEach((ev) => socket.off(ev));
    };
  }, []);
}