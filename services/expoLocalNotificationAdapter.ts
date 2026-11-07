import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { LocalNotificationAdapter } from './LocalNotificationService';

export const expoLocalNotificationAdapter: LocalNotificationAdapter = {
  async requestPermission() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('fermentation-reminders', {
        name: 'Recordatorios de fermentación',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 180, 120, 180],
        lightColor: '#548B35',
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    return (await Notifications.requestPermissionsAsync()).granted;
  },
  schedule(request) {
    return Notifications.scheduleNotificationAsync({
      content: {
        title: request.title,
        body: request.body,
        data: request.data,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: request.scheduledAt,
        ...(Platform.OS === 'android' ? { channelId: 'fermentation-reminders' } : {}),
      },
    });
  },
  cancel(notificationId) {
    return Notifications.cancelScheduledNotificationAsync(notificationId);
  },
};
