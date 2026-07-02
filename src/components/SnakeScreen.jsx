const GRID_SIZE = 13;

export default function SnakeScreen({ game, highScore, onRestart, onTogglePause }) {
  return (
    <div className="snake">
      <div className="snake__hud">
        <div>
          <span className="snake__label">Score</span>
          <strong>{game.score}</strong>
        </div>
        <div>
          <span className="snake__label">High</span>
          <strong>{highScore}</strong>
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
        {game.over ? <div className="snake__overlay">Game Over</div> : null}
        {game.paused && !game.over ? <div className="snake__overlay">Paused</div> : null}
      </div>
      <div className="snake__controls">
        <button type="button" className="text-button" onClick={onRestart}>
          Restart
        </button>
        <button type="button" className="text-button" onClick={onTogglePause}>
          Pause
        </button>
      </div>
    </div>
  );
}
