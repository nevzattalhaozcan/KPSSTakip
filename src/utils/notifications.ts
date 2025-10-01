import PushNotification from 'react-native-push-notification';
import {Platform, PermissionsAndroid} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Notification settings interface
export interface NotificationSettings {
  enabled: boolean;
  dailyReminders: {
    enabled: boolean;
    time: string; // HH:MM format
    subjects: string[];
  };
  studyReminders: {
    enabled: boolean;
    interval: number; // minutes (15, 30, 60, 120)
    sound: boolean;
    vibration: boolean;
  };
  progressReports: {
    enabled: boolean;
    time: string; // HH:MM format
    frequency: 'daily' | 'weekly';
  };
  motivational: {
    enabled: boolean;
    frequency: 'morning' | 'evening' | 'both';
    morningTime: string;
    eveningTime: string;
  };
  breakReminders: {
    enabled: boolean;
    interval: number; // minutes (25, 45, 90)
  };
  goalReminders: {
    enabled: boolean;
    time: string; // HH:MM format
  };
  sound: string; // 'default', 'bell', 'chime', 'none'
  priority: 'low' | 'normal' | 'high';
}

// Default notification settings
export const defaultNotificationSettings: NotificationSettings = {
  enabled: true,
  dailyReminders: {
    enabled: true,
    time: '09:00',
    subjects: ['Türkçe', 'Matematik', 'Tarih', 'Coğrafya', 'Vatandaşlık'],
  },
  studyReminders: {
    enabled: true,
    interval: 30,
    sound: true,
    vibration: true,
  },
  progressReports: {
    enabled: true,
    time: '21:00',
    frequency: 'daily',
  },
  motivational: {
    enabled: true,
    frequency: 'both',
    morningTime: '08:00',
    eveningTime: '20:00',
  },
  breakReminders: {
    enabled: true,
    interval: 25, // Pomodoro technique
  },
  goalReminders: {
    enabled: true,
    time: '19:00',
  },
  sound: 'default',
  priority: 'normal',
};

// Storage functions
export const saveNotificationSettings = async (settings: NotificationSettings) => {
  try {
    await AsyncStorage.setItem('notificationSettings', JSON.stringify(settings));
    console.log('Notification settings saved');
    return true;
  } catch (error) {
    console.log('Error saving notification settings:', error);
    return false;
  }
};

export const loadNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const settings = await AsyncStorage.getItem('notificationSettings');
    if (settings) {
      return { ...defaultNotificationSettings, ...JSON.parse(settings) };
    }
    return defaultNotificationSettings;
  } catch (error) {
    console.log('Error loading notification settings:', error);
    return defaultNotificationSettings;
  }
};
export const checkNotificationPermission = async () => {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
      const hasPermission = await PermissionsAndroid.check(permission);
      
      if (!hasPermission) {
        const result = await PermissionsAndroid.request(permission);
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
      return hasPermission;
    } catch (error) {
      console.log('Permission check error:', error);
      return false;
    }
  }
  return true; // iOS veya eski Android sürümleri için
};

// Android 12+ için exact alarm izni kontrol et
export const checkExactAlarmPermission = async () => {
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    // React Native'de exact alarm permission check için native kod gerekli
    // Şimdilik true döndürüyoruz çünkü manifest'te izin var
    return true;
  }
  return true;
};

