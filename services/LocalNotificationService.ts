export type LocalNotificationRequest = { title: string; body: string; scheduledAt: Date; data?: Record<string, string> };

export type LocalNotificationAdapter = {
  requestPermission: () => Promise<boolean>;
  schedule: (request: LocalNotificationRequest) => Promise<string>;
  cancel: (notificationId: string) => Promise<void>;
};

export class LocalNotificationService {
  constructor(private readonly adapter: LocalNotificationAdapter) {}

  async schedule(request: LocalNotificationRequest): Promise<string | null> {
    if (request.scheduledAt.getTime() <= Date.now()) throw new RangeError('El recordatorio debe programarse para una hora futura.');
    if (!await this.adapter.requestPermission()) return null;
    return this.adapter.schedule(request);
  }

  async cancel(notificationId: string | null): Promise<void> {
    if (notificationId) await this.adapter.cancel(notificationId);
  }
}
