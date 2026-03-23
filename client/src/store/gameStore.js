import { create } from 'zustand';

const useGameStore = create((set) => ({
  // ── Connection ────────────────────────────────────────────
  connected: false,
  setConnected: (v) => set({ connected: v }),

  // ── Screen ────────────────────────────────────────────────
  screen: 'menu',
  setScreen: (s) => set({ screen: s }),

  // ── Room & Players ────────────────────────────────────────
  room: null,
  myId: null,
  myRole: null,
  myCharacter: { suitColor: '#e74c3c', visorColor: '#cce8ff', hat: 'none' },
  setRoom: (r) => set({ room: r }),
  setMyId: (id) => set({ myId: id }),
  setMyRole: (r) => set({ myRole: r }),
  setMyCharacter: (c) => set({ myCharacter: c }),

  // ── Role ──────────────────────────────────────────────────
  impostorGoals: [],
  setImpostorGoals: (g) => set({ impostorGoals: g }),

  // ── Rejoin ────────────────────────────────────────────────
  rejoinToken: null,
  rejoinInfo: null,
  setRejoinToken: (t) => {
    set({ rejoinToken: t });
    if (t) localStorage.setItem('cm_rejoin_token', t);
    else localStorage.removeItem('cm_rejoin_token');
  },
  setRejoinInfo: (info) => set({ rejoinInfo: info }),

  // ── Category Vote ─────────────────────────────────────────
  categories: [],
  categoryVoteCounts: {},
  voteSecondsLeft: 15,
  myVote: null,
  chosenCategory: null,
  setCategories: (cats) => set({ categories: cats }),
  setCategoryVoteCounts: (counts) => set({ categoryVoteCounts: counts }),
  setVoteSecondsLeft: (s) => set({ voteSecondsLeft: s }),
  setMyVote: (v) => set({ myVote: v }),
  setChosenCategory: (c) => set({ chosenCategory: c }),

  // ── Game ──────────────────────────────────────────────────
  gameSecondsLeft: 480,
  testsPassed: 0,
  maxTestsPassed: 0,
  testsTotal: 9,
  testResults: [],
  aliveCount: 0,
  codeLines: [],
  lineAuthors: {},        // lineIndex → { playerId, color, colorName }
  gameLanguage: 'python',
  gameTitle: '',
  gameDescription: '',
  gameSections: [],
  fixHints: [],           // [{ testName, line, hint, code }] — civilians only
  sabotageHints: [],      // [{ testName, line, hint, code }] — impostor only
  remoteCursors: [],      // [{ playerId, lineIndex, col, color, colorName }]

  // ── Sabotage System ───────────────────────────────────────────
  sabotagePowers: [],     // [{ type, name, icon, cooldown, duration, desc }]
  activeSabotage: null,   // { type, duration, endsAt } or null
  shuffleOffset: 0,       // line number offset during shuffle
  sabotageCooldowns: {},   // { lights_out: { ready, remainingMs }, ... }
  quizData: null,         // { question, options, duration } or null
  quizResult: null,       // { correct, correctIndex } or null
  quizPenalty: null,      // { wrongCount, totalPenalty } or null
  activityFeed: [],       // [{ ts, type, ... }]
  susMarks: [],           // [{ fromId, targetId }]

  setGameSecondsLeft: (s) => set({ gameSecondsLeft: s }),
  setTestsPassed: (n) => set({ testsPassed: n }),
  setMaxTestsPassed: (n) => set({ maxTestsPassed: n }),
  setTestsTotal: (n) => set({ testsTotal: n }),
  setTestResults: (r) => set({ testResults: r }),
  setAliveCount: (n) => set({ aliveCount: n }),
  setCodeLines: (lines) => set({ codeLines: lines }),
  setLineAuthors: (a) => set({ lineAuthors: a }),
  updateLineAuthor: (idx, author) => set((s) => ({
    lineAuthors: { ...s.lineAuthors, [idx]: author },
  })),
  updateCodeLine: (idx, content) => set((s) => {
    const lines = [...s.codeLines];
    lines[idx] = content;
    return { codeLines: lines };
  }),
  setGameLanguage: (l) => set({ gameLanguage: l }),
  setGameTitle: (t) => set({ gameTitle: t }),
  setGameDescription: (d) => set({ gameDescription: d }),
  setGameSections: (s) => set({ gameSections: s }),
  setFixHints: (h) => set({ fixHints: h }),
  setSabotageHints: (h) => set({ sabotageHints: h }),
  setRemoteCursors: (c) => set({ remoteCursors: c }),
  setSabotagePowers: (p) => set({ sabotagePowers: p }),
  setActiveSabotage: (s) => set({ activeSabotage: s }),
  setShuffleOffset: (o) => set({ shuffleOffset: o }),
  setSabotageCooldowns: (c) => set({ sabotageCooldowns: c }),
  setQuizData: (q) => set({ quizData: q }),
  setQuizResult: (r) => set({ quizResult: r }),
  setQuizPenalty: (p) => set({ quizPenalty: p }),
  setActivityFeed: (f) => set({ activityFeed: f }),
  addSusMark: (mark) => set((s) => ({ susMarks: [...s.susMarks, mark] })),
  clearSusMarks: () => set({ susMarks: [] }),

  editedLines: new Set(),
  markLineEdited: (idx) => set((s) => ({
    editedLines: new Set([...s.editedLines, idx]),
  })),
  clearEditedLines: () => set({ editedLines: new Set() }),

  // ── Emergency / Standup ───────────────────────────────────
  emergencyUsed: false,
  emergencyCaller: null,
  setEmergencyUsed: (v) => set({ emergencyUsed: v }),
  setEmergencyCaller: (n) => set({ emergencyCaller: n }),

  // ── Voting ────────────────────────────────────────────────
  votingPlayers: [],
  voteSecondsLeftPlayer: 30,
  myPlayerVote: null,
  eliminatedPlayer: null,
  setVotingPlayers: (p) => set({ votingPlayers: p }),
  setVoteSecondsLeftPlayer: (s) => set({ voteSecondsLeftPlayer: s }),
  setMyPlayerVote: (v) => set({ myPlayerVote: v }),
  setEliminatedPlayer: (p) => set({ eliminatedPlayer: p }),

  // ── Chat ──────────────────────────────────────────────────
  chatLog: [],
  addChatMessage: (msg) => set((s) => ({ chatLog: [...s.chatLog, msg] })),

  // ── Game Over ─────────────────────────────────────────────
  gameOverData: null,
  setGameOverData: (d) => set({ gameOverData: d }),

  // ── Reconnect ─────────────────────────────────────────────
  reconnecting: false,
  setReconnecting: (v) => set({ reconnecting: v }),

  // ── Spectator ─────────────────────────────────────────────
  isSpectator: false,
  setIsSpectator: (v) => set({ isSpectator: v }),

  // ── Disconnected ──────────────────────────────────────────
  disconnectedPlayerIds: [],
  setDisconnectedPlayerIds: (ids) => set({ disconnectedPlayerIds: ids }),
  addDisconnectedPlayer: (id) => set((s) => ({
    disconnectedPlayerIds: [...new Set([...s.disconnectedPlayerIds, id])],
  })),
  removeDisconnectedPlayer: (id) => set((s) => ({
    disconnectedPlayerIds: s.disconnectedPlayerIds.filter((x) => x !== id),
  })),

  // ── Countdown ─────────────────────────────────────────────
  countdown: null,
  setCountdown: (v) => set({ countdown: v }),

  // ── Public rooms ──────────────────────────────────────────
  publicRooms: [],
  setPublicRooms: (rooms) => set({ publicRooms: rooms }),

  // ── Reset ─────────────────────────────────────────────────
  resetGame: () => set({
    myRole: null,
    impostorGoals: [],
    rejoinToken: null,
    rejoinInfo: null,
    categories: [],
    categoryVoteCounts: {},
    myVote: null,
    chosenCategory: null,
    gameSecondsLeft: 480,
    testsPassed: 0,
    maxTestsPassed: 0,
    testsTotal: 9,
    testResults: [],
    aliveCount: 0,
    codeLines: [],
    lineAuthors: {},
    gameLanguage: 'python',
    gameTitle: '',
    gameDescription: '',
    gameSections: [],
    fixHints: [],
    sabotageHints: [],
    editedLines: new Set(),
    emergencyUsed: false,
    emergencyCaller: null,
    votingPlayers: [],
    myPlayerVote: null,
    eliminatedPlayer: null,
    chatLog: [],
    gameOverData: null,
    reconnecting: false,
    isSpectator: false,
    disconnectedPlayerIds: [],
    countdown: null,
    sabotagePowers: [],
    activeSabotage: null,
    shuffleOffset: 0,
    sabotageCooldowns: {},
    quizData: null,
    quizResult: null,
    quizPenalty: null,
    activityFeed: [],
    susMarks: [],
  }),
}));

export default useGameStore;