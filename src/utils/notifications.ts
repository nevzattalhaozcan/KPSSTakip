import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';

export const configureNotifications = () => {
  PushNotification.configure({
    onRegister: function (token) {
      console.log('TOKEN:', token);
    },
    onNotification: function (notification) {
      console.log('NOTIFICATION:', notification);
    },
    onAction: function (notification) {
      console.log('ACTION:', notification.action);
    },
    onRegistrationError: function(err) {
      console.error(err.message, err);
    },
    permissions: {
      alert: true,
      badge: true,
      sound: true,
    },
    popInitialNotification: true,
    requestPermissions: Platform.OS === 'ios',
  });

  if (Platform.OS === 'android') {
    PushNotification.createChannel(
      {
        channelId: 'default-channel-id',
        channelName: 'Default Channel',
        channelDescription: 'A default channel for notifications',
        playSound: false,
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`createChannel returned '${created}'`)
    );
  }
};

export const scheduleWeeklyReminders = () => {
  console.log('Weekly reminders scheduled');
};

export const scheduleEveningMotivation = () => {
  console.log('Evening motivation scheduled');
};

export const cancelAllNotifications = () => {
  PushNotification.cancelAllLocalNotifications();
};

export const sendTestNotification = async (): Promise<boolean> => {
  try {
    PushNotification.localNotification({
      channelId: 'default-channel-id',
      title: 'Test Bildirim',
      message: 'Bu bir test bildirimidir! 🔔',
      playSound: true,
      soundName: 'default',
    });
    return true;
  } catch (error) {
    console.error('Test notification error:', error);
    return false;
  }
};

export const scheduleCustomNotifications = async () => {
  // This can be implemented to schedule custom notifications
  console.log('Custom notifications scheduled');
};

export const loadNotificationSettings = async () => {
  // Mock notification settings
  return {
    enabled: true,
    sound: true,
    vibration: true,
    dailyReminders: true,
    weeklyReports: true
  };
};

export const sendLocalNotification = (title: string, message: string) => {
  PushNotification.localNotification({
    channelId: 'default-channel-id',
    title,
    message,
    playSound: true,
    soundName: 'default',
  });
};
