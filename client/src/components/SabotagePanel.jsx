import React, { useState, useEffect } from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';

export default function SabotagePanel() {
  const powers     = useGameStore((s) => s.sabotagePowers);
  const myRole     = useGameStore((s) => s.myRole);
  const cooldowns  = useGameStore((s) => s.sabotageCooldowns);
  const active     = useGameStore((s) => s.activeSabotage);
  const [timers, setTimers] = useState({});

  // Tick cooldown timers locally
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const next = {};
      powers.forEach((p) => {
        const cd = cooldowns[p.type];
        if (cd && !cd.ready) {
          next[p.type] = Math.max(0, Math.ceil(cd.remainingMs / 1000) - 1);
        } else {
          next[p.type] = 0;
        }
      });
      setTimers(next);
    }, 1000);
    return () => clearInterval(interval);
  }, [powers, cooldowns]);

  if (myRole !== 'impostor' || powers.length === 0) return null;

  function activate(type) {
    if (active) return; // can't stack sabotages
    socket.emit('activate_sabotage', { type });
  }

  return (
    <div className="sabotage-panel">
      <div className="sabotage-panel-title">⚡ SABOTAGE</div>
      {powers.map((p) => {
        const onCooldown = timers[p.type] > 0;
        const isActive = active?.type === p.type;
        return (
          <button
            key={p.type}
            className={`sabotage-btn${isActive ? ' active' : ''}${onCooldown ? ' on-cooldown' : ''}`}
            onClick={() => !onCooldown && !isActive && activate(p.type)}
            disabled={onCooldown || !!active}
            title={p.desc}
          >
            <span className="sabotage-icon">{p.icon}</span>
            <span className="sabotage-name">{p.name}</span>
            {onCooldown && (
              <span className="sabotage-cooldown">{timers[p.type]}s</span>
            )}
            {isActive && (
              <span className="sabotage-active-badge">ACTIVE</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
