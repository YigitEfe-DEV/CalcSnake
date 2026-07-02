import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import SnakeScreen from './components/SnakeScreen';

const HISTORY_KEY = 'calcsnake-history';
const HIGH_SCORE_KEY = 'calcsnake-high-score';
const UNLOCK_CODE = '1984';
const MAX_HISTORY = 8;
const GRID_SIZE = 13;

const initialState = {
  display: '0',
  expression: '',
  awaitingClear: false,
  unlocked: false,
  sequence: '',
  history: loadHistory(),
  error: '',
};

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
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
    default:
      return state;
  }
}

function appendInput(state, value) {
  if (state.unlocked) return state;
  const nextDisplay = state.awaitingClear || state.display === '0' ? value : state.display + value;
  const nextExpression = state.awaitingClear || state.expression === '0' ? value : state.expression + value;
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
  if (state.expression === '' && value !== '-') return state;
  const expression = state.awaitingClear ? state.expression : state.expression + value;
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
    const entry = { id: crypto.randomUUID(), expression: state.expression, result: display };
    return {
      ...state,
      display,
      expression: display,
      awaitingClear: true,
      history: [entry, ...state.history].slice(0, MAX_HISTORY),
      error: '',
      sequence: '',
    };
  } catch {
    return {
      ...state,
      display: 'Error',
      expression: '',
      awaitingClear: true,
      error: 'Invalid calculation',
      sequence: '',
    };
  }
}

function trackSequence(sequence, value) {
  const candidate = `${sequence}${value}`.replace(/[^0-9]/g, '');
  return candidate.slice(-4);
}

function computeExpression(expression) {
  const normalized = expression
    .replace(/÷/g, '/')
    .replace(/×/g, '*')
    .replace(/%/g, '/100')
    .replace(/\^/g, '**')
    .replace(/√\(/g, 'Math.sqrt(')
    .replace(/√(\d+(?:\.\d+)?)/g, 'Math.sqrt($1)');

  if (!/^[0-9+\-*/().,\sMathsqrt]+$/.test(normalized.replace(/Math\.sqrt/g, 'Mathsqrt'))) {
    throw new Error('Unsafe expression');
  }

  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${normalized});`)();
  if (!Number.isFinite(result)) throw new Error('Invalid result');
  return result;
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : Number(value.toFixed(10)).toString();
}

function loadHighScore() {
  const raw = localStorage.getItem(HIGH_SCORE_KEY);
  return raw ? Number(raw) || 0 : 0;
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [highScore, setHighScore] = useState(loadHighScore);
  const [game, setGame] = useState(() => createGameState());
  const [flashUnlock, setFlashUnlock] = useState(false);
  const lastTickRef = useRef(0);
  const rafRef = useRef(0);
  const gameRef = useRef(game);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
  }, [state.history]);

  useEffect(() => {
    localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  }, [highScore]);

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
          setGame((prev) => changeDirection(prev, action));
          return;
        }
        if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
          event.preventDefault();
          setGame((prev) => ({ ...prev, paused: !prev.paused }));
          return;
        }
        if (event.key === 'r' || event.key === 'R') {
          event.preventDefault();
          setGame(createGameState());
        }
        return;
      }

      if (event.key >= '0' && event.key <= '9') {
        dispatch({ type: 'append', value: event.key });
      } else if (['+', '-', '*', '/', '(', ')', '.', '%', '^'].includes(event.key)) {
        dispatch({ type: 'operate', value: event.key });
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
    const step = (timestamp) => {
      const current = gameRef.current;
      const elapsed = timestamp - lastTickRef.current;
      if (elapsed >= current.speed) {
        lastTickRef.current = timestamp;
        setGame((prev) => tickGame(prev));
      }
      if (mounted) rafRef.current = window.requestAnimationFrame(step);
    };
    rafRef.current = window.requestAnimationFrame(step);
    return () => {
      mounted = false;
      window.cancelAnimationFrame(rafRef.current);
    };
  }, [state.unlocked]);

  useEffect(() => {
    if (!state.unlocked) return;
    if (game.score > highScore) setHighScore(game.score);
  }, [game.score, highScore, state.unlocked]);

  const keys = useMemo(
    () => [
      ['C', '⌫', '(', ')'],
      ['%', '^', '√', '÷'],
      ['7', '8', '9', '×'],
      ['4', '5', '6', '-'],
      ['1', '2', '3', '+'],
      ['0', '.', '='],
    ],
    [],
  );

  const handlePress = (value) => {
    if (state.unlocked) return;
    if (value === 'C') dispatch({ type: 'clear' });
    else if (value === '⌫') dispatch({ type: 'backspace' });
    else if (value === '=') dispatch({ type: 'equals' });
    else if (['+', '-', '×', '÷', '(', ')', '%', '^', '.', '√'].includes(value)) dispatch({ type: 'operate', value });
    else dispatch({ type: 'append', value });
  };

  const restartGame = () => setGame(createGameState());
  const togglePause = () => setGame((prev) => ({ ...prev, paused: !prev.paused }));

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
                {state.error ? <div className="display__error">{state.error}</div> : null}
              </>
            ) : (
              <SnakeScreen
                game={game}
                highScore={highScore}
                onRestart={restartGame}
                onTogglePause={togglePause}
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
            <button type="button" className="text-button" onClick={() => dispatch({ type: 'clear-history' })}>
              Clear history
            </button>
          </div>

          <div className="history__list">
            {state.history.length === 0 ? (
              <p className="empty">No calculations yet.</p>
            ) : (
              state.history.map((item) => (
                <article className="history__item" key={item.id}>
                  <span>{item.expression}</span>
                  <strong>{item.result}</strong>
                </article>
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

function createGameState() {
  const center = Math.floor(GRID_SIZE / 2);
  return {
    snake: [
      { x: center, y: center },
      { x: center - 1, y: center },
      { x: center - 2, y: center },
    ],
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    food: spawnFood([
      { x: center, y: center },
      { x: center - 1, y: center },
      { x: center - 2, y: center },
    ]),
    score: 0,
    speed: 180,
    paused: false,
    over: false,
  };
}

function changeDirection(game, direction) {
  const mapping = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const next = mapping[direction];
  if (game.direction.x + next.x === 0 && game.direction.y + next.y === 0) return game;
  return { ...game, nextDirection: next };
}

function tickGame(game) {
  if (game.paused || game.over) return game;
  const direction = game.nextDirection ?? game.direction;
  const head = game.snake[0];
  const nextHead = {
    x: (head.x + direction.x + GRID_SIZE) % GRID_SIZE,
    y: (head.y + direction.y + GRID_SIZE) % GRID_SIZE,
  };
  const ateFood = nextHead.x === game.food.x && nextHead.y === game.food.y;
  const nextSnake = [nextHead, ...game.snake];
  if (!ateFood) nextSnake.pop();
  if (nextSnake.slice(1).some((segment) => segment.x === nextHead.x && segment.y === nextHead.y)) {
    return { ...game, over: true };
  }
  return {
    ...game,
    snake: nextSnake,
    direction,
    food: ateFood ? spawnFood(nextSnake) : game.food,
    score: ateFood ? game.score + 1 : game.score,
    speed: ateFood ? Math.max(80, game.speed - 4) : game.speed,
    nextDirection: direction,
  };
}

function spawnFood(blocked) {
  const blockedSet = new Set(blocked.map((item) => `${item.x},${item.y}`));
  let food = { x: 0, y: 0 };
  do {
    food = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (blockedSet.has(`${food.x},${food.y}`));
  return food;
}
