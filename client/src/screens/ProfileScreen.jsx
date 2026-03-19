import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useGameStore from '../store/gameStore';
import { api } from '../lib/api';
import { calculateLevel, xpToNextLevel, LEVEL_THRESHOLDS } from '../lib/xp';

function XpBar({ xp, level }) {
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold    = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const progress = level >= 20
    ? 100
    : Math.round(((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100);

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#f5a623' }}>
          LVL {level}
        </span>
        <span style={{ fontFamily: "'VT323', monospace", fontSize: 16, color: '#8b7355' }}>
          {xp.toLocaleString()} XP
          {level < 20 && ` · ${xpToNextLevel(xp).toLocaleString()} to next`}
        </span>
      </div>
      <div style={{ height: 14, background: '#d4c090', border: '2px solid #8b7355', boxShadow: 'inset 2px 2px 0 #c4a840' }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #f5a623, #ffcc00)',
          transition: 'width 0.8s ease-out',
        }} />
      </div>
    </div>
  );
}

function StatBox({ label, value, color = '#4a3a20' }) {
  return (
    <div style={{
      background: '#f0d898', border: '2px solid #8b7355',
      boxShadow: '2px 2px 0 #5a4a30', padding: '10px 14px', textAlign: 'center',
    }}>
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 16, color, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontFamily: "'VT323', monospace", fontSize: 15, color: '#8b7355', letterSpacing: 1 }}>
        {label}
      </div>
    </div>
  );
}

