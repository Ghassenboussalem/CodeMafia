import { create } from 'zustand';

const useGameStore = create((set) => ({
  connected: false,
  setConnected: (v) => set({ connected: v }),

  screen: 'menu',
  setScreen: (s) => set({ screen: s }),

  room: null,
  myId: null,
  setRoom: (r) => set({ room: r }),
  setMyId: (id) => set({ myId: id }),

  myRole: null,
  setMyRole: (r) => set({ myRole: r }),

  // Rejoin token — stored in memory and localStorage
  rejoinToken: null,
  setRejoinToken: (t) => {
    set({ rejoinToken: t });
    if (t) localStorage.setItem('cm_rejoin_token', t);
    else localStorage.removeItem('cm_rejoin_token');
  },

  // Rejoin info — set when disconnect detected mid-game
  rejoinInfo: null,
  setRejoinInfo: (info) => set({ rejoinInfo: info }),

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

  currentRound: 1,
  roundSecondsLeft: 60,
  testsPassed: 0,
  testsTotal: 3,
  testNames: [],
  sabotagesDone: 0,
  sabotages: [],
  aliveCount: 0,
  codeLines: [],
  setCurrentRound: (r) => set({ currentRound: r }),
  setRoundSecondsLeft: (s) => set({ roundSecondsLeft: s }),
  setTestsPassed: (n) => set({ testsPassed: n }),
  setTestsTotal: (n) => set({ testsTotal: n }),
  setTestNames: (names) => set({ testNames: names }),
  setSabotagesDone: (n) => set({ sabotagesDone: n }),
  setSabotages: (s) => set({ sabotages: s }),
  setAliveCount: (n) => set({ aliveCount: n }),
  setCodeLines: (lines) => set({ codeLines: lines }),
  updateCodeLine: (idx, content) => set((state) => {
    const lines = [...state.codeLines];
    lines[idx] = content;
    return { codeLines: lines };
  }),

  editedLines: new Set(),
  markLineEdited: (idx) => set((state) => ({
    editedLines: new Set([...state.editedLines, idx]),
  })),
  clearEditedLines: () => set({ editedLines: new Set() }),

  emergencyUsed: false,
  emergencyCaller: null,
  setEmergencyUsed: (v) => set({ emergencyUsed: v }),
  setEmergencyCaller: (n) => set({ emergencyCaller: n }),

  votingPlayers: [],
  voteSecondsLeftPlayer: 30,
  myPlayerVote: null,
  eliminatedPlayer: null,
  setVotingPlayers: (p) => set({ votingPlayers: p }),
  setVoteSecondsLeftPlayer: (s) => set({ voteSecondsLeftPlayer: s }),
  setMyPlayerVote: (v) => set({ myPlayerVote: v }),
  setEliminatedPlayer: (p) => set({ eliminatedPlayer: p }),

  chatLog: [],
  addChatMessage: (msg) => set((state) => ({ chatLog: [...state.chatLog, msg] })),
  clearChat: () => set({ chatLog: [] }),

  gameOverData: null,
  setGameOverData: (d) => set({ gameOverData: d }),

  reconnecting: false,
  setReconnecting: (v) => set({ reconnecting: v }),

  isSpectator: false,
  setIsSpectator: (v) => set({ isSpectator: v }),

  disconnectedPlayerIds: [],
  setDisconnectedPlayerIds: (ids) => set({ disconnectedPlayerIds: ids }),
  addDisconnectedPlayer: (id) => set((s) => ({
    disconnectedPlayerIds: [...new Set([...s.disconnectedPlayerIds, id])],
  })),
  removeDisconnectedPlayer: (id) => set((s) => ({
    disconnectedPlayerIds: s.disconnectedPlayerIds.filter((x) => x !== id),
  })),
  // ── Public rooms (server browser) ─────────────────────────────────────
  publicRooms: [],
  setPublicRooms: (rooms) => set({ publicRooms: rooms }),

  // ── Game settings (received at game_start) ────────────────────────────
  gameSettings: null,
  setGameSettings: (s) => set({ gameSettings: s }),
  resetGame: () => set({
    myRole: null,
    rejoinToken: null,
    rejoinInfo: null,
    categories: [],
    categoryVoteCounts: {},
    myVote: null,
    chosenCategory: null,
    currentRound: 1,
    roundSecondsLeft: 60,
    testsPassed: 0,
    testsTotal: 3,
    testNames: [],
    sabotagesDone: 0,
    sabotages: [],
    aliveCount: 0,
    codeLines: [],
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
    publicRooms: [],
    gameSettings: null,
  }),
}));

export default useGameStore;