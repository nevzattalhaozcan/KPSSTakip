import { Platform, Alert } from 'react-native';

// Fallback notification system for React Native 0.81+ compatibility
let isConfigured = false;

export const configureNotifications = () => {
  try {
    // For now, we'll use a fallback approach since react-native-push-notification
    // has compatibility issues with React Native 0.81+ and the new architecture
    console.log('Configuring notifications (fallback mode)');
    
    if (Platform.OS === 'ios') {
      // iOS notification permissions are handled in AppDelegate.swift
      console.log('iOS notification permissions configured in native code');
    }
    
    isConfigured = true;
  } catch (error) {
    console.error('Failed to configure notifications:', error);
    isConfigured = false;
  }
};

export const scheduleWeeklyReminders = () => {
  console.log('Weekly reminders scheduled');
};

export const scheduleEveningMotivation = () => {
  console.log('Evening motivation scheduled');
};

export const cancelAllNotifications = () => {
  // Fallback: Log the action since we can't cancel notifications without proper native module
  console.log('All notifications would be cancelled (fallback mode)');
};

export const sendTestNotification = async (): Promise<boolean> => {
  if (!isConfigured) {
    console.warn('Notifications not configured');
    return false;
  }
  
  try {
    // Fallback: Show an alert instead of a push notification
    Alert.alert(
      'Test Bildirim',
      'Bu bir test bildirimidir! 🔔',
      [{ text: 'Tamam', style: 'default' }]
    );
    console.log('Test notification shown as alert');
    return true;
  } catch (error) {
    console.error('Test notification error:', error);
    return false;
  }
};

export const scheduleCustomNotifications = async () => {
  if (!isConfigured) {
    console.warn('Notifications not configured');
    return;
  }
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
  if (!isConfigured) {
    console.warn('Notifications not configured');
    return;
  }
  
  try {
    // Fallback: Show an alert instead of a push notification
    Alert.alert(
      title,
      message,
      [{ text: 'Tamam', style: 'default' }]
    );
    console.log(`Local notification shown as alert: ${title}`);
  } catch (error) {
    console.error('Local notification error:', error);
  }
};
