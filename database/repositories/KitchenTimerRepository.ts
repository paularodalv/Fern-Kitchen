import type { SQLiteDatabase } from 'expo-sqlite';
import type { TimerState } from '../../features/kitchen/timer-state';

export type StoredKitchenTimer = TimerState & {
  id: string;
  recipeId: string;
  stepId: string;
  notificationId: string | null;
  updatedAt: string;
};

type TimerRow = Omit<StoredKitchenTimer, 'status'> & { status: StoredKitchenTimer['status'] };

const selectTimer = `SELECT id, recipe_id AS recipeId, step_id AS stepId, status,
  remaining_ms AS remainingMs, target_end_at AS targetEndAt,
  notification_id AS notificationId, updated_at AS updatedAt FROM kitchen_timers`;

export class KitchenTimerRepository {
  constructor(private readonly database: SQLiteDatabase) {}

  async getForStep(stepId: string): Promise<StoredKitchenTimer | null> {
    const row = await this.database.getFirstAsync<TimerRow>(`${selectTimer} WHERE step_id = ? LIMIT 1;`, stepId);
    return row ? normalize(row) : null;
  }

  async listForRecipe(recipeId: string): Promise<StoredKitchenTimer[]> {
    const rows = await this.database.getAllAsync<TimerRow>(`${selectTimer} WHERE recipe_id = ?;`, recipeId);
    return rows.map(normalize);
  }

  async save(timer: StoredKitchenTimer): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO kitchen_timers
       (id, recipe_id, step_id, status, remaining_ms, target_end_at, notification_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(step_id) DO UPDATE SET
         status = excluded.status, remaining_ms = excluded.remaining_ms,
         target_end_at = excluded.target_end_at, notification_id = excluded.notification_id,
         updated_at = excluded.updated_at;`,
      timer.id, timer.recipeId, timer.stepId, timer.status, timer.remainingMs,
      timer.targetEndAt, timer.notificationId, timer.updatedAt,
    );
  }
}

function normalize(row: TimerRow): StoredKitchenTimer {
  return { ...row, remainingMs: Number(row.remainingMs), targetEndAt: row.targetEndAt === null ? null : Number(row.targetEndAt) };
}
