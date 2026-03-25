import { create } from 'zustand';

const TUTORIAL_STEPS = [
  {
    target: 'topbar',
    title: 'YOUR HUD',
    message: 'This bar shows the timer, tests passed, and how many players are alive. Keep an eye on it!',
    position: 'bottom',
  },
  {
    target: 'sidebar',
    title: 'BUG LIST & HINTS',
    message: 'These are the bugged tests you need to fix. Click the 💡 hint buttons for clues on each bug.',
    position: 'right',
  },
  {
    target: 'editor',
    title: 'CODE EDITOR',
    message: 'Edit the code here to fix bugs. Your changes sync with all players in real-time. Each line shows who last edited it.',
    position: 'left',
  },
  {
    target: 'runtests',
    title: 'RUN TESTS',
    message: 'Click this button to check if your fixes work. Tests that pass turn green in the sidebar!',
    position: 'top',
  },
  {
    target: 'chat',
    title: 'TEAM CHAT',
    message: 'Discuss with teammates who you think the impostor is. Watch for suspicious behavior!',
    position: 'left',
  },
  {
    target: 'standup',
    title: 'CALL STANDUP',
    message: 'Suspect someone? Call a STANDUP to start a vote. If the team agrees, the suspect gets ejected!',
    position: 'top',
  },
  {
    target: null,
    title: 'YOU\'RE READY!',
    message: 'Fix bugs, watch for sabotage, find the impostor. Good luck, developer! 🚀',
    position: 'center',
  },
];

const useTutorialStore = create((set, get) => ({
  isTutorial: false,
  tutorialStep: 0, // 0 = not started, 1-7 = active steps
  hasCompletedTutorial: localStorage.getItem('cm_tutorial_done') === 'true',
  steps: TUTORIAL_STEPS,

  startTutorial: () => set({ isTutorial: true, tutorialStep: 1 }),

  nextStep: () => {
    const { tutorialStep } = get();
    if (tutorialStep >= TUTORIAL_STEPS.length) {
      get().completeTutorial();
    } else {
      set({ tutorialStep: tutorialStep + 1 });
    }
  },

  skipTutorial: () => {
    set({ tutorialStep: 0, isTutorial: false });
    localStorage.setItem('cm_tutorial_done', 'true');
    set({ hasCompletedTutorial: true });
  },

  completeTutorial: () => {
    set({ tutorialStep: 0, isTutorial: false, hasCompletedTutorial: true });
    localStorage.setItem('cm_tutorial_done', 'true');
  },

  resetTutorial: () => set({ isTutorial: false, tutorialStep: 0 }),
}));

export default useTutorialStore;
export { TUTORIAL_STEPS };
