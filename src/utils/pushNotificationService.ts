import PushNotification, { Importance } from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid } from 'react-native';
import {
  motivationalMessages,
  getMotivationSettings,
  getRandomMotivationalMessage,
  MotivationSettings,
} from './motivationalMessages';

// Configuration interface for push notifications
export interface PushNotificationConfig {
  enabled: boolean;
  dailyTime: string; // Format: "HH:MM"
  weeklyDay: number; // 0=Sunday, 1=Monday, etc.
  categories: string[];
  title: string;
  soundName?: string;
  importance: 'default' | 'high' | 'low';
}

const DEFAULT_CONFIG: PushNotificationConfig = {
  enabled: true,
  dailyTime: '09:00',
  weeklyDay: 1, // Monday
  categories: ['motivation', 'success', 'persistence', 'wisdom', 'encouragement'],
  title: '💪 KPSS Motivasyonu',
  soundName: 'default',
  importance: 'high',
};

const PUSH_CONFIG_KEY = 'pushNotificationConfig';
const LAST_NOTIFICATION_KEY = 'lastPushNotification';

class MotivationalPushService {
  private isInitialized = false;

  // Initialize push notification service
  async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) return true;

      // Configure push notifications
      PushNotification.configure({
        // Called when token is generated (iOS and Android)
        onRegister: (token) => {
          console.log('Push notification token:', token);
          this.saveDeviceToken(token.token);
        },

        // Called when a remote notification is received
        onNotification: (notification) => {
          console.log('Push notification received:', notification);
          
          // Handle notification tap
          if (notification.userInteraction) {
            console.log('User tapped notification');
            // TODO: Navigate to specific screen if needed
          }
        },

        // Should the initial notification be popped automatically
        popInitialNotification: true,

        // Permissions
        requestPermissions: Platform.OS === 'ios',
      });

      // Request permissions for Android
      if (Platform.OS === 'android') {
        await this.requestAndroidPermissions();
      }

      // Create notification channel for Android
      this.createNotificationChannel();

      this.isInitialized = true;
      console.log('Motivational push service initialized');
      return true;
    } catch (error) {
      console.error('Error initializing push service:', error);
      return false;
    }
  }

  // Request Android permissions
  private async requestAndroidPermissions(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') return true;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Bildirim İzni',
          message: 'KPSS Takip uygulaması motivasyon mesajları göndermek için bildirim izni istiyor.',
          buttonNeutral: 'Daha Sonra',
          buttonNegative: 'İptal',
          buttonPositive: 'İzin Ver',
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting Android permissions:', error);
      return false;
    }
  }

  // Create notification channel for Android
  private createNotificationChannel(): void {
    PushNotification.createChannel(
      {
        channelId: 'kpss-motivation',
        channelName: 'KPSS Motivasyon',
        channelDescription: 'KPSS çalışma motivasyon mesajları',
        playSound: true,
        soundName: 'default',
        importance: Importance.HIGH,
        vibrate: true,
      },
      (created) => console.log(`Notification channel created: ${created}`)
    );
  }

  // Save device token for remote notifications
  private async saveDeviceToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('devicePushToken', token);
      console.log('Device token saved:', token);
      // TODO: Send token to your backend server for remote notifications
    } catch (error) {
      console.error('Error saving device token:', error);
    }
  }

  // Get push notification configuration
  async getConfig(): Promise<PushNotificationConfig> {
    try {
      const configData = await AsyncStorage.getItem(PUSH_CONFIG_KEY);
      return configData ? JSON.parse(configData) : DEFAULT_CONFIG;
    } catch (error) {
      console.error('Error loading push config:', error);
      return DEFAULT_CONFIG;
    }
  }

  // Save push notification configuration
  async saveConfig(config: PushNotificationConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(PUSH_CONFIG_KEY, JSON.stringify(config));
      
      // Reschedule notifications with new config
      if (config.enabled) {
        await this.scheduleMotivationalNotifications();
      } else {
        this.cancelAllNotifications();
      }
    } catch (error) {
      console.error('Error saving push config:', error);
    }
  }

  // Schedule daily motivational notifications
  async scheduleMotivationalNotifications(): Promise<void> {
    try {
      const config = await this.getConfig();
      const motivationSettings = await getMotivationSettings();

      if (!config.enabled || !motivationSettings.enabled) {
        console.log('Push notifications disabled');
        return;
      }

      // Cancel existing notifications first
      this.cancelAllNotifications();

      // Schedule daily notifications for the next 30 days
      for (let i = 1; i <= 30; i++) {
        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + i);
        
        // Set the time based on config
        const [hours, minutes] = config.dailyTime.split(':').map(Number);
        scheduledDate.setHours(hours, minutes, 0, 0);

        // Get a random motivational message
        const filteredMessages = motivationalMessages.filter(
          msg => config.categories.includes(msg.category)
        );
        
        if (filteredMessages.length === 0) continue;

        const randomMessage = filteredMessages[Math.floor(Math.random() * filteredMessages.length)];

        // Schedule the notification
        PushNotification.localNotificationSchedule({
          id: `motivation-${i}`,
          channelId: 'kpss-motivation',
          title: config.title,
          message: randomMessage.message,
          date: scheduledDate,
          soundName: config.soundName || 'default',
          playSound: true,
          vibrate: true,
          vibration: 300,
          importance: config.importance,
          priority: 'high',
          allowWhileIdle: true,
          ignoreInForeground: false,
          userInfo: {
            type: 'motivation',
            category: randomMessage.category,
            messageId: randomMessage.id,
          },
        });
      }

      // Save last scheduled time
      await AsyncStorage.setItem(LAST_NOTIFICATION_KEY, new Date().toISOString());
      console.log('Motivational notifications scheduled for next 30 days');
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  }

  // Schedule weekly motivational notifications
  async scheduleWeeklyNotifications(): Promise<void> {
    try {
      const config = await this.getConfig();
      
      if (!config.enabled) return;

      // Schedule for the next 12 weeks
      for (let i = 1; i <= 12; i++) {
        const scheduledDate = new Date();
        
        // Calculate next occurrence of the specified day
        const currentDay = scheduledDate.getDay();
        const targetDay = config.weeklyDay;
        const daysUntilTarget = (targetDay + 7 - currentDay) % 7 || 7;
        
        scheduledDate.setDate(scheduledDate.getDate() + daysUntilTarget + (i - 1) * 7);
        
        const [hours, minutes] = config.dailyTime.split(':').map(Number);
        scheduledDate.setHours(hours, minutes, 0, 0);

        const randomMessage = motivationalMessages[
          Math.floor(Math.random() * motivationalMessages.length)
        ];

        PushNotification.localNotificationSchedule({
          id: `weekly-motivation-${i}`,
          channelId: 'kpss-motivation',
          title: '🎯 Haftalık Motivasyon',
          message: randomMessage.message,
          date: scheduledDate,
          soundName: config.soundName || 'default',
          playSound: true,
          vibrate: true,
          repeatType: 'week',
          userInfo: {
            type: 'weekly-motivation',
            category: randomMessage.category,
          },
        });
      }

      console.log('Weekly motivational notifications scheduled');
    } catch (error) {
      console.error('Error scheduling weekly notifications:', error);
    }
  }

  // Send immediate motivational notification
  async sendImmediateNotification(customMessage?: string): Promise<void> {
    try {
      const config = await this.getConfig();
      let message = customMessage;

      if (!message) {
        const randomMotivation = await getRandomMotivationalMessage();
        message = randomMotivation?.message || 'Başarı için bugün de elinizden geleni yapın!';
      }

      PushNotification.localNotification({
        channelId: 'kpss-motivation',
        title: config.title,
        message: message,
        playSound: true,
        soundName: config.soundName || 'default',
        vibrate: true,
        importance: config.importance,
        priority: 'high',
        userInfo: {
          type: 'immediate-motivation',
        },
      });

      console.log('Immediate notification sent');
    } catch (error) {
      console.error('Error sending immediate notification:', error);
    }
  }

  // Cancel all scheduled notifications
  cancelAllNotifications(): void {
    try {
      PushNotification.cancelAllLocalNotifications();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }

  // Cancel specific notification
  cancelNotification(id: string): void {
    try {
      PushNotification.cancelLocalNotification(id);
      console.log(`Notification ${id} cancelled`);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  // Get all scheduled notifications
  async getScheduledNotifications(): Promise<any[]> {
    return new Promise((resolve) => {
      PushNotification.getScheduledLocalNotifications((notifications) => {
        resolve(notifications);
      });
    });
  }

  // Check if notifications should be rescheduled
  async shouldRescheduleNotifications(): Promise<boolean> {
    try {
      const lastScheduled = await AsyncStorage.getItem(LAST_NOTIFICATION_KEY);
      
      if (!lastScheduled) return true;

      const lastDate = new Date(lastScheduled);
      const now = new Date();
      const hoursDiff = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

      // Reschedule if more than 24 hours have passed
      return hoursDiff >= 24;
    } catch (error) {
      console.error('Error checking reschedule:', error);
      return true;
    }
  }

  // Get notification statistics
  async getNotificationStats(): Promise<{
    scheduled: number;
    lastScheduled: string | null;
    nextNotification: Date | null;
  }> {
    try {
      const scheduled = await this.getScheduledNotifications();
      const lastScheduled = await AsyncStorage.getItem(LAST_NOTIFICATION_KEY);
      
      let nextNotification = null;
      if (scheduled.length > 0) {
        // Find the earliest scheduled notification
        const sortedNotifications = scheduled.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        nextNotification = new Date(sortedNotifications[0].date);
      }

      return {
        scheduled: scheduled.length,
        lastScheduled,
        nextNotification,
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return {
        scheduled: 0,
        lastScheduled: null,
        nextNotification: null,
      };
    }
  }

  // Test notification (for debugging)
  async sendTestNotification(): Promise<void> {
    try {
      const testMessage = motivationalMessages[0];
      
      PushNotification.localNotification({
        channelId: 'kpss-motivation',
        title: '🧪 Test Bildirim',
        message: testMessage.message,
        playSound: true,
        soundName: 'default',
        vibrate: true,
        importance: 'high',
        priority: 'high',
        userInfo: {
          type: 'test',
        },
      });

      console.log('Test notification sent');
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }
}

// Export singleton instance
export const motivationalPushService = new MotivationalPushService();

// Utility functions for easy access
export const initializePushNotifications = () => motivationalPushService.initialize();
export const scheduleMotivationalPush = () => motivationalPushService.scheduleMotivationalNotifications();
export const sendMotivationalPush = (message?: string) => motivationalPushService.sendImmediateNotification(message);
export const cancelAllMotivationalPush = () => motivationalPushService.cancelAllNotifications();

// Auto-initialization helper
export const setupMotivationalPushNotifications = async (): Promise<boolean> => {
  try {
    const initialized = await motivationalPushService.initialize();
    if (!initialized) return false;

    const shouldReschedule = await motivationalPushService.shouldRescheduleNotifications();
    if (shouldReschedule) {
      await motivationalPushService.scheduleMotivationalNotifications();
    }

    return true;
  } catch (error) {
    console.error('Error setting up push notifications:', error);
    return false;
  }
};