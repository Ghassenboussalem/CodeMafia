import React from 'react';
import socket from '../socket';
import useGameStore from '../store/gameStore';

export default function EmergencyButton() {
  const emergencyUsed   = useGameStore((s) => s.emergencyUsed);
  const setEmergencyUsed = useGameStore((s) => s.setEmergencyUsed);

  if (emergencyUsed) return null;

  function handleClick() {
    setEmergencyUsed(true);
    socket.emit('call_emergency');
  }

  return (
    <button className="emergency-btn" onClick={handleClick}>
      ⚠ EMERGENCY
    </button>
  );
}
