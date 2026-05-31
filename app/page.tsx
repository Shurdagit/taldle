'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getDailyNumber, getYesterdayNumber, getTodayString } from '@/lib/numbers';

// ─── Types ───────────────────────────────────────────────────────────────────

type Hint = 'higher' | 'lower' | 'correct';

interface GuessRow {
  value: number;
  hint: Hint;
}

interface SavedState {
  date: string;
  guesses: GuessRow[];
  finished: boolean;
  won: boolean;
}

// ─── Medal helper ─────────────────────────────────────────────────────────────

function getMedal(count: number) {
  if (count <= 5)  return { label: 'PLATINA', emoji: '💎', cls: 'platinum', color: '#b0c4de' };
  if (count <= 10) return { label: 'GULD',    emoji: '🥇', cls: 'gold',    color: '#ffd700' };
  if (count <= 15) return { label: 'SILVER',  emoji: '🥈', cls: 'silver',  color: '#c0c0c0' };
  if (count <= 20) return { label: 'BRONS',   emoji: '🥉', cls: 'bronze',  color: '#cd7f32' };
  return null;
}

// ─── Timer hook ───────────────────────────────────────────────────────────────

function useCountdown() {
  const [time, setTime] = useState('');

  useEffect(() => {
    function calc() {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = String(Math.floor(diff / 3_600_000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3_600_000) / 60_000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60_000) / 1_000)).padStart(2, '0');
      setTime(`${h}:${m}:${s}`);
    }
    calc();
    const id = setInterval(calc, 1_000);
    return () => clearInterval(id);
  }, []);

  return time;
}

// ─── LocalStorage key ─────────────────────────────────────────────────────────

const LS_KEY = 'taldle_state';

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const s: SavedState = JSON.parse(raw);
    if (s.date !== getTodayString()) return null;
    return s;
  } catch {
    return null;
  }
}

