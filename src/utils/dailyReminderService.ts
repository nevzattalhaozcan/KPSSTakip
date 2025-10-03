import PushNotification, { Importance } from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid } from 'react-native';

// Configuration interface for daily reminders
export interface DailyReminderConfig {
  enabled: boolean;
  studyReminder: {
    enabled: boolean;
    time: string; // Format: "HH:MM"
    title: string;
    message: string;
  };
  goalReminder: {
    enabled: boolean;
    time: string; // Format: "HH:MM"
    title: string;
    message: string;
  };
  progressReminder: {
    enabled: boolean;
    time: string; // Format: "HH:MM"
    title: string;
    message: string;
  };
  weeklyReview: {
    enabled: boolean;
    day: number; // 0=Sunday, 1=Monday, etc.
    time: string;
    title: string;
    message: string;
  };
  soundName: string;
  importance: 'default' | 'high' | 'low';
  vibrate: boolean;
}

// Default configuration
const DEFAULT_REMINDER_CONFIG: DailyReminderConfig = {
  enabled: true,
  studyReminder: {
    enabled: true,
    time: '09:00',
    title: '📚 Çalışma Zamanı!',
    message: 'Bugünkü KPSS çalışmana başlama zamanı geldi. Hedeflerine ulaşmak için şimdi başla!',
  },
  goalReminder: {
    enabled: true,
    time: '18:00',
    title: '🎯 Günlük Hedef Kontrolü',
    message: 'Bugünkü hedeflerini kontrol et. Tamamladıkların için kendini tebrik et!',
  },
  progressReminder: {
    enabled: true,
    time: '21:00',
    title: '📈 Günlük İlerleme',
    message: 'Bugün ne kadar ilerleme kaydettin? Çalışmalarını kaydetmeyi unutma!',
  },
  weeklyReview: {
    enabled: true,
    day: 0, // Sunday
    time: '19:00',
    title: '📊 Haftalık Değerlendirme',
    message: 'Bu hafta nasıl geçti? İlerlemeni gözden geçir ve gelecek hafta için plan yap!',
  },
  soundName: 'default',
  importance: 'high',
  vibrate: true,
};

class DailyReminderService {
  private static instance: DailyReminderService;
  private isInitialized = false;
  private readonly STORAGE_KEY = 'dailyReminderConfig';
  private readonly CHANNEL_ID = 'kpss_daily_reminders';

