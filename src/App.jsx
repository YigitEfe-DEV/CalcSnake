import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import SnakeScreen from './components/SnakeScreen';
import {
  computeExpression,
  formatNumber,
  hasDecimalInCurrentNumber,
  mapEvaluationError,
  prettifyExpression,
} from './utils/math';
import { readJSON, readNumber, writeJSON, writeString } from './utils/storage';
import { changeDirection, createGameState, tickGame } from './utils/snake';

const HISTORY_KEY = 'calcsnake-history';
const HIGH_SCORE_KEY = 'calcsnake-high-score';
const SETTINGS_KEY = 'calcsnake-settings';
const UNLOCK_CODE = '1984';
const MAX_HISTORY = 8;

const initialState = {
  display: '0',
  expression: '',
  awaitingClear: false,
  unlocked: false,
  sequence: '',
  memory: 0,
  history: loadHistory(),
  error: '',
};

function loadHistory() {
  return readJSON(HISTORY_KEY, []);
}

function reducer(state, action) {
  switch (action.type) {
    case 'append':
      return appendInput(state, action.value);
    case 'operate':
      return appendOperator(state, action.value);
    case 'clear':
      return {
        ...state,
        display: '0',
        expression: '',
        awaitingClear: false,
        error: '',
      };
    case 'backspace':
      return backspace(state);
    case 'equals':
      return evaluateExpression(state);
    case 'clear-history':
      return { ...state, history: [] };
    case 'delete-history':
      return {
        ...state,
        history: state.history.filter((entry) => entry.id !== action.id),
      };
    case 'memory-clear':
      return { ...state, memory: 0, error: '' };
    case 'memory-recall':
      return recallMemory(state);
    case 'memory-add':
      return updateMemory(state, 1);
    case 'memory-subtract':
      return updateMemory(state, -1);
    case 'recall-history':
      return recallHistory(state, action.entry);
    default:
      return state;
  }
}

function appendInput(state, value) {
  if (state.unlocked) return state;

  let baseDisplay = state.display;
  let baseExpression = state.expression;

  if (state.awaitingClear) {
    baseDisplay = '';
    baseExpression = '';
  } else if (baseDisplay === '0' && value !== '.') {
    baseDisplay = '';
    baseExpression = '';
  }

  if (value === '.' && hasDecimalInCurrentNumber(baseExpression)) {
    return state;
  }

  const nextDisplay = baseDisplay + value;
  const nextExpression = baseExpression + value;

  return {
    ...state,
    display: nextDisplay,
    expression: nextExpression,
    awaitingClear: false,
    error: '',
    sequence: trackSequence(state.sequence, value),
  };
}

function appendOperator(state, value) {
  if (state.unlocked) return state;
  if (value === '√') {
    const prefix = state.awaitingClear ? '' : state.expression;
    return {
      ...state,
      display: '√(',
      expression: `${prefix}Math.sqrt(`,
      awaitingClear: false,
      error: '',
    };
  }
  if (value === 'log') {
    const prefix = state.awaitingClear ? '' : state.expression;
    return {
      ...state,
      display: 'log(',
      expression: `${prefix}Math.log10(`,
      awaitingClear: false,
      error: '',
    };
  }
  if (['sin', 'cos', 'tan'].includes(value)) {
    const prefix = state.awaitingClear ? '' : state.expression;
    const fn = value;
    return {
      ...state,
      display: `${fn}(`,
      expression: `${prefix}Math.${fn}(`,
      awaitingClear: false,
      error: '',
    };
  }
  if (value === '!') {
    if (state.awaitingClear) return state;
    const last = state.expression.match(/(\d+)$/);
    if (!last) {
      return {
        ...state,
        display: 'Error',
        expression: '',
        awaitingClear: true,
        error: 'Factorial needs an integer',
      };
    }
    const prefix = state.expression.slice(0, state.expression.length - last[1].length);
    return {
      ...state,
      display: '!',
      expression: `${prefix}${last[1]}!`,
      awaitingClear: true,
      error: '',
    };
  }
  if (value === '1/x') {
    const prefix = state.awaitingClear ? '1/' : `1/(${state.expression})`;
    return {
      ...state,
      display: '1/x',
      expression: prefix,
      awaitingClear: false,
      error: '',
    };
  }
  if (state.expression === '' && value !== '-') return state;
  if (!state.awaitingClear && /[+\-*/^]$/.test(state.expression)) return state;
  const expression = `${state.expression}${value}`;
  return {
    ...state,
    display: value,
    expression,
    awaitingClear: false,
    error: '',
  };
}

