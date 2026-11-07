import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function scheduleLocalReminder(title: string, body: string, date: Date): Promise<string> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('kitchen-reminders', {
      name: 'Recordatorios de cocina',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#315b3f',
    });
  }

  const permission = await Notifications.getPermissionsAsync();
  const { status } = permission.granted
    ? permission
    : await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Se necesita permiso para programar recordatorios.');
  }

  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      ...(Platform.OS === 'android' ? { channelId: 'kitchen-reminders' } : {}),
    },
  });
}

export function cancelLocalReminder(notificationId: string): Promise<void> {
  return Notifications.cancelScheduledNotificationAsync(notificationId);
}
