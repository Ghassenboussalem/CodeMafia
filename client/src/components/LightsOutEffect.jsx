import React, { useEffect, useState, useRef } from 'react';
import useGameStore from '../store/gameStore';

/**
 * LightsOutEffect — circular spotlight overlay on the code editor.
 * Civilians see a dark mask with a circular clear area tracking the mouse.
 * Impostor sees everything normally.
 */
export default function LightsOutEffect() {
  const active  = useGameStore((s) => s.activeSabotage);
  const myRole  = useGameStore((s) => s.myRole);
  const [pos, setPos]       = useState({ x: 0, y: 0 });
  const [timeLeft, setTimeLeft] = useState(0);
  const overlayRef = useRef(null);

  // Track mouse position relative to viewport
  useEffect(() => {
    if (!active || active.type !== 'lights_out') return;

    const handler = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    window.addEventListener('touchmove', (e) => {
      if (e.touches[0]) {
        setPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      }
    });
    return () => {
      window.removeEventListener('mousemove', handler);
    };
  }, [active]);

  // Countdown
  useEffect(() => {
    if (!active || active.type !== 'lights_out') { setTimeLeft(0); return; }
    setTimeLeft(Math.ceil(active.duration / 1000));
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);

  // Don't render for impostor or when not active
  if (!active || active.type !== 'lights_out') return null;
  if (myRole === 'impostor') return null;

  const RADIUS = 120; // px — circle radius

  return (
    <>
      {/* Dark overlay with circular cutout */}
      <div
        ref={overlayRef}
        className="lights-out-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          pointerEvents: 'none',
          background: `radial-gradient(circle ${RADIUS}px at ${pos.x}px ${pos.y}px, transparent 0%, transparent 100%, rgba(0,0,0,0.95) 100%)`,
          mask: `radial-gradient(circle ${RADIUS}px at ${pos.x}px ${pos.y}px, transparent 0%, black 100%)`,
          WebkitMask: `radial-gradient(circle ${RADIUS}px at ${pos.x}px ${pos.y}px, transparent 0%, black 100%)`,
          transition: 'mask 0.05s ease-out, -webkit-mask 0.05s ease-out',
        }}
      />
      {/* Warning banner */}
      <div className="lights-out-banner">
        <span className="lights-out-icon">⚡</span>
        LIGHTS OUT — {timeLeft}s
      </div>
    </>
  );
}
