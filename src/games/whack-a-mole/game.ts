import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

/** Seconds in a round. */
export const ROUND_TIME = 30;
/** Seconds a mole stays up before it drops back down. */
export const UP_TIME = 1;
/** Seconds between pops at the start and at the end of a round. */
export const START_INTERVAL = 1;
export const END_INTERVAL = 0.35;
export const POINTS_PER_MOLE = 10;
export const HOLE_RADIUS = 48;
const COLUMNS = [200, 400, 600];
const ROWS = [140, 260, 380];

export interface Hole {
  x: number;
  y: number;
  /** Seconds left before the mole drops; 0 when the hole is empty. */
  up: number;
}

export interface Bonk {
  x: number;
  y: number;
  age: number;
}

export interface WhackAMoleState {
  holes: Hole[];
  bonks: Bonk[];
  timeLeft: number;
  /** Seconds until the next mole pops up. */
  nextPop: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  const holes = ROWS.flatMap((y) => COLUMNS.map((x) => ({ x, y, up: 0 })));
  return {
    holes,
    bonks: [],
    timeLeft: ROUND_TIME,
    nextPop: START_INTERVAL,
    score: 0,
    phase: 'playing',
  };
}

/** Moles pop up more often as the round goes on, from START_INTERVAL down to END_INTERVAL. */
export function popInterval(timeLeft: number): number {
  const progress = 1 - Math.max(0, Math.min(timeLeft, ROUND_TIME)) / ROUND_TIME;
  return START_INTERVAL + (END_INTERVAL - START_INTERVAL) * progress;
}

export function isOverHole(hole: Hole, x: number, y: number): boolean {
  return Math.hypot(x - hole.x, y - hole.y) <= HOLE_RADIUS;
}

/** Whacks at a point. Returns true if it hit a mole that was up. */
export function whack(state: WhackAMoleState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const hole = state.holes.find((h) => h.up > 0 && isOverHole(h, x, y));
  if (!hole) return false;
  hole.up = 0;
  state.score += POINTS_PER_MOLE;
  state.bonks.push({ x: hole.x, y: hole.y, age: 0 });
  return true;
}

/**
 * Advances the game by `dt` seconds. `random` picks which empty hole a mole
 * pops out of, and is a parameter so tests can choose.
 */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random): void {
  for (const bonk of state.bonks) bonk.age += dt;
  state.bonks = state.bonks.filter((b) => b.age < 0.3);

  if (state.phase !== 'playing') return;

  for (const hole of state.holes) hole.up = Math.max(0, hole.up - dt);

  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.timeLeft === 0) {
    state.phase = 'over';
    for (const hole of state.holes) hole.up = 0;
    return;
  }

  state.nextPop -= dt;
  while (state.nextPop <= 0) {
    const empty = state.holes.filter((h) => h.up === 0);
    if (empty.length > 0) {
      const index = Math.min(Math.floor(random() * empty.length), empty.length - 1);
      empty[index].up = UP_TIME;
    }
    state.nextPop += popInterval(state.timeLeft);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The counter the holes sit in.
  ctx.fillStyle = colors.wood;
  ctx.fillRect(80, 70, WIDTH - 160, HEIGHT - 130);

  for (const hole of state.holes) {
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y, HOLE_RADIUS, HOLE_RADIUS * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    if (hole.up === 0) continue;

    // The mole rises quickly, then sinks in its last moments, hidden below the rim.
    const rise = Math.min(1, (UP_TIME - hole.up) / 0.1, hole.up / 0.15);
    const top = hole.y + 10 - 40 * rise;
    ctx.save();
    ctx.beginPath();
    ctx.rect(hole.x - HOLE_RADIUS, hole.y - HOLE_RADIUS * 2, HOLE_RADIUS * 2, HOLE_RADIUS * 2);
    ctx.clip();
    ctx.fillStyle = colors.muted;
    ctx.beginPath();
    ctx.arc(hole.x, top, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.background;
    ctx.beginPath();
    ctx.arc(hole.x - 11, top - 8, 4, 0, Math.PI * 2);
    ctx.arc(hole.x + 11, top - 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.stripeA;
    ctx.beginPath();
    ctx.arc(hole.x, top + 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 4;
  for (const bonk of state.bonks) {
    ctx.globalAlpha = 1 - bonk.age / 0.3;
    ctx.beginPath();
    ctx.arc(bonk.x, bonk.y - 20, 20 + bonk.age * 120, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(state.timeLeft)}s`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description: 'Whack the moles before they duck back down. They pop up faster as time runs out.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      whack(
        state,
        ((event.clientX - rect.left) / rect.width) * WIDTH,
        ((event.clientY - rect.top) / rect.height) * HEIGHT,
      );
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the round.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(whackAMole.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default whackAMole;
