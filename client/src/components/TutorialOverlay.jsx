import React, { useEffect, useState, useCallback } from 'react';
import useTutorialStore from '../store/tutorialStore';

/* ── Styles ─────────────────────────────────────────────────────────────── */
const OVERLAY_BG = 'rgba(0,0,0,0.72)';
const ACCENT     = '#f5a623';
const ACCENT_DARK = '#8b5e00';
const PINK       = '#e94fa0';
const FONT_TITLE = "'Press Start 2P', monospace";
const FONT_BODY  = "'VT323', monospace";

function getTargetRect(target) {
  if (!target) return null;
  const el = document.querySelector(`[data-tutorial="${target}"]`);
  if (!el) return null;
  return el.getBoundingClientRect();
}

/* ── Spotlight mask ─────────────────────────────────────────────────────── */
function SpotlightMask({ rect }) {
  if (!rect) return <div style={{ position: 'fixed', inset: 0, background: OVERLAY_BG, zIndex: 9998 }} />;

  const pad = 8;
  const x = rect.left - pad;
  const y = rect.top - pad;
  const w = rect.width + pad * 2;
  const h = rect.height + pad * 2;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      // Giant box-shadow trick: covers everything except the spotlight hole
      boxShadow: `0 0 0 99999px ${OVERLAY_BG}`,
      left: x, top: y, width: w, height: h,
      borderRadius: 8,
      pointerEvents: 'none',
    }} />
  );
}

/* ── Tooltip ────────────────────────────────────────────────────────────── */
function Tooltip({ step, rect, onNext, onSkip, isLast, stepIndex, totalSteps }) {
  const [pos, setPos] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });

  useEffect(() => {
    if (!rect || step.position === 'center') {
      setPos({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }
    const gap = 16;
    const tooltip = { width: 340, height: 200 };
    let top, left, transform = '';

    switch (step.position) {
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
        break;
      case 'top':
        top = rect.top - gap - tooltip.height;
        left = rect.left + rect.width / 2;
        transform = 'translateX(-50%)';
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + gap;
        transform = 'translateY(-50%)';
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - gap - tooltip.width;
        transform = 'translateY(-50%)';
        break;
      default:
        top = '50%'; left = '50%'; transform = 'translate(-50%, -50%)';
    }

    // Clamp to viewport
    if (typeof top === 'number') {
      top = Math.max(12, Math.min(window.innerHeight - tooltip.height - 12, top));
    }
    if (typeof left === 'number') {
      left = Math.max(12, Math.min(window.innerWidth - tooltip.width - 12, left));
    }

    setPos({ top, left, transform });
  }, [rect, step.position]);

  return (
    <div style={{
      position: 'fixed', zIndex: 10000,
      top: pos.top, left: pos.left, transform: pos.transform,
      width: 340, maxWidth: 'calc(100vw - 24px)',
      background: '#1a1a2e', border: `3px solid ${ACCENT}`,
      boxShadow: `4px 4px 0 ${ACCENT_DARK}, 0 0 40px ${ACCENT}44`,
      padding: '18px 20px', animation: 'tutorialPop 0.3s ease-out',
    }}>
      {/* Step counter */}
      <div style={{
        fontFamily: FONT_BODY, fontSize: 16, color: '#888',
        marginBottom: 6, letterSpacing: 2,
      }}>
        STEP {stepIndex} / {totalSteps}
      </div>

      {/* Title */}
      <div style={{
        fontFamily: FONT_TITLE, fontSize: 11, color: PINK,
        marginBottom: 10, letterSpacing: 1,
      }}>
        {step.title}
      </div>

      {/* Message */}
      <div style={{
        fontFamily: FONT_BODY, fontSize: 20, color: '#ddd',
        lineHeight: 1.4, marginBottom: 18,
      }}>
        {step.message}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
        <button onClick={onSkip} style={{
          fontFamily: FONT_TITLE, fontSize: 8, padding: '8px 14px',
          background: 'transparent', color: '#666', border: '2px solid #333',
          cursor: 'pointer', letterSpacing: 1,
        }}>
          SKIP
        </button>
        <button onClick={onNext} style={{
          fontFamily: FONT_TITLE, fontSize: 9, padding: '8px 20px',
          background: ACCENT, color: '#fff', border: `2px solid ${ACCENT_DARK}`,
          boxShadow: `3px 3px 0 ${ACCENT_DARK}`,
          cursor: 'pointer', letterSpacing: 1,
        }}>
          {isLast ? "LET'S GO! 🚀" : 'NEXT →'}
        </button>
      </div>

      <style>{`
        @keyframes tutorialPop {
          0% { transform: ${pos.transform} scale(0.85); opacity: 0; }
          100% { transform: ${pos.transform} scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ── Click blocker (prevents interacting with anything behind the overlay) ── */
function ClickBlocker({ rect }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9997,
        cursor: 'default',
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

/* ── Main TutorialOverlay ──────────────────────────────────────────────── */
export default function TutorialOverlay() {
  const isTutorial    = useTutorialStore((s) => s.isTutorial);
  const tutorialStep  = useTutorialStore((s) => s.tutorialStep);
  const steps         = useTutorialStore((s) => s.steps);
  const nextStep      = useTutorialStore((s) => s.nextStep);
  const skipTutorial  = useTutorialStore((s) => s.skipTutorial);

  const [rect, setRect] = useState(null);

  const currentStep = steps[tutorialStep - 1];

  const updateRect = useCallback(() => {
    if (!currentStep) return;
    const r = getTargetRect(currentStep.target);
    setRect(r);
  }, [currentStep]);

  useEffect(() => {
    updateRect();
    window.addEventListener('resize', updateRect);
    // Re-check in case DOM hasn't rendered yet
    const timer = setTimeout(updateRect, 200);
    return () => {
      window.removeEventListener('resize', updateRect);
      clearTimeout(timer);
    };
  }, [updateRect, tutorialStep]);

  if (!isTutorial || tutorialStep === 0 || !currentStep) return null;

  const isLast = tutorialStep >= steps.length;

  return (
    <>
      <ClickBlocker rect={rect} />
      <SpotlightMask rect={rect} />
      <Tooltip
        step={currentStep}
        rect={rect}
        onNext={isLast ? skipTutorial : nextStep}
        onSkip={skipTutorial}
        isLast={isLast}
        stepIndex={tutorialStep}
        totalSteps={steps.length}
      />
    </>
  );
}
