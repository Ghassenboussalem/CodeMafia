import useGameStore from '../store/gameStore';

/**
 * Convenience hook that returns commonly-needed derived game state.
 * Avoids importing from gameStore directly in every component.
 */
export default function useGame() {
  const myId         = useGameStore((s) => s.myId);
  const room         = useGameStore((s) => s.room);
  const myRole       = useGameStore((s) => s.myRole);
  const screen       = useGameStore((s) => s.screen);
  const currentRound = useGameStore((s) => s.currentRound);
  const testsPassed  = useGameStore((s) => s.testsPassed);
  const testsTotal   = useGameStore((s) => s.testsTotal);
  const sabotagesDone = useGameStore((s) => s.sabotagesDone);
  const emergencyUsed = useGameStore((s) => s.emergencyUsed);
  const aliveCount   = useGameStore((s) => s.aliveCount);
  const chosenCategory = useGameStore((s) => s.chosenCategory);

  const me = room?.players?.find((p) => p.id === myId) || null;
  const isHost = room?.hostId === myId;
  const isImpostor = myRole === 'impostor';
  const isCivilian = myRole === 'civilian';
  const disconnectedPlayers = room?.disconnectedPlayers || [];

  const CHAT_ENABLED_SCREENS = ['game', 'vote_category'];
  const chatEnabled = CHAT_ENABLED_SCREENS.includes(screen);

  return {
    myId,
    room,
    myRole,
    screen,
    me,
    isHost,
    isImpostor,
    isCivilian,
    currentRound,
    testsPassed,
    testsTotal,
    sabotagesDone,
    emergencyUsed,
    aliveCount,
    chosenCategory,
    chatEnabled,
    disconnectedPlayers,
    players: room?.players || [],
  };
}
