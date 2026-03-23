import { useEffect, useRef } from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';

function cleanLines(lines) {
  return lines.map((l) =>
    String(l)
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  );
}

export default function useSocket() {
  const savedCode = useRef(null);
  const savedName = useRef(null);

  useEffect(() => {

    socket.on('connect', () => {
      const s = useGameStore.getState();
      s.setConnected(true);
      s.setMyId(socket.id);
      if (s.reconnecting && s.rejoinInfo) {
        socket.emit('rejoin_room', s.rejoinInfo);
      }
    });

    socket.on('disconnect', () => {
      const s = useGameStore.getState();
      s.setConnected(false);
      if (['game', 'voting_players', 'emergency', 'spectator'].includes(s.screen)) {
        s.setReconnecting(true);
        const me = s.room?.players?.find((p) => p.id === socket.id);
        if (me && s.rejoinToken && s.room) {
          s.setRejoinInfo({ code: s.room.code, name: me.name, rejoinToken: s.rejoinToken });
        }
      }
    });

    // ── Rejoin ────────────────────────────────────────────────
    socket.on('rejoined', ({ room, role, category, testsPassed, currentCode, lineAuthors, secondsLeft }) => {
      const s = useGameStore.getState();
      s.setRoom(room);
      s.setMyRole(role);
      s.setChosenCategory(category);
      s.setCodeLines(cleanLines(currentCode));
      s.setLineAuthors(lineAuthors || {});
      s.setLineVersions(lineVersions || {});
      s.setTestsPassed(testsPassed || 0);
      s.setGameSecondsLeft(secondsLeft || 480);
      s.setRejoinInfo(null);
      s.setReconnecting(false);
      s.setScreen('game');
    });

    socket.on('rejoin_failed', ({ message }) => console.warn('Rejoin failed:', message));
    socket.on('player_rejoined', ({ room }) => useGameStore.getState().setRoom(room));
    socket.on('player_disconnected', ({ playerId, room }) => {
      const s = useGameStore.getState();
      s.setRoom(room);
      s.addDisconnectedPlayer(playerId);
    });

    socket.on('you_were_kicked', () => {
      const s = useGameStore.getState();
      s.resetGame();
      s.setScreen('kicked');
    });

    // ── Lobby ─────────────────────────────────────────────────
    socket.on('room_created', ({ room, rejoinToken }) => {
      const s = useGameStore.getState();
      s.setRoom(room);
      if (rejoinToken) s.setRejoinToken(rejoinToken);
      s.setScreen('lobby');
    });

    socket.on('room_joined', ({ room, rejoinToken }) => {
      const s = useGameStore.getState();
      s.setRoom(room);
      if (rejoinToken) s.setRejoinToken(rejoinToken);
      s.setScreen('lobby');
    });

    socket.on('room_updated',  ({ room }) => useGameStore.getState().setRoom(room));
    socket.on('player_joined', ({ room }) => useGameStore.getState().setRoom(room));
    socket.on('player_left',   ({ room }) => {
      const s = useGameStore.getState();
      s.setRoom(room);
      s.setAliveCount(room.players.length);
    });

    socket.on('settings_updated', ({ settings }) => {
      const s = useGameStore.getState();
      if (s.room) s.setRoom({ ...s.room, settings });
    });

    socket.on('spectating', ({ room }) => {
      const s = useGameStore.getState();
      s.setRoom(room);
      s.setIsSpectator(true);
      s.setScreen('spectator');
    });

    socket.on('spectator_joined', ({ spectatorCount }) => {
      const s = useGameStore.getState();
      if (s.room) s.setRoom({ ...s.room, spectatorCount });
    });

    socket.on('spectator_left', ({ spectatorCount }) => {
      const s = useGameStore.getState();
      if (s.room) s.setRoom({ ...s.room, spectatorCount });
    });

    // ── Category Vote ─────────────────────────────────────────
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

    // ── Role Reveal ───────────────────────────────────────────
    socket.on('role_assigned', ({ role, impostorGoals, sabotageHints, sabotagePowers }) => {
      const s = useGameStore.getState();
      s.setMyRole(role);
      s.setImpostorGoals(impostorGoals || []);
      s.setSabotageHints(sabotageHints || []);
      s.setSabotagePowers(sabotagePowers || []);
      s.setScreen('role_reveal');
    });

    // ── Game Start ────────────────────────────────────────────
    socket.on('game_start', ({ category, code, lineVersions, duration, sections, testNames, settings, language, title, description, fixHints }) => {
      const s = useGameStore.getState();
      s.setChosenCategory(category);
      s.setCodeLines(cleanLines(code));
      s.setLineAuthors({});
      s.setLineVersions(lineVersions || {});
      s.setGameSecondsLeft(duration || 480);
      s.setTestsPassed(0);
      s.setMaxTestsPassed(0);
      s.setTestsTotal(testNames?.length || 9);
      s.setTestResults((testNames || []).map((t) => ({ name: t.name, section: t.section, passed: false })));
      s.setGameSections(sections || []);
      s.setGameLanguage(language || 'python');
      s.setGameTitle(title || '');
      s.setGameDescription(description || '');
      s.setFixHints(fixHints || []);
      s.setAliveCount(s.room?.players?.length || 0);
      s.setDisconnectedPlayerIds([]);
      if (settings && s.room) s.setRoom({ ...s.room, settings });
      s.setScreen('game');
    });

    // ── Game Timer ────────────────────────────────────────────
    socket.on('game_tick', ({ seconds }) => {
      useGameStore.getState().setGameSecondsLeft(seconds);
    });

    // ── Game Resumed (after vote) ─────────────────────────────
    socket.on('game_resumed', ({ secondsLeft }) => {
      const s = useGameStore.getState();
      s.setGameSecondsLeft(secondsLeft);
      s.setEliminatedPlayer(null);
      s.setMyPlayerVote(null);
      s.setVotingPlayers([]);
      s.setEmergencyCaller(null);
      if (s.screen !== 'spectator') s.setScreen('game');
    });

    // ── Code Sync ─────────────────────────────────────────────
    socket.on('code_change', ({ lineIndex, content, version, author }) => {
      const s = useGameStore.getState();
      const clean = String(content || '').replace(/<[^>]*>/g, '');
      s.updateCodeLine(lineIndex, clean);
      if (author) s.updateLineAuthor(lineIndex, author);
      if (typeof version === 'number') s.updateLineVersion(lineIndex, version);
    });

    // Server rejected an edit — apply its authoritative version
    socket.on('code_reject', ({ lineIndex, content, version }) => {
      const s = useGameStore.getState();
      const clean = String(content || '').replace(/<[^>]*>/g, '');
      s.updateCodeLine(lineIndex, clean);
      if (typeof version === 'number') s.updateLineVersion(lineIndex, version);
      // CodeEditor will react to the codeLines change via its useEffect
    });

    // Periodic full-state resync — safety net against drift
    socket.on('code_sync', ({ lines, versions, lineAuthors }) => {
      const s = useGameStore.getState();
      const currentLines = s.codeLines;
      let anyDrift = false;
      const newLines = [...currentLines];

      (lines || []).forEach((serverLine, i) => {
        const serverVer = versions?.[i] || 0;
        const clientVer = s.lineVersions?.[i] || 0;
        // Only apply if server has a newer version (client is behind)
        if (serverVer > clientVer) {
          newLines[i] = String(serverLine || '').replace(/<[^>]*>/g, '');
          anyDrift = true;
        }
      });

      if (anyDrift) {
        s.setCodeLines(newLines);
        s.setLineVersions({ ...s.lineVersions, ...versions });
      }
      if (lineAuthors) s.setLineAuthors(lineAuthors);
    });

    // Acknowledge own accepted edit — update local version
    socket.on('code_accepted', ({ lineIndex, version }) => {
      if (typeof version === 'number') {
        useGameStore.getState().updateLineVersion(lineIndex, version);
      }
    });

    // ── Tests ─────────────────────────────────────────────────
    socket.on('tests_updated', ({ testsPassed, maxPassed, total, results }) => {
      const s = useGameStore.getState();
      s.setTestsPassed(testsPassed);
      if (maxPassed !== undefined) s.setMaxTestsPassed(maxPassed);
      s.setTestsTotal(total);
      if (results) s.setTestResults(results);
    });

    // ── Live Cursor Presence ──────────────────────────────────
    socket.on('cursors_updated', ({ cursors }) => {
      const s = useGameStore.getState();
      const current = s.remoteCursors.filter(
        (c) => !cursors.some((nc) => nc.playerId === c.playerId)
      );
      s.setRemoteCursors([...current, ...cursors]);
    });

    // ── Standup / Emergency ───────────────────────────────────
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

    socket.on('vote_tick_player', ({ seconds }) => useGameStore.getState().setVoteSecondsLeftPlayer(seconds));
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

    socket.on('you_were_eliminated', () => {
      const s = useGameStore.getState();
      s.setIsSpectator(true);
      s.setScreen('spectator');
    });

    // ── Countdown ─────────────────────────────────────────────
    socket.on('countdown_start',     ({ count }) => useGameStore.getState().setCountdown(count));
    socket.on('countdown_tick',      ({ count }) => useGameStore.getState().setCountdown(count));
    socket.on('countdown_cancelled', ({ room })  => {
      const s = useGameStore.getState();
      s.setCountdown(null);
      s.setRoom(room);
    });

    // ── Chat ──────────────────────────────────────────────────
    socket.on('message_received', (msg) => useGameStore.getState().addChatMessage(msg));
    socket.on('public_rooms',     ({ rooms }) => useGameStore.getState().setPublicRooms(rooms));

    // ── Game Over ─────────────────────────────────────────────
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

    // ── Sabotage Events ───────────────────────────────────────
    socket.on('sabotage_activated', ({ type, duration, question, options, offset }) => {
      const s = useGameStore.getState();
      s.setActiveSabotage({ type, duration, endsAt: Date.now() + duration });
      if (type === 'quiz' && question) {
        s.setQuizData({ question, options, duration });
        s.setQuizResult(null);
      }
      if (type === 'shuffle' && offset !== undefined) {
        s.setShuffleOffset(offset);
      }
    });

    socket.on('sabotage_ended', ({ type }) => {
      const s = useGameStore.getState();
      s.setActiveSabotage(null);
      if (type === 'quiz') s.setQuizData(null);
      if (type === 'shuffle') s.setShuffleOffset(0);
    });

    socket.on('sabotage_cooldowns', (cooldowns) => {
      useGameStore.getState().setSabotageCooldowns(cooldowns);
    });

    socket.on('sabotage_error', ({ message }) => {
      console.warn('Sabotage error:', message);
    });

    socket.on('quiz_result', ({ correct, correctIndex }) => {
      useGameStore.getState().setQuizResult({ correct, correctIndex });
    });

    socket.on('quiz_penalty', ({ wrongCount, totalPenalty, newSecondsLeft }) => {
      const s = useGameStore.getState();
      s.setQuizPenalty({ wrongCount, totalPenalty });
      s.setGameSecondsLeft(newSecondsLeft);
      // Clear penalty display after 3s
      setTimeout(() => useGameStore.getState().setQuizPenalty(null), 3000);
    });

    socket.on('activity_feed_update', ({ feed }) => {
      useGameStore.getState().setActivityFeed(feed || []);
    });

    socket.on('sus_marked', ({ fromId, targetId }) => {
      useGameStore.getState().addSusMark({ fromId, targetId });
    });

    return () => {
      [
        'connect', 'disconnect',
        'room_created', 'room_joined', 'room_updated', 'player_joined', 'player_left',
        'rejoined', 'rejoin_failed', 'player_rejoined', 'you_were_kicked',
        'player_disconnected', 'settings_updated',
        'spectating', 'spectator_joined', 'spectator_left',
        'vote_start', 'vote_tick', 'vote_counts_updated', 'vote_end',
        'role_assigned', 'game_start', 'game_tick', 'game_resumed',
        'code_change', 'tests_updated',
        'emergency_called', 'voting_start', 'vote_tick_player',
        'vote_recorded', 'vote_result', 'you_were_eliminated',
        'countdown_start', 'countdown_tick', 'countdown_cancelled',
        'public_rooms', 'message_received', 'game_over', 'game_abandoned', 'error',
        'sabotage_activated', 'sabotage_ended', 'sabotage_cooldowns', 'sabotage_error',
        'quiz_result', 'quiz_penalty', 'activity_feed_update', 'sus_marked',
        'code_reject', 'code_sync', 'code_accepted',
      ].forEach((ev) => socket.off(ev));
    };
  }, []);
}