// Bildirim kanalını yapılandır (Android için)
export const configureNotifications = async () => {
  try {
    // Android 13+ için bildirim izni kontrolü
    const hasNotificationPermission = await checkNotificationPermission();
    if (!hasNotificationPermission) {
      console.log('Notification permission denied');
      return false;
    }

    // Android 12+ için exact alarm izni kontrolü
    const hasExactAlarmPermission = await checkExactAlarmPermission();
    if (!hasExactAlarmPermission) {
      console.log('Exact alarm permission denied');
      return false;
    }

    PushNotification.configure({
      onRegister: function (token) {
        console.log('TOKEN:', token);
      },
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });

    // Android için bildirim kanalı oluştur
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'kpss-channel',
          channelName: 'KPSS Hatırlatıcılar',
          channelDescription: 'KPSS çalışma hatırlatıcıları',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Kanal oluşturuldu: ${created}`)
      );
    }
    
    return true;
  } catch (error) {
    console.log('Notification configuration error:', error);
    return false;
  }
};

// Schedule notifications based on user settings
export const scheduleCustomNotifications = async () => {
  try {
    const settings = await loadNotificationSettings();
    
    if (!settings.enabled) {
      console.log('Notifications disabled by user');
      return false;
    }

    // Clear existing notifications first
    cancelAllNotifications();

    // İzin kontrolü
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) {
      console.log('No notification permission');
      return false;
    }

    // Daily study reminders
    if (settings.dailyReminders.enabled) {
      await scheduleDailyStudyReminders(settings);
    }

    // Progress reports
    if (settings.progressReports.enabled) {
      await scheduleProgressReports(settings);
    }

    // Motivational messages
    if (settings.motivational.enabled) {
      await scheduleMotivationalMessages(settings);
    }

    // Goal reminders
    if (settings.goalReminders.enabled) {
      await scheduleGoalReminders(settings);
    }

    console.log('Custom notifications scheduled successfully');
    return true;
  } catch (error) {
    console.log('Error scheduling custom notifications:', error);
    return false;
  }
};

// Schedule daily study reminders
const scheduleDailyStudyReminders = async (settings: NotificationSettings) => {
  const [hour, minute] = settings.dailyReminders.time.split(':').map(Number);
  
  const schedule = [
    { day: 1, subject: 'Türkçe' },
    { day: 2, subject: 'Matematik' },
    { day: 3, subject: 'Tarih' },
    { day: 4, subject: 'Coğrafya' },
    { day: 5, subject: 'Vatandaşlık' },
    { day: 6, subject: 'Tekrar' },
    { day: 0, subject: 'Test Çözme' },
  ];

  schedule.forEach((item) => {
    if (settings.dailyReminders.subjects.includes(item.subject)) {
      const now = new Date();
      const targetDay = item.day;
      const currentDay = now.getDay();
      
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget < 0) {
        daysUntilTarget += 7;
      } else if (daysUntilTarget === 0 && now.getHours() >= hour) {
        daysUntilTarget = 7;
      }

      const scheduledDate = new Date(now);
      scheduledDate.setDate(now.getDate() + daysUntilTarget);
      scheduledDate.setHours(hour, minute, 0, 0);

      PushNotification.localNotificationSchedule({
        channelId: 'kpss-channel',
        id: `daily_${item.day}`,
        title: '📚 KPSS Çalışma Zamanı!',
        message: `Bugün ${item.subject} çalışma günü! Haydi başlayalım! 🎯`,
        date: scheduledDate,
        repeatType: 'week',
        playSound: settings.sound !== 'none',
        soundName: settings.sound === 'default' ? 'default' : `${settings.sound}.mp3`,
      });
    }
  });
};

// Schedule progress report notifications
const scheduleProgressReports = async (settings: NotificationSettings) => {
  const [hour, minute] = settings.progressReports.time.split(':').map(Number);
  const now = new Date();
  const scheduledTime = new Date(now);
  scheduledTime.setHours(hour, minute, 0, 0);

  if (scheduledTime.getTime() <= now.getTime()) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  PushNotification.localNotificationSchedule({
    channelId: 'kpss-channel',
    id: 'progress_report',
    title: '📊 Günlük İlerleme Raporu',
    message: 'Bugünkü çalışma raporunu kontrol et! 📈',
    date: scheduledTime,
    repeatType: settings.progressReports.frequency === 'daily' ? 'day' : 'week',
    playSound: settings.sound !== 'none',
    soundName: settings.sound === 'default' ? 'default' : `${settings.sound}.mp3`,
  });
};

// Schedule motivational messages
const scheduleMotivationalMessages = async (settings: NotificationSettings) => {
  const motivationalMessages = [
    'Başarı, hazırlığın fırsatla buluşmasıdır! 🌟',
    'Her gün biraz daha ileri! Sen yapabilirsin! 💪',
    'KPSS\'de başarının sırrı düzenli çalışmada! 📚',
    'Bugün de hedefine bir adım daha yaklaştın! 🎯',
    'Azim ve kararlılık seni zirveye taşıyacak! 🏆',
  ];

  if (settings.motivational.frequency === 'morning' || settings.motivational.frequency === 'both') {
    const [hour, minute] = settings.motivational.morningTime.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hour, minute, 0, 0);

    if (scheduledTime.getTime() <= now.getTime()) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    PushNotification.localNotificationSchedule({
      channelId: 'kpss-channel',
      id: 'motivation_morning',
      title: '🌅 Günaydın Şampiyon!',
      message: motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)],
      date: scheduledTime,
      repeatType: 'day',
      playSound: settings.sound !== 'none',
    });
  }

  if (settings.motivational.frequency === 'evening' || settings.motivational.frequency === 'both') {
    const [hour, minute] = settings.motivational.eveningTime.split(':').map(Number);
    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hour, minute, 0, 0);

    if (scheduledTime.getTime() <= now.getTime()) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    PushNotification.localNotificationSchedule({
      channelId: 'kpss-channel',
      id: 'motivation_evening',
      title: '🌟 Günü Değerlendir',
      message: motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)],
      date: scheduledTime,
      repeatType: 'day',
      playSound: settings.sound !== 'none',
    });
  }
};

// Schedule goal reminders
const scheduleGoalReminders = async (settings: NotificationSettings) => {
  const [hour, minute] = settings.goalReminders.time.split(':').map(Number);
  const now = new Date();
  const scheduledTime = new Date(now);
  scheduledTime.setHours(hour, minute, 0, 0);

  if (scheduledTime.getTime() <= now.getTime()) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  PushNotification.localNotificationSchedule({
    channelId: 'kpss-channel',
    id: 'goal_reminder',
    title: '� Günlük Hedef Kontrolü',
    message: 'Bugünkü hedeflerini kontrol et ve yeni hedefler belirle!',
    date: scheduledTime,
    repeatType: 'day',
    playSound: settings.sound !== 'none',
  });
};

// Study session notifications (during active study)
export const scheduleStudySessionNotifications = async (sessionDurationMinutes: number) => {
  const settings = await loadNotificationSettings();
  
  if (!settings.studyReminders.enabled) return;

  // Pomodoro break reminder
  if (settings.breakReminders.enabled) {
    const breakTime = new Date(Date.now() + settings.breakReminders.interval * 60 * 1000);
    
    PushNotification.localNotificationSchedule({
      channelId: 'kpss-channel',
      id: 'break_reminder',
      title: '⏰ Mola Zamanı!',
      message: `${settings.breakReminders.interval} dakika çalıştın. 5 dakika mola ver!`,
      date: breakTime,
      playSound: settings.studyReminders.sound,
      vibrate: settings.studyReminders.vibration,
    });
  }

  // Study session end reminder
  const sessionEndTime = new Date(Date.now() + sessionDurationMinutes * 60 * 1000);
  
  PushNotification.localNotificationSchedule({
    channelId: 'kpss-channel',
    id: 'session_end',
    title: '✅ Çalışma Seansı Tamamlandı!',
    message: 'Harika! İlerlemeni kaydetmeyi unutma! 📊',
    date: sessionEndTime,
    playSound: settings.studyReminders.sound,
  });
};

// Tüm bildirimleri iptal et
export const cancelAllNotifications = () => {
  PushNotification.cancelAllLocalNotifications();
  console.log('Tüm bildirimler iptal edildi');
};

// Belirli bir bildirimi iptal et
export const cancelNotification = (id: string) => {
  PushNotification.cancelLocalNotification(id);
};

// Test bildirimi gönder
export const sendTestNotification = async () => {
  try {
    // İzin kontrolü
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) {
      console.log('No notification permission for test');
      return false;
    }

    PushNotification.localNotification({
      channelId: 'kpss-channel',
      title: 'Test Bildirimi',
      message: 'Bildirimler çalışıyor! ✅',
    });
    
    return true;
  } catch (error) {
    console.log('Error sending test notification:', error);
    return false;
  }
};