export default function ProfileScreen() {
  const { user, xp, stats, isPro, upgradeToPro, openBillingPortal, logout, refreshProfile } = useAuth();
  const setScreen = useGameStore((s) => s.setScreen);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    refreshProfile();
    // Check if returning from Stripe
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      refreshProfile();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  async function handleUpgrade() {
    setLoading(true);
    try { await upgradeToPro(); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handlePortal() {
    setLoading(true);
    try { await openBillingPortal(); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleLogout() {
    await logout();
    setScreen('menu');
  }

  if (!user) return null;

  const level   = xp?.level || 1;
  const totalXp = xp?.xp || 0;

  return (
    <div style={{
      position: 'absolute', inset: 0, overflowY: 'auto',
      background: 'linear-gradient(180deg,#5ab0e0 0%,#7ecbee 60%,#a8dff5 100%)',
      zIndex: 10, padding: '24px 16px',
    }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="back-corner" style={{ position: 'relative', top: 'auto', left: 'auto' }}
            onClick={() => setScreen('menu')}>
            ← BACK
          </button>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 14,
            color: '#f5a623', textShadow: '3px 3px 0 #8b5e00', flex: 1, textAlign: 'center',
          }}>
            PROFILE
          </div>
        </div>

        {/* User card */}
        <div style={{
          background: '#f5e6c0', border: '4px solid #8b7355',
          boxShadow: '6px 6px 0 #5a4a30', padding: '20px 24px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            {/* Avatar */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
              border: '3px solid #8b7355', boxShadow: '3px 3px 0 #5a4a30',
              background: '#f0d898', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, flexShrink: 0,
            }}>
              {user.avatar_url
                ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : '👤'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 13, color: '#4a3a20' }}>
                  {user.username}
                </span>
                {isPro && (
                  <span style={{
                    fontFamily: "'Press Start 2P', monospace", fontSize: 8,
                    background: '#f5a623', color: '#fff',
                    padding: '3px 7px', border: '2px solid #8b5e00',
                  }}>
                    PRO
                  </span>
                )}
              </div>
              <div style={{ fontFamily: "'VT323', monospace", fontSize: 16, color: '#8b7355' }}>
                {user.email}
              </div>
              <div style={{ fontFamily: "'VT323', monospace", fontSize: 15, color: '#a09060' }}>
                {user.role} · joined {new Date(user.created_at || Date.now()).getFullYear()}
              </div>
            </div>
          </div>

          <XpBar xp={totalXp} level={level} />
        </div>

        {/* Stats grid */}
        {stats && (
          <div style={{
            background: '#f5e6c0', border: '4px solid #8b7355',
            boxShadow: '6px 6px 0 #5a4a30', padding: '16px 20px', marginBottom: 16,
          }}>
            <div style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 10,
              color: '#4a3a20', marginBottom: 14, letterSpacing: 1,
            }}>
              STATS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <StatBox label="Games Played" value={stats.games_played || 0} />
              <StatBox label="Wins" value={stats.games_won || 0} color="#27ae60" />
              <StatBox
                label="Win Rate"
                value={stats.games_played
                  ? `${Math.round(((stats.games_won || 0) / stats.games_played) * 100)}%`
                  : '—'}
                color="#f5a623"
              />
              <StatBox label="As Impostor" value={stats.times_impostor || 0} color="#c0392b" />
              <StatBox label="Tests Passed" value={stats.tests_passed || 0} color="#2980b9" />
              <StatBox label="Sabotages" value={stats.sabotages_completed || 0} color="#8e44ad" />
            </div>
          </div>
        )}

        {/* Pro upgrade / manage */}
        <div style={{
          background: isPro ? '#1a2e1a' : '#2a1a08',
          border: `4px solid ${isPro ? '#27ae60' : '#f5a623'}`,
          boxShadow: `6px 6px 0 ${isPro ? '#0a4a0a' : '#8b5e00'}`,
          padding: '18px 22px', marginBottom: 16,
        }}>
          {isPro ? (
            <>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: '#27ae60', marginBottom: 8 }}>
                ✓ PRO MEMBER
              </div>
              <div style={{ fontFamily: "'VT323', monospace", fontSize: 18, color: '#7ecba0', marginBottom: 14, letterSpacing: 1 }}>
                Up to 8 players · All categories · No ads · Custom settings
              </div>
              <button
                onClick={handlePortal}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  fontFamily: "'Press Start 2P', monospace", fontSize: 9,
                  background: '#27ae60', color: '#fff',
                  border: '2px solid #1a6e1a', boxShadow: '3px 3px 0 #1a6e1a',
                  cursor: 'pointer', letterSpacing: 1,
                }}
              >
                MANAGE SUBSCRIPTION
              </button>
            </>
          ) : (
            <>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: '#f5a623', marginBottom: 8 }}>
                ★ UPGRADE TO PRO
              </div>
              <div style={{ fontFamily: "'VT323', monospace", fontSize: 18, color: '#c8a870', marginBottom: 4, letterSpacing: 1 }}>
                €4.99 / month
              </div>
              <div style={{ fontFamily: "'VT323', monospace", fontSize: 16, color: '#a08050', marginBottom: 14, letterSpacing: 1 }}>
                8 players · All 5 categories · No ads · Custom game settings
              </div>
              <button
                onClick={handleUpgrade}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  fontFamily: "'Press Start 2P', monospace", fontSize: 10,
                  background: '#f5a623', color: '#fff',
                  border: '3px solid #8b5e00', boxShadow: '4px 4px 0 #8b5e00',
                  cursor: 'pointer', letterSpacing: 1,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? '...' : 'UPGRADE NOW'}
              </button>
            </>
          )}
        </div>

        {/* Leaderboard + Logout */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setScreen('leaderboard')}
            style={{
              flex: 1, padding: '12px',
              fontFamily: "'Press Start 2P', monospace", fontSize: 9,
              background: '#2980b9', color: '#fff',
              border: '3px solid #1a5a8a', boxShadow: '4px 4px 0 #1a5a8a',
              cursor: 'pointer', letterSpacing: 1,
            }}
          >
            🏆 LEADERBOARD
          </button>
          <button
            onClick={handleLogout}
            style={{
              flex: 1, padding: '12px',
              fontFamily: "'Press Start 2P', monospace", fontSize: 9,
              background: '#a89878', color: '#f5e6c0',
              border: '3px solid #5a4a30', boxShadow: '4px 4px 0 #5a4a30',
              cursor: 'pointer', letterSpacing: 1,
            }}
          >
            LOG OUT
          </button>
        </div>

      </div>
    </div>
  );
}