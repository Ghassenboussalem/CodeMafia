// client/src/hooks/useSocket.js

import { useEffect, useRef } from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';
import { getChallengeForRound } from '../utils/challenges';

export default function useSocket() {
  const savedCode = useRef(null);
  const savedName = useRef(null);

  useEffect(() => {
    // ── Connection ───────────────────────────────────────────────────
    socket.on('connect', () => {
      useGameStore.getState().setConnected(true);
      useGameStore.getState().setMyId(socket.id);
      const { reconnecting, room } = useGameStore.getState();
      if (reconnecting && savedCode.current && savedName.current) {
        socket.emit('reconnect_room', { code: savedCode.current, name: savedName.current });
      }
    });

    socket.on('disconnect', () => {
      const state = useGameStore.getState();
      state.setConnected(false);
      if (['game', 'voting_players', 'emergency', 'spectator'].includes(state.screen)) {
        state.setReconnecting(true);
        savedCode.current = state.room?.code || null;
        savedName.current = state.room?.players?.find((p) => p.id === socket.id)?.name || null;
      }
    });

    // ── Reconnect ────────────────────────────────────────────────────
    socket.on('reconnected', ({ room, role, currentRound, category }) => {
      const s = useGameStore.getState();
      s.setReconnecting(false);
      s.setRoom(room);
      s.setMyRole(role);
      s.setChosenCategory(category);
      s.setCurrentRound(currentRound);
      const challenge = getChallengeForRound(category, currentRound);
      s.setCodeLines([...challenge.code]);
      s.setTestNames(challenge.tests.map((t) => t.name));
      s.setSabotages(challenge.sabotages);
      s.setScreen('game');
    });

    socket.on('player_reconnected', ({ room }) => {
      const s = useGameStore.getState();
      s.setRoom(room);
      const lastPlayer = room.players[room.players.length - 1];
      if (lastPlayer) s.removeDisconnectedPlayer(lastPlayer.id);
    });

    socket.on('player_disconnected', ({ playerId, room }) => {
      const s = useGameStore.getState();
      s.setRoom(room);
      s.addDisconnectedPlayer(playerId);
    });

    // ── Lobby ────────────────────────────────────────────────────────
    socket.on('room_created',  ({ room }) => {
      useGameStore.getState().setRoom(room);
      useGameStore.getState().setScreen('lobby');
    });
    socket.on('room_joined',   ({ room }) => {
      useGameStore.getState().setRoom(room);
      useGameStore.getState().setScreen('lobby');
    });
    socket.on('room_updated',  ({ room }) => useGameStore.getState().setRoom(room));
    socket.on('player_joined', ({ room }) => useGameStore.getState().setRoom(room));
    socket.on('player_left',   ({ room }) => {
      const s = useGameStore.getState();
      s.setRoom(room);
      s.setAliveCount(room.players.length);
    });

    // ── Category Vote ────────────────────────────────────────────────
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
    socket.on('vote_end',            ({ winner })  => {
      useGameStore.getState().setChosenCategory(winner);
      useGameStore.getState().setScreen('assigning');
    });

    // ── Role Reveal ──────────────────────────────────────────────────
    socket.on('role_assigned', ({ role }) => {
      useGameStore.getState().setMyRole(role);
      useGameStore.getState().setScreen('role_reveal');
    });

    // ── Game Start / Rounds ──────────────────────────────────────────
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

    socket.on('game_start', ({ category, round }) => {
      const s = useGameStore.getState();
      loadRound(category, round);
      s.setAliveCount(s.room?.players?.length || 0);
      s.setDisconnectedPlayerIds([]);
      s.setScreen('game');
    });

    socket.on('round_start', ({ round }) => {
      const s = useGameStore.getState();
      loadRound(s.chosenCategory, round);
      s.setEliminatedPlayer(null);
      s.setMyPlayerVote(null);
      s.setVotingPlayers([]);
      s.setEmergencyCaller(null);
      // Keep spectators on spectator screen — only active players go back to game
      if (s.screen !== 'spectator') s.setScreen('game');
    });

    socket.on('round_tick', ({ seconds }) => useGameStore.getState().setRoundSecondsLeft(seconds));

    // ── Code Sync ────────────────────────────────────────────────────
    // All players (including spectators) receive code changes
    socket.on('code_change', ({ lineIndex, content }) => {
      useGameStore.getState().updateCodeLine(lineIndex, content);
    });

    // ── Tests ────────────────────────────────────────────────────────
    socket.on('tests_updated', ({ testsPassed, total, results }) => {
      const s = useGameStore.getState();
      s.setTestsPassed(testsPassed);
      s.setTestsTotal(total);
      if (results) s.setTestNames(results.map((r) => r.name));
    });

    // ── Sabotage ─────────────────────────────────────────────────────
    socket.on('sabotage_confirmed', ({ sabotagesDone }) => {
      useGameStore.getState().setSabotagesDone(sabotagesDone);
    });

    // ── Emergency ────────────────────────────────────────────────────
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
    socket.on('vote_recorded', () => {});

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

    // ── Eliminated → Spectator ───────────────────────────────────────
    socket.on('you_were_eliminated', () => {
      const s = useGameStore.getState();
      s.setIsSpectator(true);
      s.setScreen('spectator');
    });

    // ── Chat ─────────────────────────────────────────────────────────
    socket.on('message_received', (msg) => useGameStore.getState().addChatMessage(msg));

    // ── Game Over ─────────────────────────────────────────────────────
    // Spectators also receive game_over and get redirected
    socket.on('game_over', (data) => {
      const s = useGameStore.getState();
      s.setGameOverData(data);
      s.setIsSpectator(false);
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
        'connect', 'disconnect', 'reconnected', 'player_reconnected', 'player_disconnected',
        'room_created', 'room_joined', 'room_updated', 'player_joined', 'player_left',
        'vote_start', 'vote_tick', 'vote_counts_updated', 'vote_end',
        'role_assigned', 'game_start', 'round_start', 'round_tick',
        'code_change', 'tests_updated', 'sabotage_confirmed',
        'emergency_called', 'voting_start', 'vote_tick_player', 'vote_recorded', 'vote_result',
        'you_were_eliminated', 'message_received', 'game_over', 'game_abandoned', 'error',
      ].forEach((ev) => socket.off(ev));
    };
  }, []);
}