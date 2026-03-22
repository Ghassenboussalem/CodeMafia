import React from 'react';
import useGameStore from '../store/gameStore';

export default function RoleRevealScreen() {
  const myRole       = useGameStore((s) => s.myRole);
  const impostorGoals = useGameStore((s) => s.impostorGoals);
  const isImpostor   = myRole === 'impostor';

  return (
    <div
      className="screen-role"
      style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 10,
        background: '#0a1a12',
      }}
    >
      <div className={`role-name ${isImpostor ? 'impostor' : 'civilian'}`}>
        {isImpostor ? 'SABOTEUR' : 'DEVELOPER'}
      </div>

      <div className="role-desc">
        {isImpostor
          ? 'You are the saboteur. Edit code like you are helping.\nIntroduce subtle bugs. Stay hidden.'
          : 'You are a developer.\nFix the bugs. Watch your teammates.\nCall a standup if something looks suspicious.'}
      </div>

      {isImpostor && impostorGoals.length > 0 && (
        <div style={{
          background: '#1a0a0a', border: '2px solid #c0392b',
          padding: '14px 20px', maxWidth: 420, marginTop: 8,
          animation: 'roleFadeIn .5s ease-out 1s both',
        }}>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 8,
            color: '#c0392b', marginBottom: 10, letterSpacing: 1,
          }}>
            SUGGESTED TACTICS
          </div>
          {impostorGoals.map((goal, i) => (
            <div key={i} style={{
              fontFamily: "'VT323', monospace", fontSize: 16,
              color: '#f0a0a0', marginBottom: 6, lineHeight: 1.4,
            }}>
              💀 {goal}
            </div>
          ))}
        </div>
      )}

      <div className="role-soon">Sprint starting soon...</div>
    </div>
  );
}