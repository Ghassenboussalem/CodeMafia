import React from 'react';
import useGameStore from '../store/gameStore';

export default function RoleRevealScreen() {
  const myRole = useGameStore((s) => s.myRole);
  const isImpostor = myRole === 'impostor';

  return (
    <div
      className="screen-role"
      style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, zIndex:10 }}
    >
      <div className={`role-name ${isImpostor ? 'impostor' : 'civilian'}`}>
        {isImpostor ? 'IMPOSTOR' : 'CIVILIAN'}
      </div>
      <div className="role-desc">
        {isImpostor
          ? 'Sabotage the code without\ngetting caught! Make the code\nfail by round 4.'
          : 'Fix the bugs and complete the\ncode before round 4 ends!'}
      </div>
      <div className="role-soon">Game starting soon...</div>
    </div>
  );
}