function saveState(s: SavedState) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const target     = getDailyNumber();
  const yesterday  = getYesterdayNumber();
  const countdown  = useCountdown();

  const [guesses,   setGuesses]   = useState<GuessRow[]>([]);
  const [input,     setInput]     = useState('');
  const [finished,  setFinished]  = useState(false);
  const [won,       setWon]       = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showHelp,  setShowHelp]  = useState(false);
  const [error,     setError]     = useState('');
  const [shaking,   setShaking]   = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Range narrowing for progress bar
  const [lo, setLo] = useState(1);
  const [hi, setHi] = useState(1000);

  // ── Restore from localStorage on mount
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setGuesses(saved.guesses);
      setFinished(saved.finished);
      setWon(saved.won);
      if (saved.finished) setShowPopup(true);

      let l = 1, h = 1000;
      for (const g of saved.guesses) {
        if (g.hint === 'higher' && g.value > l) l = g.value + 1;
        if (g.hint === 'lower'  && g.value < h) h = g.value - 1;
      }
      setLo(l); setHi(h);
    }
  }, []);

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 450);
  };

  const handleSubmit = useCallback(() => {
    const num = parseInt(input, 10);

    if (!input || isNaN(num)) {
      setError('Ange ett tal!');
      triggerShake();
      return;
    }
    if (num < 1 || num > 1000) {
      setError('Talet måste vara mellan 1 och 1000.');
      triggerShake();
      return;
    }
    if (guesses.some(g => g.value === num)) {
      setError('Du har redan gissat det talet.');
      triggerShake();
      return;
    }

    setError('');

    const hint: Hint =
      num === target ? 'correct' :
      num < target   ? 'higher'  : 'lower';

    const newGuesses = [...guesses, { value: num, hint }];
    setGuesses(newGuesses);
    setInput('');
    inputRef.current?.focus();

    if (hint === 'higher') setLo(Math.max(lo, num + 1));
    if (hint === 'lower')  setHi(Math.min(hi, num - 1));

    const isWin  = hint === 'correct';
    const isOver = !isWin && newGuesses.length >= 20;
    const done   = isWin || isOver;

    if (done) {
      setFinished(true);
      setWon(isWin);
      setTimeout(() => setShowPopup(true), 600);
    }

    saveState({ date: getTodayString(), guesses: newGuesses, finished: done, won: isWin });
  }, [input, guesses, target, lo, hi]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  // ── Range bar fill %
  const fillLeft  = ((lo - 1) / 999) * 100;
  const fillWidth = ((hi - lo + 1) / 999) * 100;

  const medal = won ? getMedal(guesses.length) : null;
  const attemptsLeft = 20 - guesses.length;
  const attemptsColor =
    attemptsLeft <= 3  ? 'danger'  :
    attemptsLeft <= 7  ? 'warning' : '';

  return (
    <>
      {/* ── Header */}
      <header className="header">
        <h1>TALDLE</h1>
        <p>Gissa dagens tal – 1 till 1000</p>
        <button
          className="help-btn"
          onClick={() => setShowHelp(true)}
          aria-label="Spelregler och hjälp"
        >
          ?
        </button>
      </header>

      {/* ── Game area */}
      <main className="game-wrapper">

        {/* Guess history */}
        <div className="guesses-area">
          {guesses.map((g, i) => (
            <div key={i} className={`guess-row ${g.hint}`}>
              <span className="guess-number">{g.value}</span>
              <span className={`guess-hint ${g.hint}`}>
                {g.hint === 'higher'  && <><span className="hint-arrow">↑</span> Högre</>}
                {g.hint === 'lower'   && <><span className="hint-arrow">↓</span> Lägre</>}
                {g.hint === 'correct' && <><span className="hint-arrow">✓</span> Rätt!</>}
              </span>
              <span className="guess-count">#{i + 1}</span>
            </div>
          ))}
        </div>

        {/* Input */}
        {!finished && (
          <div className="input-area">
            <div className="attempts-badge">
              <div>
                <div className="attempts-label">Försök kvar</div>
                <div className={`attempts-value ${attemptsColor}`}>{attemptsLeft}</div>
              </div>
            </div>

            <div className={`input-row ${shaking ? 'shake' : ''}`}>
              <input
                ref={inputRef}
                className="number-input"
                type="number"
                min={1}
                max={1000}
                placeholder="1 – 1000"
                value={input}
                onChange={e => { setInput(e.target.value); setError(''); }}
                onKeyDown={handleKey}
                autoFocus
                inputMode="numeric"
              />
              <button className="submit-btn" onClick={handleSubmit}>
                GISSA
              </button>
            </div>

            <div className="error-msg">{error}</div>

            {/* Range bar */}
            {guesses.length > 0 && (
              <div style={{ width: '100%' }}>
                <div className="range-bar">
                  <div
                    className="range-fill"
                    style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
                  />
                </div>
                <div className="range-labels">
                  <span>{lo}</span>
                  <span>{hi}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {finished && !showPopup && (
          <button className="submit-btn" onClick={() => setShowPopup(true)}>
            SE RESULTAT
          </button>
        )}
      </main>

      {/* ── Side nav: desktop=fixed left, mobile=inline below game */}
      <nav className="side-nav">
        <a
          href="https://glosdle.svenskadle.se"
          target="_blank"
          rel="noopener noreferrer"
          className="side-btn side-btn-glosdle"
        >
          <span className="side-btn-icon">✏️</span>
          <span className="side-btn-label">SPELA GLOSDLE</span>
        </a>
        <a
          href="https://tubdle.se"
          target="_blank"
          rel="noopener noreferrer"
          className="side-btn side-btn-tubdle"
        >
          <span className="side-btn-icon">🚋</span>
          <span className="side-btn-label">SPELA TUBDLE</span>
        </a>
      </nav>

      {/* ── Bottom bar */}
      <footer className="bottom-bar">
        <div className="bottom-bar-inner">
          <div className="bb-section">
            <div className="bb-label">Gårdagens tal</div>
            <div className="bb-value">{yesterday}</div>
          </div>
          <div className="bb-divider" />
          <div className="bb-section right">
            <div className="bb-label">Nästa tal om</div>
            <div className="bb-value">{countdown}</div>
          </div>
        </div>
      </footer>

      {/* ── Help / Rules popup */}
      {showHelp && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowHelp(false); }}>
          <div className="popup">
            <div className="popup-medal">🎯</div>
            <div className="popup-title win">SPELREGLER</div>

            <div className="popup-divider" />

            <div className="help-content">
              <div className="help-rule">
                <span className="help-rule-icon">🔢</span>
                <span>Gissa ett tal mellan <strong>1 och 1000</strong>.</span>
              </div>
              <div className="help-rule">
                <span className="help-rule-icon" style={{ color: 'var(--higher)' }}>↑</span>
                <span><strong>Högre</strong> – rätt tal är högre än din gissning.</span>
              </div>
              <div className="help-rule">
                <span className="help-rule-icon" style={{ color: 'var(--lower)' }}>↓</span>
                <span><strong>Lägre</strong> – rätt tal är lägre än din gissning.</span>
              </div>
              <div className="help-rule">
                <span className="help-rule-icon" style={{ color: 'var(--correct)' }}>✓</span>
                <span><strong>Rätt!</strong> – du hittade dagens tal.</span>
              </div>
              <div className="help-rule">
                <span className="help-rule-icon">⏱️</span>
                <span>Nytt tal varje dag vid <strong>midnatt</strong>.</span>
              </div>
              <div className="help-rule">
                <span className="help-rule-icon">🎯</span>
                <span>Du har max <strong>20 försök</strong> på dig.</span>
              </div>
            </div>

            <div className="popup-divider" />

            <div className="popup-games-label">Medaljer</div>

            <div className="medals-list">
              <div className="medal-row">
                <div className="medal-identity">
                  <span>💎</span>
                  <span className="medal-name platinum-text">Platina</span>
                </div>
                <span className="medal-desc">1–5 gissningar</span>
              </div>
              <div className="medal-row">
                <div className="medal-identity">
                  <span>🥇</span>
                  <span className="medal-name" style={{ color: 'var(--gold)' }}>Guld</span>
                </div>
                <span className="medal-desc">6–10 gissningar</span>
              </div>
              <div className="medal-row">
                <div className="medal-identity">
                  <span>🥈</span>
                  <span className="medal-name" style={{ color: 'var(--silver)' }}>Silver</span>
                </div>
                <span className="medal-desc">11–15 gissningar</span>
              </div>
              <div className="medal-row">
                <div className="medal-identity">
                  <span>🥉</span>
                  <span className="medal-name" style={{ color: 'var(--bronze)' }}>Brons</span>
                </div>
                <span className="medal-desc">16–20 gissningar</span>
              </div>
            </div>

            <button className="popup-close" onClick={() => setShowHelp(false)}>
              Stäng
            </button>
          </div>
        </div>
      )}

      {/* ── Result popup */}
      {showPopup && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowPopup(false); }}>
          <div className="popup">

            {won ? (
              <>
                <div className="popup-medal">{medal?.emoji ?? '🎯'}</div>
                <div className={`popup-title ${medal?.cls ?? 'win'}`}>
                  {medal ? `${medal.label}MEDALJ!` : 'KLARAT!'}
                </div>
              </>
            ) : (
              <>
                <div className="popup-medal">💀</div>
                <div className="popup-title gameover">GAME OVER</div>
              </>
            )}

            <div className="popup-number-reveal">{target}</div>

            <div className="popup-stats">
              <div className="stat-box">
                <div className="stat-value">{guesses.length}</div>
                <div className="stat-label">Försök</div>
              </div>
              <div className="stat-box">
                <div className="stat-value">
                  {won ? (medal?.emoji ?? '🎯') : '💀'}
                </div>
                <div className="stat-label">{won ? 'Medalj' : 'Resultat'}</div>
              </div>
            </div>

            <div className="popup-divider" />

            <div className="popup-timer-label">Nästa tal om</div>
            <div className="popup-timer">{countdown}</div>

            <div className="popup-divider" />

            <div className="popup-games-label">Spela fler dagliga spel</div>

            <div className="game-links">
              <a
                href="https://glosdle.svenskadle.se"
                target="_blank"
                rel="noopener noreferrer"
                className="game-btn game-btn-glosdle"
              >
                <span className="btn-icon">✏️</span>
                SPELA GLOSDLE
              </a>
              <a
                href="https://tubdle.se"
                target="_blank"
                rel="noopener noreferrer"
                className="game-btn game-btn-tubdle"
              >
                <span className="btn-icon">🚋</span>
                SPELA TUBDLE
              </a>
            </div>

            <button className="popup-close" onClick={() => setShowPopup(false)}>
              Stäng
            </button>
          </div>
        </div>
      )}
    </>
  );
}