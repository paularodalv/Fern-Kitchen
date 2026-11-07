import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { KitchenTimerRepository, type StoredKitchenTimer } from '@/database/repositories/KitchenTimerRepository';
import { completeTimerIfExpired, pauseTimer, resetTimer, resumeTimer, startTimer, type TimerState } from '@/features/kitchen/timer-state';
import { cancelLocalReminder, scheduleLocalReminder } from '@/services/notifications';

const asState = (timer: StoredKitchenTimer): TimerState => ({ status: timer.status, remainingMs: timer.remainingMs, targetEndAt: timer.targetEndAt });

export function useRecipeTimer(recipeId: string, stepId: string, title: string, minutes: number) {
  const database = useSQLiteContext();
  const repository = useMemo(() => new KitchenTimerRepository(database), [database]);
  const durationMs = minutes * 60_000;
  const [timer, setTimer] = useState<TimerState>(() => resetTimer(durationMs));
  const [notificationId, setNotificationId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [notificationMessage, setNotificationMessage] = useState('');

  const persist = useCallback(async (next: TimerState, nextNotificationId: string | null) => {
    const record: StoredKitchenTimer = {
      id: stepId,
      recipeId,
      stepId,
      ...next,
      notificationId: nextNotificationId,
      updatedAt: new Date().toISOString(),
    };
    await repository.save(record);
    setTimer(next);
    setNotificationId(nextNotificationId);
  }, [recipeId, repository, stepId]);

  const sync = useCallback(async () => {
    const stored = await repository.getForStep(stepId);
    if (!stored) {
      setTimer(resetTimer(durationMs));
      setNotificationId(null);
      return;
    }
    const current = asState(stored);
    const normalized = completeTimerIfExpired(current, Date.now());
    if (normalized.status !== current.status) await repository.save({ ...stored, ...normalized, updatedAt: new Date().toISOString() });
    setTimer(normalized);
    setNotificationId(stored.notificationId);
  }, [durationMs, repository, stepId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    sync().catch((cause: unknown) => {
      if (active) setNotificationMessage(cause instanceof Error ? cause.message : 'No se pudo recuperar el temporizador.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sync]);

  useEffect(() => {
    if (timer.status !== 'running') return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timer.status]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNow(Date.now());
        void sync().catch(() => setNotificationMessage('No se pudo actualizar el temporizador.'));
      }
    });
    return () => subscription.remove();
  }, [sync]);

  const schedule = useCallback(async (targetEndAt: number) => {
    try {
      setNotificationMessage('');
      return await scheduleLocalReminder('¡Tiempo cumplido!', `${title} ha terminado.`, new Date(targetEndAt));
    } catch {
      setNotificationMessage('Activa las notificaciones para recibir el aviso con la aplicación cerrada.');
      return null;
    }
  }, [title]);

  const cancel = useCallback(async () => {
    if (!notificationId) return;
    try { await cancelLocalReminder(notificationId); } catch { /* The timer state still remains authoritative. */ }
  }, [notificationId]);

  const start = useCallback(async () => {
    const next = startTimer(durationMs, Date.now());
    const scheduled = await schedule(next.targetEndAt!);
    await persist(next, scheduled);
  }, [durationMs, persist, schedule]);

  const pause = useCallback(async () => {
    const next = pauseTimer(timer, Date.now());
    await cancel();
    await persist(next, null);
  }, [cancel, persist, timer]);

  const resume = useCallback(async () => {
    const next = resumeTimer(timer, Date.now());
    if (next.status === 'running' && next.targetEndAt !== null) {
      const scheduled = await schedule(next.targetEndAt);
      await persist(next, scheduled);
    }
  }, [persist, schedule, timer]);

  const reset = useCallback(async () => {
    await cancel();
    await persist(resetTimer(durationMs), null);
  }, [cancel, durationMs, persist]);

  const remainingMs = timer.status === 'running' && timer.targetEndAt !== null
    ? Math.max(0, timer.targetEndAt - now)
    : timer.remainingMs;

  useEffect(() => {
    if (timer.status !== 'running' || remainingMs > 0) return;
    const completed = completeTimerIfExpired(timer, now);
    setTimer(completed);
    void persist(completed, notificationId).catch(() => setNotificationMessage('El temporizador terminó, pero no se pudo guardar el estado.'));
  }, [now, notificationId, persist, remainingMs, timer]);

  return { timer, remainingMs, loading, notificationMessage, start, pause, resume, reset };
}
