import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReportNotification {
  id: string;
  title: string;
  message: string;
  type: 'daily' | 'weekly' | 'monthly';
  scheduledTime: string;
  isActive: boolean;
  lastSent?: string;
}

const REPORT_STORAGE_KEY = '@report_notifications';

export const getReportNotifications = async (): Promise<ReportNotification[]> => {
  try {
    const data = await AsyncStorage.getItem(REPORT_STORAGE_KEY);
    return data ? JSON.parse(data) : getDefaultReportNotifications();
  } catch (error) {
    console.error('Error loading report notifications:', error);
    return getDefaultReportNotifications();
  }
};

export const saveReportNotifications = async (notifications: ReportNotification[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error('Error saving report notifications:', error);
  }
};

export const getDefaultReportNotifications = (): ReportNotification[] => {
  return [
    {
      id: 'daily-progress',
      title: 'Günlük İlerleme Raporu',
      message: 'Bugünkü çalışma ilerlemenizi değerlendirin!',
      type: 'daily',
      scheduledTime: '21:00',
      isActive: true
    },
    {
      id: 'weekly-summary',
      title: 'Haftalık Özet',
      message: 'Bu hafta ne kadar başarılı oldunuz? Hedeflerinizi kontrol edin.',
      type: 'weekly',
      scheduledTime: '19:00',
      isActive: true
    },
    {
      id: 'monthly-review',
      title: 'Aylık Değerlendirme',
      message: 'Aylık çalışma performansınızı gözden geçirin.',
      type: 'monthly',
      scheduledTime: '20:00',
      isActive: false
    }
  ];
};

export const scheduleReportNotification = (notification: ReportNotification): void => {
  if (!notification.isActive) return;
  
  const [hours, minutes] = notification.scheduledTime.split(':').map(Number);
  
  switch (notification.type) {
    case 'daily':
      PushNotification.localNotificationSchedule({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        date: getNextDailyDate(hours, minutes),
        repeatType: 'day',
        allowWhileIdle: true,
      });
      break;
      
    case 'weekly':
      PushNotification.localNotificationSchedule({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        date: getNextWeeklyDate(hours, minutes), // Sunday
        repeatType: 'week',
        allowWhileIdle: true,
      });
      break;
      
    case 'monthly':
      PushNotification.localNotificationSchedule({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        date: getNextMonthlyDate(hours, minutes), // First day of month
        repeatType: 'day', // Use day repeat and handle monthly logic manually
        allowWhileIdle: true,
      });
      break;
  }
};

export const scheduleAllReportNotifications = async (): Promise<void> => {
  try {
    const notifications = await getReportNotifications();
    
    // Cancel existing report notifications
    notifications.forEach(notification => {
      PushNotification.cancelLocalNotification(notification.id);
    });
    
    // Schedule active notifications
    notifications.filter(n => n.isActive).forEach(notification => {
      scheduleReportNotification(notification);
    });
  } catch (error) {
    console.error('Error scheduling report notifications:', error);
  }
};

export const toggleReportNotification = async (id: string, isActive: boolean): Promise<void> => {
  try {
    const notifications = await getReportNotifications();
    const index = notifications.findIndex(n => n.id === id);
    
    if (index !== -1) {
      notifications[index].isActive = isActive;
      await saveReportNotifications(notifications);
      
      if (isActive) {
        scheduleReportNotification(notifications[index]);
      } else {
        PushNotification.cancelLocalNotification(id);
      }
    }
  } catch (error) {
    console.error('Error toggling report notification:', error);
  }
};

export const updateReportNotificationTime = async (id: string, time: string): Promise<void> => {
  try {
    const notifications = await getReportNotifications();
    const index = notifications.findIndex(n => n.id === id);
    
    if (index !== -1) {
      notifications[index].scheduledTime = time;
      await saveReportNotifications(notifications);
      
      // Reschedule if active
      if (notifications[index].isActive) {
        PushNotification.cancelLocalNotification(id);
        scheduleReportNotification(notifications[index]);
      }
    }
  } catch (error) {
    console.error('Error updating report notification time:', error);
  }
};

const getNextDailyDate = (hours: number, minutes: number): Date => {
  const now = new Date();
  const today = new Date(now);
  today.setHours(hours, minutes, 0, 0);
  
  if (today > now) {
    return today;
  } else {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
};

const getNextWeeklyDate = (hours: number, minutes: number): Date => {
  const now = new Date();
  const sunday = new Date(now);
  
  // Get next Sunday
  const daysUntilSunday = (7 - now.getDay()) % 7;
  sunday.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  sunday.setHours(hours, minutes, 0, 0);
  
  return sunday;
};

const getNextMonthlyDate = (hours: number, minutes: number): Date => {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  firstOfMonth.setHours(hours, minutes, 0, 0);
  
  return firstOfMonth;
};

// Alias functions for backward compatibility
export const scheduleEndOfDayNotification = scheduleReportNotification;
export const showDailyReportReadyNotification = () => {
  PushNotification.localNotification({
    title: 'Günlük Rapor Hazır',
    message: 'Bugünkü çalışma raporunuz hazır!',
    playSound: true,
    soundName: 'default',
  });
};