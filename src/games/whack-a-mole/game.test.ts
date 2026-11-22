import { describe, expect, it } from 'vitest';
import {
  END_INTERVAL,
  POINTS_PER_MOLE,
  ROUND_TIME,
  START_INTERVAL,
  UP_TIME,
  createState,
  popInterval,
  step,
  whack,
} from './game';

const first = () => 0;

describe('whack-a-mole', () => {
  it('starts a full round with no score and every hole empty', () => {
    const state = createState();
    expect(state.timeLeft).toBe(ROUND_TIME);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.holes).toHaveLength(9);
    expect(state.holes.every((h) => h.up === 0)).toBe(true);
  });

  it('pops a mole up when the pop timer runs out', () => {
    const state = createState();
    step(state, START_INTERVAL, first);
    expect(state.holes[0].up).toBe(UP_TIME);
    expect(state.holes.filter((h) => h.up > 0)).toHaveLength(1);
  });

  it('pops only from empty holes', () => {
    const state = createState();
    state.holes[0].up = UP_TIME;
    state.nextPop = 0.01;
    step(state, 0.01, first);
    expect(state.holes[1].up).toBe(UP_TIME);
  });

  it('drops a mole back down after it has been up for its time', () => {
    const state = createState();
    state.holes[4].up = UP_TIME;
    state.nextPop = 10;
    step(state, UP_TIME, first);
    expect(state.holes[4].up).toBe(0);
  });

  it('scores a whack on a mole that is up, and puts it down', () => {
    const state = createState();
    const hole = state.holes[4];
    hole.up = UP_TIME;
    expect(whack(state, hole.x + 10, hole.y - 10)).toBe(true);
    expect(state.score).toBe(POINTS_PER_MOLE);
    expect(hole.up).toBe(0);
  });

  it('scores nothing for whacking an empty hole or missing', () => {
    const state = createState();
    const hole = state.holes[4];
    expect(whack(state, hole.x, hole.y)).toBe(false);
    hole.up = UP_TIME;
    expect(whack(state, 10, 10)).toBe(false);
    expect(state.score).toBe(0);
  });

  it('pops moles faster as the round goes on', () => {
    expect(popInterval(ROUND_TIME)).toBe(START_INTERVAL);
    expect(popInterval(ROUND_TIME / 2)).toBeLessThan(START_INTERVAL);
    expect(popInterval(ROUND_TIME / 2)).toBeGreaterThan(END_INTERVAL);
    expect(popInterval(0)).toBe(END_INTERVAL);
  });

  it('ends the round when time runs out and clears the moles', () => {
    const state = createState();
    state.holes[0].up = UP_TIME;
    state.timeLeft = 0.05;
    step(state, 0.1, first);
    expect(state.phase).toBe('over');
    expect(state.timeLeft).toBe(0);
    expect(state.holes.every((h) => h.up === 0)).toBe(true);
  });

  it('ignores whacks after the round is over', () => {
    const state = createState();
    state.phase = 'over';
    const hole = state.holes[0];
    hole.up = UP_TIME;
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(0);
  });
});
