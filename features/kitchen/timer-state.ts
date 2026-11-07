export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export type TimerState = {
  status: TimerStatus;
  remainingMs: number;
  targetEndAt: number | null;
};

export function remainingMilliseconds(timer: TimerState, now: number): number {
  if (timer.status !== 'running' || timer.targetEndAt === null) return Math.max(0, timer.remainingMs);
  return Math.max(0, timer.targetEndAt - now);
}

export function startTimer(durationMs: number, now: number): TimerState {
  assertDuration(durationMs);
  return { status: 'running', remainingMs: durationMs, targetEndAt: now + durationMs };
}

export function pauseTimer(timer: TimerState, now: number): TimerState {
  if (timer.status !== 'running') return timer;
  const remainingMs = remainingMilliseconds(timer, now);
  return remainingMs === 0
    ? { status: 'completed', remainingMs: 0, targetEndAt: null }
    : { status: 'paused', remainingMs, targetEndAt: null };
}

export function resumeTimer(timer: TimerState, now: number): TimerState {
  if (timer.status !== 'paused' || timer.remainingMs <= 0) return timer;
  return { status: 'running', remainingMs: timer.remainingMs, targetEndAt: now + timer.remainingMs };
}

export function resetTimer(durationMs: number): TimerState {
  assertDuration(durationMs);
  return { status: 'idle', remainingMs: durationMs, targetEndAt: null };
}

export function completeTimerIfExpired(timer: TimerState, now: number): TimerState {
  if (timer.status !== 'running' || remainingMilliseconds(timer, now) > 0) return timer;
  return { status: 'completed', remainingMs: 0, targetEndAt: null };
}

function assertDuration(durationMs: number): void {
  if (!Number.isSafeInteger(durationMs) || durationMs <= 0) {
    throw new RangeError('La duración del temporizador debe ser un entero positivo en milisegundos.');
  }
}
