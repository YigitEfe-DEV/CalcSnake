# CalcSnake

CalcSnake is a polished calculator experience built with React and Vite. It combines a modern scientific calculator, persistent calculation history, and a hidden Snake game that uses the calculator display as the game surface.

The interface is a single dark-themed glassmorphism panel: the calculator on the left, history on the right. Type a sequence to unlock the Snake game and the display switches to a 13×13 arcade grid.

## Features

- Standard and scientific operations: percent, square root, factorial, reciprocal, power, and parentheses
- Trigonometric functions: `sin`, `cos`, `tan` and base-10 `log`
- Calculator memory controls: `MC`, `MR`, `M+`, and `M-`
- Persistent calculation history with a delete action per entry and a confirmation before clearing all
- One-click copy of the active result with visual feedback
- Hidden Snake mode activated by entering `1984` and pressing `=`
- Snake controls: arrow keys, WASD, on-screen D-pad (mobile), and swipe gestures
- Speed selector with three presets: slow, normal, fast
- Score and high score persistence with localStorage
- Per-entry delete in history; clear-all confirmation dialog
- Pause, restart, and game-over screens with the final score
- Responsive dark glassmorphism layout with focus styles and reduced-motion-friendly transitions

## Installation

```bash
npm install
```

## Usage

```bash
npm run dev      # start the development server
npm run build    # build a production bundle into dist/
npm run preview  # preview the production build locally
```

Open the local development URL shown in the terminal (default `http://localhost:5173`).

## Keyboard shortcuts

Calculator mode

| Key | Action |
| --- | --- |
| `0`–`9`, `.` | Enter digits and decimals |
| `+`, `-`, `*`, `/`, `^`, `%`, `(`, `)` | Operators |
| `i` | Reciprocal (`1/x`) |
| `l` | Base-10 logarithm |
| `s` | `sin(` |
| `c` or `Esc` | Clear current entry |
| `Backspace` | Delete last character |
| `Enter` / `=` | Evaluate |

Snake mode

| Key | Action |
| --- | --- |
| `Arrow` keys / `WASD` | Change direction (also starts the game) |
| `Space` / `Enter` | Start, pause, resume, or restart |
| `p` or `Esc` | Pause or resume |
| `r` | Restart |

## Hidden Snake mode

The Snake game is intentionally invisible until you unlock it. Enter the digits `1984` and press `=`. The calculator display is replaced by the game surface and any arrow key starts the run.

## Tech stack

- React 19 with hooks
- Vite 5 for the build pipeline
- Plain CSS with custom properties for theming
- `localStorage` for history, high score, and settings

## Project structure

```
src/
  App.jsx               Calculator UI + reducer + game loop
  main.jsx              React entry point
  styles.css            Global theme and component styles
  components/
    SnakeScreen.jsx     Snake display, HUD, and D-pad
  utils/
    math.js             Expression evaluation, formatting, error mapping
    snake.js            Snake game state and tick logic
    storage.js          Safe localStorage helpers
```

## Update notes

### v1.2.0 — Scientific controls and Snake polish

- Added `sin`, `cos`, `tan`, `log`, `1/x`, and factorial operations.
- Persisted user-selected speed level between sessions.
- Added mobile D-pad and swipe gestures for Snake.
- Improved history entry formatting, deletion, and clear confirmation.
- Added a clipboard copy button with success and failure feedback.
- Extracted calculator math and storage helpers into dedicated modules.

### v1.1.0 — Calculator workflow update

- Added memory controls for storing, recalling, adding, and subtracting the active calculation value.
- Added a visible memory readout under the calculator display.
- Made calculation history entries clickable so previous results can be reused instantly.

## License

Released under the MIT License. See [`LICENSE`](LICENSE).