function backspace(state) {
  if (state.unlocked) return state;
  if (state.awaitingClear) return { ...state, awaitingClear: false, display: '0', expression: '' };
  if (state.expression.endsWith('Math.sqrt(')) {
    const next = state.expression.slice(0, -'Math.sqrt('.length);
    return {
      ...state,
      display: next || '0',
      expression: next,
      error: '',
    };
  }
  const next = state.expression.slice(0, -1);
  return {
    ...state,
    display: next || '0',
    expression: next,
    error: '',
  };
}

function evaluateExpression(state) {
  if (state.unlocked) return state;
  const code = state.sequence + '=';
  if (code.endsWith(UNLOCK_CODE + '=')) {
    return {
      ...state,
      unlocked: true,
      display: 'SNAKE',
      expression: '',
      awaitingClear: true,
      error: '',
      sequence: '',
    };
  }
  if (!state.expression) return state;
  try {
    const value = computeExpression(state.expression);
    const display = formatNumber(value);
    const entry = {
      id: crypto.randomUUID(),
      expression: state.expression,
      prettyExpression: prettifyExpression(state.expression),
      result: display,
    };
    return {
      ...state,
      display,
      expression: display,
      awaitingClear: true,
      history: [entry, ...state.history].slice(0, MAX_HISTORY),
      error: '',
      sequence: '',
    };
  } catch (error) {
    const friendlyError = mapEvaluationError(error);
    return {
      ...state,
      display: 'Error',
      expression: '',
      awaitingClear: true,
      error: friendlyError,
      sequence: '',
    };
  }
}

function getCurrentValue(state) {
  if (!state.expression) return Number(state.display) || 0;
  return computeExpression(state.expression);
}

function updateMemory(state, direction) {
  if (state.unlocked) return state;
  try {
    const nextMemory = state.memory + getCurrentValue(state) * direction;
    return {
      ...state,
      memory: nextMemory,
      error: '',
      awaitingClear: true,
      display: formatNumber(nextMemory),
      expression: formatNumber(nextMemory),
    };
  } catch {
    return {
      ...state,
      display: 'Error',
      expression: '',
      awaitingClear: true,
      error: 'Cannot store this value',
    };
  }
}

function recallMemory(state) {
  if (state.unlocked) return state;
  const display = formatNumber(state.memory);
  return {
    ...state,
    display,
    expression: display,
    awaitingClear: true,
    error: '',
  };
}

function recallHistory(state, entry) {
  if (state.unlocked || !entry) return state;
  return {
    ...state,
    display: entry.result,
    expression: entry.result,
    awaitingClear: true,
    error: '',
  };
}

function trackSequence(sequence, value) {
  const candidate = `${sequence}${value}`.replace(/[^0-9]/g, '');
  return candidate.slice(-4);
}

function loadHighScore() {
  return readNumber(HIGH_SCORE_KEY, 0);
}

