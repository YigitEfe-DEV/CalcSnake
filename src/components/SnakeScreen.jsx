const GRID_SIZE = 13;

export default function SnakeScreen({ game, highScore, speedLevel, onRestart, onTogglePause, onStart, onSpeedChange, justScored, onDirection }) {
  const ready = game.started;
  return (
    <div className="snake">
      <div className="snake__hud">
        <div className={justScored ? 'snake__metric snake__metric--pulse' : 'snake__metric'}>
          <span className="snake__label">Score</span>
          <strong>{game.score}</strong>
        </div>
        <div className="snake__metric">
          <span className="snake__label">High</span>
          <strong>{highScore}</strong>
        </div>
        <div className="snake__metric snake__metric--speed">
          <span className="snake__label">Speed</span>
          <div className="snake__speed-group" role="radiogroup" aria-label="Game speed">
            {['slow', 'normal', 'fast'].map((level) => (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={speedLevel === level}
                className={`snake__speed ${speedLevel === level ? 'snake__speed--active' : ''}`}
                onClick={() => onSpeedChange?.(level)}
              >
                {level === 'slow' ? '×' : level === 'fast' ? '×3' : '×2'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="snake__grid" role="application" aria-label="Snake game screen">
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
          const x = index % GRID_SIZE;
          const y = Math.floor(index / GRID_SIZE);
          const isSnake = game.snake.some(
            (segment, segmentIndex) => segment.x === x && segment.y === y && segmentIndex === 0,
          );
          const isBody = game.snake.some(
            (segment, segmentIndex) => segment.x === x && segment.y === y && segmentIndex > 0,
          );
          const isFood = game.food.x === x && game.food.y === y;
          return (
            <div
              key={`${x}-${y}`}
              className={[
                'snake__cell',
                isSnake ? 'snake__cell--head' : '',
                isBody ? 'snake__cell--body' : '',
                isFood ? 'snake__cell--food' : '',
              ].join(' ')}
            />
          );
        })}
        {!ready && !game.over ? (
          <div className="snake__overlay snake__overlay--ready">
            <div>
              <h3>Ready</h3>
              <p>Press any arrow key or tap Start to play.</p>
              <button type="button" className="text-button" onClick={onStart}>
                Start
              </button>
            </div>
          </div>
        ) : null}
        {game.over ? (
          <div className="snake__overlay snake__overlay--end">
            <div className="snake__overlay-panel">
              <h3>Game Over</h3>
              <p>Final score <strong>{game.score}</strong></p>
              {game.score > 0 && game.score === highScore ? <p className="snake__badge">New high score!</p> : null}
              <button type="button" className="text-button" onClick={onRestart}>
                Play again
              </button>
            </div>
          </div>
        ) : null}
        {game.paused && ready && !game.over ? <div className="snake__overlay">Paused</div> : null}
      </div>
      <div className="snake__controls">
        <button type="button" className="text-button" onClick={onRestart}>
          Restart
        </button>
        <button
          type="button"
          className="text-button"
          onClick={onTogglePause}
          disabled={!ready || game.over}
        >
          {game.paused ? 'Resume' : 'Pause'}
        </button>
      </div>
      <div className="snake__dpad" aria-label="Direction pad">
        <button type="button" className="snake__dpad-btn" onClick={() => onDirection?.('up')} aria-label="Up">▲</button>
        <div className="snake__dpad-row">
          <button type="button" className="snake__dpad-btn" onClick={() => onDirection?.('left')} aria-label="Left">◀</button>
          <button type="button" className="snake__dpad-btn" onClick={() => onDirection?.('down')} aria-label="Down">▼</button>
          <button type="button" className="snake__dpad-btn" onClick={() => onDirection?.('right')} aria-label="Right">▶</button>
        </div>
      </div>
    </div>
  );
}
