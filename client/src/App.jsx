// client/src/App.jsx

import React from 'react';
import useSocket from './hooks/useSocket';
import useGameStore from './store/gameStore';

import MenuScreen from './screens/MenuScreen';
import CreateScreen from './screens/CreateScreen';
import JoinScreen from './screens/JoinScreen';
import LobbyScreen from './screens/LobbyScreen';
import VoteCategoryScreen from './screens/VoteCategoryScreen';
import AssigningScreen from './screens/AssigningScreen';
import RoleRevealScreen from './screens/RoleRevealScreen';
import GameScreen from './screens/GameScreen';
import SpectatorScreen from './screens/SpectatorScreen';
import GameOverScreen from './screens/GameOverScreen';

function SkyBackground() {
  return (
    <>
      <div className="sky" />
      <div className="cloud cloud-1" />
      <div className="cloud cloud-2" />
      <div className="cloud cloud-3" />
      <div className="cloud cloud-4" />
      <div className="cloud cloud-5" />
      <div className="ground" />
    </>
  );
}

function ReconnectingOverlay() {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0a0a1aee',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', zIndex: 999, gap: 16,
    }}>
      <div style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: 18,
        color: '#f5a623', letterSpacing: 2, animation: 'pulse 1.2s ease-in-out infinite',
      }}>
        RECONNECTING...
      </div>
      <div style={{
        fontFamily: "'VT323', monospace", fontSize: 20, color: '#aaa', letterSpacing: 2,
      }}>
        Please wait up to 15 seconds
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}

const SKY_SCREENS = ['menu', 'create', 'join', 'lobby', 'vote_category', 'game_over'];

export default function App() {
  useSocket();
  const screen       = useGameStore((s) => s.screen);
  const reconnecting = useGameStore((s) => s.reconnecting);
  const connected    = useGameStore((s) => s.connected);

  const showSky              = SKY_SCREENS.includes(screen);
  const showReconnectOverlay = reconnecting && !connected;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {showSky && <SkyBackground />}

      {screen === 'menu'          && <MenuScreen />}
      {screen === 'create'        && <CreateScreen />}
      {screen === 'join'          && <JoinScreen />}
      {screen === 'lobby'         && <LobbyScreen />}
      {screen === 'vote_category' && <VoteCategoryScreen />}
      {screen === 'assigning'     && <AssigningScreen />}
      {screen === 'role_reveal'   && <RoleRevealScreen />}
      {screen === 'game'          && <GameScreen />}
      {screen === 'spectator'     && <SpectatorScreen />}
      {screen === 'game_over'     && <GameOverScreen />}

      {showReconnectOverlay && <ReconnectingOverlay />}
    </div>
  );
}