  static getInstance(): DailyReminderService {
    if (!DailyReminderService.instance) {
      DailyReminderService.instance = new DailyReminderService();
    }
    return DailyReminderService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request permissions
      await this.requestPermissions();
      
      // Create notification channel for Android
      this.createNotificationChannel();
      
      // Load and apply configuration
      const config = await this.getConfig();
      await this.scheduleReminders(config);
      
      this.isInitialized = true;
      console.log('Daily Reminder Service initialized successfully');
    } catch (error) {
      console.error('Error initializing Daily Reminder Service:', error);
      throw error;
    }
  }

  private async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Bildirim İzni',
            message: 'Günlük hatırlatmalar için bildirim izni gerekli',
            buttonNeutral: 'Daha Sonra',
            buttonNegative: 'İptal',
            buttonPositive: 'İzin Ver',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error('Permission request error:', error);
        return false;
      }
    }
    return true; // iOS permissions handled automatically
  }

  private createNotificationChannel(): void {
    PushNotification.createChannel(
      {
        channelId: this.CHANNEL_ID,
        channelName: 'KPSS Günlük Hatırlatmalar',
        channelDescription: 'Günlük çalışma hatırlatmaları ve hedef bildirimleri',
        playSound: true,
        soundName: 'default',
        importance: Importance.HIGH,
        vibrate: true,
      },
      (created) => {
        console.log(`Notification channel created: ${created}`);
      }
    );
  }

  async getConfig(): Promise<DailyReminderConfig> {
    try {
      const configData = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (configData) {
        const savedConfig = JSON.parse(configData);
        // Merge with defaults to ensure all properties exist
        return { ...DEFAULT_REMINDER_CONFIG, ...savedConfig };
      }
      return DEFAULT_REMINDER_CONFIG;
    } catch (error) {
      console.error('Error loading reminder config:', error);
      return DEFAULT_REMINDER_CONFIG;
    }
  }

  async saveConfig(config: DailyReminderConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
      
      // Re-schedule reminders with new config
      if (config.enabled) {
        await this.scheduleReminders(config);
      } else {
        await this.cancelAllReminders();
      }
    } catch (error) {
      console.error('Error saving reminder config:', error);
      throw error;
    }
  }

  async scheduleReminders(config: DailyReminderConfig): Promise<void> {
    try {
      // Cancel existing reminders first
      await this.cancelAllReminders();

      if (!config.enabled) return;

      const today = new Date();
      
      // Schedule daily reminders
      if (config.studyReminder.enabled) {
        await this.scheduleDailyReminder(
          'study_reminder',
          config.studyReminder,
          config
        );
      }

      if (config.goalReminder.enabled) {
        await this.scheduleDailyReminder(
          'goal_reminder',
          config.goalReminder,
          config
        );
      }

      if (config.progressReminder.enabled) {
        await this.scheduleDailyReminder(
          'progress_reminder',
          config.progressReminder,
          config
        );
      }

      // Schedule weekly review
      if (config.weeklyReview.enabled) {
        await this.scheduleWeeklyReminder(config.weeklyReview, config);
      }

      console.log('All daily reminders scheduled successfully');
    } catch (error) {
      console.error('Error scheduling reminders:', error);
      throw error;
    }
  }

  private async scheduleDailyReminder(
    id: string,
    reminder: { time: string; title: string; message: string },
    config: DailyReminderConfig
  ): Promise<void> {
    const [hours, minutes] = reminder.time.split(':').map(Number);
    
    // Schedule for the next 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      date.setHours(hours, minutes, 0, 0);
      
      // Skip if the time has already passed today
      if (i === 0 && date.getTime() <= Date.now()) {
        continue;
      }

      const notificationId = parseInt(`${this.hashCode(id)}${i.toString().padStart(2, '0')}`);

      PushNotification.localNotificationSchedule({
        id: notificationId,
        channelId: this.CHANNEL_ID,
        title: reminder.title,
        message: reminder.message,
        date: date,
        soundName: config.soundName,
        vibrate: config.vibrate,
        importance: config.importance,
        allowWhileIdle: true,
        ignoreInForeground: false,
        invokeApp: true,
        userInfo: {
          type: 'daily_reminder',
          reminderId: id,
          scheduledDate: date.toISOString(),
        },
      });
    }
  }

  private async scheduleWeeklyReminder(
    weeklyReminder: { day: number; time: string; title: string; message: string },
    config: DailyReminderConfig
  ): Promise<void> {
    const [hours, minutes] = weeklyReminder.time.split(':').map(Number);
    
    // Schedule for the next 12 weeks
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      const today = date.getDay();
      const daysUntilTarget = (weeklyReminder.day - today + 7) % 7;
      
      date.setDate(date.getDate() + daysUntilTarget + (i * 7));
      date.setHours(hours, minutes, 0, 0);
      
      // Skip if the time has already passed today and it's the same day
      if (i === 0 && daysUntilTarget === 0 && date.getTime() <= Date.now()) {
        continue;
      }

      const notificationId = parseInt(`${this.hashCode('weekly_review')}${i.toString().padStart(2, '0')}`);

      PushNotification.localNotificationSchedule({
        id: notificationId,
        channelId: this.CHANNEL_ID,
        title: weeklyReminder.title,
        message: weeklyReminder.message,
        date: date,
        soundName: config.soundName,
        vibrate: config.vibrate,
        importance: config.importance,
        allowWhileIdle: true,
        ignoreInForeground: false,
        invokeApp: true,
        userInfo: {
          type: 'weekly_reminder',
          reminderId: 'weekly_review',
          scheduledDate: date.toISOString(),
        },
      });
    }
  }

  async cancelAllReminders(): Promise<void> {
    try {
      // Cancel all scheduled notifications
      PushNotification.cancelAllLocalNotifications();
      console.log('All daily reminders cancelled');
    } catch (error) {
      console.error('Error cancelling reminders:', error);
    }
  }

  async sendTestReminder(type: 'study' | 'goal' | 'progress' | 'weekly'): Promise<void> {
    try {
      const config = await this.getConfig();
      let reminder;

      switch (type) {
        case 'study':
          reminder = config.studyReminder;
          break;
        case 'goal':
          reminder = config.goalReminder;
          break;
        case 'progress':
          reminder = config.progressReminder;
          break;
        case 'weekly':
          reminder = config.weeklyReview;
          break;
      }

      PushNotification.localNotification({
        channelId: this.CHANNEL_ID,
        title: `🧪 Test: ${reminder.title}`,
        message: reminder.message,
        soundName: config.soundName,
        vibrate: config.vibrate,
        importance: config.importance,
        userInfo: {
          type: 'test_reminder',
          reminderId: type,
        },
      });
    } catch (error) {
      console.error('Error sending test reminder:', error);
      throw error;
    }
  }

  async getReminderStats(): Promise<{
    totalScheduled: number;
    nextReminder: Date | null;
    activeReminders: string[];
  }> {
    try {
      const config = await this.getConfig();
      const activeReminders: string[] = [];
      let totalScheduled = 0;

      if (config.enabled) {
        if (config.studyReminder.enabled) {
          activeReminders.push('Çalışma Hatırlatması');
          totalScheduled += 30;
        }
        if (config.goalReminder.enabled) {
          activeReminders.push('Hedef Kontrolü');
          totalScheduled += 30;
        }
        if (config.progressReminder.enabled) {
          activeReminders.push('İlerleme Bildirimi');
          totalScheduled += 30;
        }
        if (config.weeklyReview.enabled) {
          activeReminders.push('Haftalık Değerlendirme');
          totalScheduled += 12;
        }
      }

      // Calculate next reminder time
      const nextReminder = this.getNextReminderTime(config);

      return {
        totalScheduled,
        nextReminder,
        activeReminders,
      };
    } catch (error) {
      console.error('Error getting reminder stats:', error);
      return {
        totalScheduled: 0,
        nextReminder: null,
        activeReminders: [],
      };
    }
  }

  private getNextReminderTime(config: DailyReminderConfig): Date | null {
    if (!config.enabled) return null;

    const now = new Date();
    const today = new Date(now);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const times: Date[] = [];

    // Check today's remaining reminders
    if (config.studyReminder.enabled) {
      const [hours, minutes] = config.studyReminder.time.split(':').map(Number);
      const reminderTime = new Date(today);
      reminderTime.setHours(hours, minutes, 0, 0);
      if (reminderTime > now) times.push(reminderTime);
    }

    if (config.goalReminder.enabled) {
      const [hours, minutes] = config.goalReminder.time.split(':').map(Number);
      const reminderTime = new Date(today);
      reminderTime.setHours(hours, minutes, 0, 0);
      if (reminderTime > now) times.push(reminderTime);
    }

    if (config.progressReminder.enabled) {
      const [hours, minutes] = config.progressReminder.time.split(':').map(Number);
      const reminderTime = new Date(today);
      reminderTime.setHours(hours, minutes, 0, 0);
      if (reminderTime > now) times.push(reminderTime);
    }

    // If no reminders today, check tomorrow's first reminder
    if (times.length === 0) {
      const tomorrowTimes: { time: string; enabled: boolean }[] = [
        { time: config.studyReminder.time, enabled: config.studyReminder.enabled },
        { time: config.goalReminder.time, enabled: config.goalReminder.enabled },
        { time: config.progressReminder.time, enabled: config.progressReminder.enabled },
      ];

      const enabledTimes = tomorrowTimes
        .filter(t => t.enabled)
        .map(t => {
          const [hours, minutes] = t.time.split(':').map(Number);
          const reminderTime = new Date(tomorrow);
          reminderTime.setHours(hours, minutes, 0, 0);
          return reminderTime;
        })
        .sort((a, b) => a.getTime() - b.getTime());

      if (enabledTimes.length > 0) {
        times.push(enabledTimes[0]);
      }
    }

    return times.length > 0 ? times.sort((a, b) => a.getTime() - b.getTime())[0] : null;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash) % 10000; // Keep it reasonable for notification IDs
  }
}

// Export singleton instance
export const dailyReminderService = DailyReminderService.getInstance();