function loadSettings() {
  const parsed = readJSON(SETTINGS_KEY, { speedLevel: 'normal' });
  return {
    speedLevel: ['slow', 'normal', 'fast'].includes(parsed.speedLevel) ? parsed.speedLevel : 'normal',
  };
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [highScore, setHighScore] = useState(loadHighScore);
  const [settings, setSettings] = useState(loadSettings);
  const [game, setGame] = useState(() => createGameState());
  const [flashUnlock, setFlashUnlock] = useState(false);
  const [copyState, setCopyState] = useState('idle');
  const [justScored, setJustScored] = useState(false);
  const scoreTimerRef = useRef(0);
  const copyTimerRef = useRef(0);
  const lastTickRef = useRef(0);
  const rafRef = useRef(0);
  const gameRef = useRef(game);

  useEffect(() => {
    writeJSON(HISTORY_KEY, state.history);
  }, [state.history]);

  useEffect(() => {
    writeString(HIGH_SCORE_KEY, highScore);
  }, [highScore]);

  useEffect(() => {
    writeJSON(SETTINGS_KEY, settings);
  }, [settings]);

  useEffect(() => {
    if (state.unlocked) {
      setFlashUnlock(true);
      const timer = window.setTimeout(() => setFlashUnlock(false), 900);
      return () => window.clearTimeout(timer);
    }
  }, [state.unlocked]);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => () => window.clearTimeout(copyTimerRef.current), []);

  const handleCopy = async () => {
    if (state.unlocked || state.display === 'Error') return;
    try {
      await navigator.clipboard.writeText(state.display);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopyState('idle'), 1600);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (state.unlocked) {
        const map = {
          ArrowUp: 'up',
          ArrowDown: 'down',
          ArrowLeft: 'left',
          ArrowRight: 'right',
          w: 'up',
          W: 'up',
          a: 'left',
          A: 'left',
          s: 'down',
          S: 'down',
          d: 'right',
          D: 'right',
        };
        const action = map[event.key];
        if (action) {
          event.preventDefault();
          setGame((prev) => {
            if (!prev.started) return { ...prev, started: true, paused: false };
            return changeDirection(prev, action);
          });
          return;
        }
        if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
          event.preventDefault();
          setGame((prev) => {
            if (!prev.started || prev.over) return prev;
            return { ...prev, paused: !prev.paused };
          });
          return;
        }
        if (event.key === ' ') {
          event.preventDefault();
          setGame((prev) => {
            if (!prev.started && !prev.over) return { ...prev, started: true, paused: false };
            if (prev.over) return createGameState(settings.speedLevel);
            return { ...prev, paused: !prev.paused };
          });
        }
        if (event.key === 'r' || event.key === 'R') {
          event.preventDefault();
          setGame(createGameState(settings.speedLevel));
          setJustScored(false);
          window.clearTimeout(scoreTimerRef.current);
        }
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          setGame((prev) => {
            if (prev.over) return createGameState(settings.speedLevel);
            return prev;
          });
        }
        return;
      }

      if (event.key >= '0' && event.key <= '9') {
        dispatch({ type: 'append', value: event.key });
      } else if (['+', '-', '*', '/', '(', ')', '.', '%', '^'].includes(event.key)) {
        dispatch({ type: 'operate', value: event.key });
      } else if (event.key === 'i' || event.key === 'I') {
        event.preventDefault();
        dispatch({ type: 'operate', value: '1/x' });
      } else if (event.key === 'l' || event.key === 'L') {
        event.preventDefault();
        dispatch({ type: 'operate', value: 'log' });
      } else if (event.key === 's' || event.key === 'S') {
        event.preventDefault();
        dispatch({ type: 'operate', value: 'sin' });
      } else if (event.key === 'c' || event.key === 'C') {
        event.preventDefault();
        dispatch({ type: 'clear' });
      } else if (event.key === '!') {
        event.preventDefault();
        dispatch({ type: 'operate', value: '!' });
      } else if (event.key === 'Enter' || event.key === '=') {
        event.preventDefault();
        dispatch({ type: 'equals' });
      } else if (event.key === 'Backspace') {
        dispatch({ type: 'backspace' });
      } else if (event.key === 'Escape') {
        dispatch({ type: 'clear' });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.unlocked]);

  useEffect(() => {
    if (!state.unlocked) return undefined;
    let mounted = true;
    let frame = 0;
    const step = (timestamp) => {
      if (!mounted) return;
      const current = gameRef.current;
      const elapsed = timestamp - lastTickRef.current;
      if (elapsed >= current.speed) {
        lastTickRef.current = timestamp;
        setGame((prev) => tickGame(prev));
      }
      frame = window.requestAnimationFrame(step);
      rafRef.current = frame;
    };
    lastTickRef.current = window.performance.now();
    frame = window.requestAnimationFrame(step);
    rafRef.current = frame;
    return () => {
      mounted = false;
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [state.unlocked]);

  useEffect(() => {
    if (!state.unlocked) return undefined;
    let touchStart = null;
    const onTouchStart = (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      touchStart = { x: touch.clientX, y: touch.clientY };
    };
    const onTouchEnd = (event) => {
      if (!touchStart) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - touchStart.x;
      const dy = touch.clientY - touchStart.y;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        handleDirection(dx > 0 ? 'right' : 'left');
      } else {
        handleDirection(dy > 0 ? 'down' : 'up');
      }
      touchStart = null;
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [state.unlocked]);

  useEffect(() => {
    if (!state.unlocked) return;
    if (game.score > highScore) setHighScore(game.score);
  }, [game.score, highScore, state.unlocked]);

  useEffect(() => {
    if (!state.unlocked) return undefined;
    if (game.score <= 0) return undefined;
    setJustScored(true);
    window.clearTimeout(scoreTimerRef.current);
    scoreTimerRef.current = window.setTimeout(() => setJustScored(false), 600);
    return () => window.clearTimeout(scoreTimerRef.current);
  }, [game.score, state.unlocked]);

  useEffect(() => () => {
    window.clearTimeout(scoreTimerRef.current);
    window.clearTimeout(copyTimerRef.current);
  }, []);

  const keys = useMemo(
    () => [
      ['MC', 'MR', 'M+', 'M-'],
      ['C', '⌫', '(', ')'],
      ['%', '^', '√', 'log'],
      ['sin', 'cos', 'tan', '1/x'],
      ['7', '8', '9', '×'],
      ['4', '5', '6', '-'],
      ['1', '2', '3', '+'],
      ['0', '.', '!', '='],
    ],
    [],
  );

  const handlePress = (value) => {
    if (state.unlocked) return;
    if (value === 'C') dispatch({ type: 'clear' });
    else if (value === '⌫') dispatch({ type: 'backspace' });
    else if (value === '=') dispatch({ type: 'equals' });
    else if (value === 'MC') dispatch({ type: 'memory-clear' });
    else if (value === 'MR') dispatch({ type: 'memory-recall' });
    else if (value === 'M+') dispatch({ type: 'memory-add' });
    else if (value === 'M-') dispatch({ type: 'memory-subtract' });
    else if (['+', '-', '×', '÷', '(', ')', '%', '^', '.', '√', '!', '1/x', 'log', 'sin', 'cos', 'tan'].includes(value)) dispatch({ type: 'operate', value });
    else dispatch({ type: 'append', value });
  };

  const restartGame = () => setGame(createGameState(settings.speedLevel));
  const togglePause = () => setGame((prev) => ({ ...prev, paused: !prev.paused }));

  const startGame = () => setGame((prev) => (prev.over || !prev.started ? { ...prev, started: true, paused: false } : prev));

  const changeSpeedLevel = (level) => {
    if (!['slow', 'normal', 'fast'].includes(level)) return;
    setSettings((prev) => ({ ...prev, speedLevel: level }));
    setGame((prev) => ({ ...createGameState(level), started: prev.started && !prev.over, paused: prev.paused, score: prev.score }));
  };

  const handleDirection = (direction) => {
    setGame((prev) => {
      if (!prev.started && !prev.over) return { ...prev, started: true, paused: false };
      return changeDirection(prev, direction);
    });
  };

  const confirmClearHistory = () => {
    if (state.history.length === 0) return;
    const confirmed = window.confirm('Clear all calculation history?');
    if (confirmed) dispatch({ type: 'clear-history' });
  };

  return (
    <main className={`shell ${state.unlocked ? 'shell--game' : ''} ${flashUnlock ? 'shell--flash' : ''}`}>
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Premium calculator</p>
          <h1>CalcSnake</h1>
          <p className="hero__text">
            A precision calculator with an embedded arcade layer. The screen stays discreet until the hidden
            sequence is entered.
          </p>
        </div>
        <div className="hero__status">
          <span className={state.unlocked ? 'badge badge--active' : 'badge'}>{state.unlocked ? 'Game unlocked' : 'Calculator mode'}</span>
          <span className="badge badge--ghost">Keyboard ready</span>
        </div>
      </section>

      <section className="workspace">
        <div className="calculator">
          <div className="display" aria-live="polite">
            {!state.unlocked ? (
              <>
                <div className="display__expression">{state.expression || state.display}</div>
                <div className="display__result">{state.display}</div>
                <div className="display__meta">
                  <div className={`display__memory ${state.memory !== 0 ? 'display__memory--active' : ''}`}>
                    {state.memory === 0 ? 'Memory clear' : `Memory ${formatNumber(state.memory)}`}
                  </div>
                  <button
                    type="button"
                    className={`display__copy display__copy--${copyState}`}
                    onClick={handleCopy}
                    aria-label="Copy result"
                    disabled={state.display === 'Error'}
                  >
                    {copyState === 'copied' ? 'Copied!' : copyState === 'failed' ? 'Copy failed' : 'Copy'}
                  </button>
                </div>
                {state.error ? <div className="display__error">{state.error}</div> : null}
              </>
            ) : (
              <SnakeScreen
                game={game}
                highScore={highScore}
                speedLevel={settings.speedLevel}
                onRestart={restartGame}
                onTogglePause={togglePause}
                onStart={startGame}
                onSpeedChange={changeSpeedLevel}
                onDirection={handleDirection}
                justScored={justScored}
              />
            )}
          </div>

          <div className="pad">
            {keys.map((row, index) => (
              <div className="pad__row" key={index}>
                {row.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`key ${key === '=' ? 'key--primary' : ''} ${key === 'C' ? 'key--danger' : ''}`}
                    onClick={() => handlePress(key)}
                  >
                    {key}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        <aside className="history">
          <div className="panel-header">
            <h2>History</h2>
            <button type="button" className="text-button" onClick={confirmClearHistory}>
              Clear history
            </button>
          </div>

          <div className="history__list">
            {state.history.length === 0 ? (
              <div className="empty empty--state">
                <span className="empty__icon" aria-hidden="true">∑</span>
                <p className="empty__title">No history yet</p>
                <p className="empty__hint">Run a calculation and it will appear here for quick reuse.</p>
              </div>
            ) : (
              state.history.map((item) => (
                <div className="history__row" key={item.id}>
                  <button
                    type="button"
                    className="history__item history__item--button"
                    onClick={() => dispatch({ type: 'recall-history', entry: item })}
                  >
                    <span>{item.prettyExpression}</span>
                    <strong>{item.result}</strong>
                  </button>
                  <button
                    type="button"
                    aria-label="Delete history entry"
                    className="history__delete"
                    onClick={() => dispatch({ type: 'delete-history', id: item.id })}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="history__note">
            Use {UNLOCK_CODE} then `=` to open the hidden display mode.
          </div>
        </aside>
      </section>
    </main>
  );
}
