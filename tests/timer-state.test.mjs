import assert from 'node:assert/strict';
import test from 'node:test';
import { completeTimerIfExpired, pauseTimer, remainingMilliseconds, resetTimer, resumeTimer, startTimer } from '../features/kitchen/timer-state.ts';

test('a running timer derives remaining time from its absolute end time', () => {
  const timer = startTimer(90_000, 1_000);
  assert.equal(timer.targetEndAt, 91_000);
  assert.equal(remainingMilliseconds(timer, 20_000), 71_000);
  assert.equal(remainingMilliseconds(timer, 95_000), 0);
});

test('pause captures remaining time and resume creates a new target date', () => {
  const started = startTimer(120_000, 10_000);
  const paused = pauseTimer(started, 45_000);
  assert.equal(paused.status, 'paused');
  assert.equal(paused.remainingMs, 85_000);
  assert.equal(paused.targetEndAt, null);

  const resumed = resumeTimer(paused, 200_000);
  assert.equal(resumed.status, 'running');
  assert.equal(resumed.targetEndAt, 285_000);
  assert.equal(remainingMilliseconds(resumed, 240_000), 45_000);
});

test('expired timers become completed even when the app was not ticking', () => {
  const started = startTimer(1_000, 50_000);
  const completed = completeTimerIfExpired(started, 80_000);
  assert.deepEqual(completed, { status: 'completed', remainingMs: 0, targetEndAt: null });
  assert.equal(completeTimerIfExpired(completed, 90_000), completed);
});

test('reset restores a fresh idle duration and invalid durations are rejected', () => {
  assert.deepEqual(resetTimer(30_000), { status: 'idle', remainingMs: 30_000, targetEndAt: null });
  assert.throws(() => startTimer(0, 0), RangeError);
});
