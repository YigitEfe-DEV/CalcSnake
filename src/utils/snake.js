export const GRID_SIZE = 13;

export function createGameState(speedLevel = 'normal') {
  const center = Math.floor(GRID_SIZE / 2);
  const initialSnake = [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ];
  return {
    snake: initialSnake,
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    food: spawnFood(initialSnake),
    score: 0,
    speed: baseSpeedFor(speedLevel),
    paused: false,
    over: false,
    started: false,
  };
}

export function baseSpeedFor(level) {
  if (level === 'slow') return 240;
  if (level === 'fast') return 130;
  return 180;
}

export function changeDirection(game, direction) {
  const mapping = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const next = mapping[direction];
  if (!next) return game;
  const current = game.direction;
  if (current.x + next.x === 0 && current.y + next.y === 0) return game;
  if (game.nextDirection.x + next.x === 0 && game.nextDirection.y + next.y === 0) return game;
  return { ...game, nextDirection: next };
}

export function tickGame(game) {
  if (!game.started || game.paused || game.over) return game;
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

export function spawnFood(blocked) {
  const blockedSet = new Set(blocked.map((item) => `${item.x},${item.y}`));
  const free = [];
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (!blockedSet.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  if (free.length === 0) return { x: 0, y: 0 };
  return free[Math.floor(Math.random() * free.length)];
}