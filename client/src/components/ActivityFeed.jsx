import React from 'react';
import useGameStore from '../store/gameStore';

export default function ActivityFeed() {
  const feed = useGameStore((s) => s.activityFeed);

  if (feed.length === 0) return null;

  // Show last 8 events (newest first)
  const recent = [...feed].reverse().slice(0, 8);

  function renderEvent(ev, i) {
    switch (ev.type) {
      case 'edit':
        return (
          <div key={i} className="feed-item feed-edit">
            <span className="feed-dot" style={{ background: ev.playerColor }} />
            <span className="feed-text">
              edited line {ev.lineIndex + 1}
            </span>
          </div>
        );

      case 'test_broke':
        return (
          <div key={i} className="feed-item feed-broke">
            <span className="feed-dot feed-dot-warn" />
            <span className="feed-text">
              ⚠️ <strong>{ev.testName}</strong> BROKE
              <span className="feed-blame" style={{ color: ev.lastEditorColor }}>
                — last edit: ■
              </span>
            </span>
          </div>
        );

      case 'test_fixed':
        return (
          <div key={i} className="feed-item feed-fixed">
            <span className="feed-dot feed-dot-ok" />
            <span className="feed-text">
              ✅ <strong>{ev.testName}</strong> fixed
            </span>
          </div>
        );

      case 'sabotage':
        return (
          <div key={i} className="feed-item feed-sabotage">
            <span className="feed-text">{ev.text}</span>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="activity-feed">
      <div className="activity-feed-title">Activity Log</div>
      {recent.map(renderEvent)}
    </div>
  );
}
