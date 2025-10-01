import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Custom reminder types
export interface CustomReminder {
  id: string;
  title: string;
  message: string;
  time: string; // HH:MM format
  days: number[]; // 0-6 (Sunday-Saturday), [] for one-time
  enabled: boolean;
  sound: string;
  vibration: boolean;
  repeatType: 'daily' | 'weekly' | 'monthly' | 'once';
  category: 'study' | 'break' | 'goal' | 'motivation' | 'custom';
  subject?: string; // Optional subject for study reminders
  icon: string; // Icon name for the reminder
  priority: 'low' | 'high' | 'default';
  createdAt: Date;
  lastTriggered?: Date;
  color?: string; // Custom color for the reminder
  streak?: number; // How many days completed
  nextTrigger?: Date; // When will it trigger next
}

// Helper function to format time
export const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const minute = parseInt(minutes, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
};

// Helper function to format days
export const formatDays = (days: number[], repeatType: string): string => {
  if (repeatType === 'once') return 'Bir kez';
  if (repeatType === 'daily') return 'Her gün';
  if (repeatType === 'monthly') return 'Aylık';
  
  if (days.length === 7) return 'Her gün';
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Hafta içi';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Hafta sonu';
  
  const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  return days.map(day => dayNames[day]).join(', ');
};

// Helper function to get next trigger date
export const getNextTriggerDate = (reminder: CustomReminder): Date => {
  const now = new Date();
  const [hours, minutes] = reminder.time.split(':').map(Number);
  
  if (reminder.repeatType === 'once') {
    const nextTrigger = new Date();
    nextTrigger.setHours(hours, minutes, 0, 0);
    if (nextTrigger <= now) {
      nextTrigger.setDate(nextTrigger.getDate() + 1);
    }
    return nextTrigger;
  }
  
  if (reminder.repeatType === 'daily') {
    const nextTrigger = new Date();
    nextTrigger.setHours(hours, minutes, 0, 0);
    if (nextTrigger <= now) {
      nextTrigger.setDate(nextTrigger.getDate() + 1);
    }
    return nextTrigger;
  }
  
  if (reminder.repeatType === 'weekly' && reminder.days.length > 0) {
    const today = now.getDay();
    let nextDay = reminder.days.find(day => day > today);
    
    if (!nextDay) {
      nextDay = reminder.days[0];
    }
    
    const daysUntilNext = nextDay > today ? nextDay - today : 7 - today + nextDay;
    const nextTrigger = new Date();
    nextTrigger.setDate(nextTrigger.getDate() + daysUntilNext);
    nextTrigger.setHours(hours, minutes, 0, 0);
    
    return nextTrigger;
  }
  
  return new Date();
};

// Helper function to get category color
export const getCategoryColor = (category: string): string => {
  const colors: { [key: string]: string } = {
    study: '#3b82f6',      // Blue
    break: '#10b981',      // Green
    goal: '#f59e0b',       // Orange
    motivation: '#ef4444', // Red
    custom: '#8b5cf6',     // Purple
  };
  return colors[category] || colors.custom;
};

// Helper function to get category icon
export const getCategoryIcon = (category: string): string => {
  const icons: { [key: string]: string } = {
    study: 'book-open',
    break: 'coffee',
    goal: 'target',
    motivation: 'heart',
    custom: 'bell',
  };
  return icons[category] || icons.custom;
};

// Enhanced reminder statistics
export const getReminderStats = async (): Promise<{
  total: number;
  active: number;
  completed: number;
  categories: { [key: string]: number };
}> => {
  try {
    const reminders = await loadCustomReminders();
    const active = reminders.filter(r => r.enabled).length;
    const categories: { [key: string]: number } = {};
    
    reminders.forEach(reminder => {
      categories[reminder.category] = (categories[reminder.category] || 0) + 1;
    });
    
    return {
      total: reminders.length,
      active,
      completed: 0, // TODO: Implement completion tracking
      categories,
    };
  } catch (error) {
    return { total: 0, active: 0, completed: 0, categories: {} };
  }
};

// Duplicate reminder
export const duplicateReminder = async (reminderId: string): Promise<boolean> => {
  try {
    const reminders = await loadCustomReminders();
    const originalReminder = reminders.find(r => r.id === reminderId);
    
    if (!originalReminder) return false;
    
    const duplicatedReminder: CustomReminder = {
      ...originalReminder,
      id: Date.now().toString(),
      title: `${originalReminder.title} (Kopya)`,
      createdAt: new Date(),
      enabled: false, // Start disabled to allow user to configure
    };
    
    await createCustomReminder(duplicatedReminder);
    return true;
  } catch (error) {
    console.error('Error duplicating reminder:', error);
    return false;
  }
};

// Edit reminder
export const editCustomReminder = async (
  reminderId: string,
  updates: Partial<Omit<CustomReminder, 'id' | 'createdAt'>>
): Promise<boolean> => {
  try {
    const reminders = await loadCustomReminders();
    const reminderIndex = reminders.findIndex(r => r.id === reminderId);
    
    if (reminderIndex === -1) return false;
    
    // Update the reminder
    reminders[reminderIndex] = {
      ...reminders[reminderIndex],
      ...updates,
    };
    
    await AsyncStorage.setItem('customReminders', JSON.stringify(reminders));
    return true;
  } catch (error) {
    console.error('Error editing reminder:', error);
    return false;
  }
};

// Get reminders by category
export const getRemindersByCategory = async (category?: string): Promise<CustomReminder[]> => {
  try {
    const reminders = await loadCustomReminders();
    if (!category) return reminders;
    return reminders.filter(r => r.category === category);
  } catch (error) {
    console.error('Error getting reminders by category:', error);
    return [];
  }
};

// Smart reminder suggestions based on usage
export const getSmartSuggestions = async (): Promise<Omit<CustomReminder, 'id' | 'createdAt'>[]> => {
  try {
    const reminders = await loadCustomReminders();
    const now = new Date();
    const hour = now.getHours();
    
    const suggestions = [];
    
    // Morning study suggestion
    if (hour >= 6 && hour <= 10 && !reminders.some(r => r.category === 'study' && r.time.startsWith('09'))) {
      suggestions.push({
        title: '🌅 Sabah Çalışma',
        message: 'Sabah enerjinle günü verimli başlat!',
        time: '09:00',
        days: [1, 2, 3, 4, 5],
        enabled: true,
        sound: 'default',
        vibration: true,
        repeatType: 'weekly' as const,
        category: 'study' as const,
        icon: 'weather-sunny',
        priority: 'default' as const,
        color: getCategoryColor('study'),
      });
    }
    
    // Evening review suggestion
    if (hour >= 18 && hour <= 22 && !reminders.some(r => r.category === 'goal' && r.time.startsWith('20'))) {
      suggestions.push({
        title: '🌙 Akşam Değerlendirme',
        message: 'Günün nasıl geçti? Yarın için plan yap!',
        time: '20:00',
        days: [0, 1, 2, 3, 4, 5, 6],
        enabled: true,
        sound: 'default',
        vibration: true,
        repeatType: 'daily' as const,
        category: 'goal' as const,
        icon: 'weather-night',
        priority: 'default' as const,
        color: getCategoryColor('goal'),
      });
    }
    
    return suggestions;
  } catch (error) {
    console.error('Error getting smart suggestions:', error);
    return [];
  }
};

// Predefined reminder templates
export const reminderTemplates: Omit<CustomReminder, 'id' | 'createdAt'>[] = [
  {
    title: '📚 Çalışma Zamanı',
    message: 'Günlük çalışma hedefine başlama vakti!',
    time: '09:00',
    days: [1, 2, 3, 4, 5], // Weekdays
    enabled: true,
    sound: 'default',
    vibration: true,
    repeatType: 'weekly',
    category: 'study',
    icon: 'book-open',
    priority: 'default',
  },
  {
    title: '🎯 Hedef Kontrolü',
    message: 'Günlük hedeflerini kontrol et ve güncelle!',
    time: '19:00',
    days: [0, 1, 2, 3, 4, 5, 6], // Every day
    enabled: true,
    sound: 'bell',
    vibration: true,
    repeatType: 'daily',
    category: 'goal',
    icon: 'target',
    priority: 'default',
  },
  {
    title: '⏰ Mola Hatırlatıcısı',
    message: '25 dakika çalıştın! 5 dakika mola ver.',
    time: '10:00',
    days: [],
    enabled: false,
    sound: 'chime',
    vibration: true,
    repeatType: 'once',
    category: 'break',
    icon: 'coffee',
    priority: 'high',
  },
  {
    title: '🌟 Motivasyon',
    message: 'Sen harikasın! Hedefe odaklan ve devam et!',
    time: '08:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    enabled: true,
    sound: 'default',
    vibration: false,
    repeatType: 'daily',
    category: 'motivation',
    icon: 'star',
    priority: 'low',
  },
  {
    title: '📊 Haftalık Değerlendirme',
    message: 'Bu haftaki ilerlemenizi değerlendirin!',
    time: '20:00',
    days: [0], // Sunday
    enabled: true,
    sound: 'default',
    vibration: true,
    repeatType: 'weekly',
    category: 'goal',
    icon: 'chart-line',
    priority: 'default',
  },
];

// Subject-specific study reminders
export const createSubjectReminder = (
  subject: string,
  time: string,
  days: number[]
): Omit<CustomReminder, 'id' | 'createdAt'> => ({
  title: `📖 ${subject} Çalışma`,
  message: `${subject} dersine odaklanma zamanı! Başarılar!`,
  time,
  days,
  enabled: true,
  sound: 'default',
  vibration: true,
  repeatType: 'weekly',
  category: 'study',
  icon: getSubjectIcon(subject),
  priority: 'default',
});

// Get icon for subject
const getSubjectIcon = (subject: string): string => {
  const iconMap: { [key: string]: string } = {
    'Türkçe': 'book-alphabet',
    'Matematik': 'calculator',
    'Tarih': 'clock-time-four',
    'Coğrafya': 'earth',
    'Vatandaşlık': 'account-group',
    'Genel Kültür': 'lightbulb',
    'Genel Yetenek': 'brain',
  };
  return iconMap[subject] || 'book';
};

// Storage functions
export const saveCustomReminders = async (reminders: CustomReminder[]) => {
  try {
    await AsyncStorage.setItem('customReminders', JSON.stringify(reminders));
    console.log('Custom reminders saved');
    return true;
  } catch (error) {
    console.log('Error saving custom reminders:', error);
    return false;
  }
};

export const loadCustomReminders = async (): Promise<CustomReminder[]> => {
  try {
    const data = await AsyncStorage.getItem('customReminders');
    if (data) {
      const reminders = JSON.parse(data);
      // Convert date strings back to Date objects
      return reminders.map((reminder: any) => ({
        ...reminder,
        createdAt: new Date(reminder.createdAt),
        lastTriggered: reminder.lastTriggered ? new Date(reminder.lastTriggered) : undefined,
      }));
    }
    return [];
  } catch (error) {
    console.log('Error loading custom reminders:', error);
    return [];
  }
};

// Create a new reminder
export const createCustomReminder = async (
  reminderData: Omit<CustomReminder, 'id' | 'createdAt'>
): Promise<CustomReminder> => {
  const newReminder: CustomReminder = {
    ...reminderData,
    id: generateReminderId(),
    createdAt: new Date(),
  };

  const existingReminders = await loadCustomReminders();
  const updatedReminders = [...existingReminders, newReminder];
  await saveCustomReminders(updatedReminders);
  
  // Schedule the reminder if it's enabled
  if (newReminder.enabled) {
    await scheduleCustomReminder(newReminder);
  }

  return newReminder;
};

// Update an existing reminder
export const updateCustomReminder = async (
  id: string,
  updates: Partial<CustomReminder>
): Promise<boolean> => {
  try {
    const existingReminders = await loadCustomReminders();
    const reminderIndex = existingReminders.findIndex(r => r.id === id);
    
    if (reminderIndex === -1) return false;

    const updatedReminder = { ...existingReminders[reminderIndex], ...updates };
    existingReminders[reminderIndex] = updatedReminder;
    
    await saveCustomReminders(existingReminders);
    
    // Cancel old notification and schedule new one if enabled
    PushNotification.cancelLocalNotification(id);
    if (updatedReminder.enabled) {
      await scheduleCustomReminder(updatedReminder);
    }
    
    return true;
  } catch (error) {
    console.log('Error updating custom reminder:', error);
    return false;
  }
};

// Delete a reminder
export const deleteCustomReminder = async (id: string): Promise<boolean> => {
  try {
    const existingReminders = await loadCustomReminders();
    const filteredReminders = existingReminders.filter(r => r.id !== id);
    
    await saveCustomReminders(filteredReminders);
    PushNotification.cancelLocalNotification(id);
    
    return true;
  } catch (error) {
    console.log('Error deleting custom reminder:', error);
    return false;
  }
};

// Schedule a custom reminder
export const scheduleCustomReminder = async (reminder: CustomReminder) => {
  try {
    const [hour, minute] = reminder.time.split(':').map(Number);
    
    if (reminder.repeatType === 'once') {
      // Schedule for next occurrence of this time
      const scheduledDate = new Date();
      scheduledDate.setHours(hour, minute, 0, 0);
      
      if (scheduledDate.getTime() <= Date.now()) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }

      PushNotification.localNotificationSchedule({
        channelId: 'kpss-channel',
        id: reminder.id,
        title: reminder.title,
        message: reminder.message,
        date: scheduledDate,
        playSound: reminder.sound !== 'none',
        soundName: reminder.sound === 'default' ? 'default' : `${reminder.sound}.mp3`,
        vibrate: reminder.vibration,
        priority: reminder.priority,
      });
    } else if (reminder.repeatType === 'daily') {
      const now = new Date();
      const scheduledTime = new Date(now);
      scheduledTime.setHours(hour, minute, 0, 0);

      if (scheduledTime.getTime() <= now.getTime()) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      PushNotification.localNotificationSchedule({
        channelId: 'kpss-channel',
        id: reminder.id,
        title: reminder.title,
        message: reminder.message,
        date: scheduledTime,
        repeatType: 'day',
        playSound: reminder.sound !== 'none',
        soundName: reminder.sound === 'default' ? 'default' : `${reminder.sound}.mp3`,
        vibrate: reminder.vibration,
        priority: reminder.priority,
      });
    } else if (reminder.repeatType === 'weekly' && reminder.days.length > 0) {
      // Schedule for each selected day of the week
      reminder.days.forEach(dayOfWeek => {
        const now = new Date();
        const currentDay = now.getDay();
        
        let daysUntilTarget = dayOfWeek - currentDay;
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
          id: `${reminder.id}_${dayOfWeek}`,
          title: reminder.title,
          message: reminder.message,
          date: scheduledDate,
          repeatType: 'week',
          playSound: reminder.sound !== 'none',
          soundName: reminder.sound === 'default' ? 'default' : `${reminder.sound}.mp3`,
          vibrate: reminder.vibration,
          priority: reminder.priority,
        });
      });
    }

    console.log(`Scheduled reminder: ${reminder.title}`);
  } catch (error) {
    console.log('Error scheduling reminder:', error);
  }
};

// Schedule all enabled custom reminders
export const scheduleAllCustomReminders = async () => {
  try {
    const reminders = await loadCustomReminders();
    const enabledReminders = reminders.filter(r => r.enabled);
    
    for (const reminder of enabledReminders) {
      await scheduleCustomReminder(reminder);
    }
    
    console.log(`Scheduled ${enabledReminders.length} custom reminders`);
    return true;
  } catch (error) {
    console.log('Error scheduling all custom reminders:', error);
    return false;
  }
};

// Cancel all custom reminder notifications
export const cancelAllCustomReminders = async () => {
  try {
    const reminders = await loadCustomReminders();
    
    reminders.forEach(reminder => {
      PushNotification.cancelLocalNotification(reminder.id);
      // Also cancel weekly reminders for each day
      if (reminder.repeatType === 'weekly') {
        reminder.days.forEach(day => {
          PushNotification.cancelLocalNotification(`${reminder.id}_${day}`);
        });
      }
    });
    
    console.log('Cancelled all custom reminders');
    return true;
  } catch (error) {
    console.log('Error cancelling custom reminders:', error);
    return false;
  }
};

// Generate unique reminder ID
const generateReminderId = (): string => {
  return `reminder_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Get active reminders (enabled ones)
export const getActiveReminders = async (): Promise<CustomReminder[]> => {
  const reminders = await loadCustomReminders();
  return reminders.filter(r => r.enabled);
};

// Quick reminder creation helpers
export const createQuickStudyReminder = async (subject: string, time: string) => {
  return await createCustomReminder({
    title: `📚 ${subject} Çalışma`,
    message: `${subject} çalışma zamanı! Başarılar!`,
    time,
    days: [1, 2, 3, 4, 5], // Weekdays
    enabled: true,
    sound: 'default',
    vibration: true,
    repeatType: 'weekly',
    category: 'study',
    subject,
    icon: getSubjectIcon(subject),
    priority: 'default',
  });
};

export const createQuickBreakReminder = async (intervalMinutes: number) => {
  const futureTime = new Date(Date.now() + intervalMinutes * 60 * 1000);
  const timeString = `${futureTime.getHours().toString().padStart(2, '0')}:${futureTime.getMinutes().toString().padStart(2, '0')}`;
  
  return await createCustomReminder({
    title: '⏰ Mola Zamanı',
    message: `${intervalMinutes} dakika çalıştın! Kısa bir mola ver.`,
    time: timeString,
    days: [],
    enabled: true,
    sound: 'chime',
    vibration: true,
    repeatType: 'once',
    category: 'break',
    icon: 'coffee',
    priority: 'high',
  });
};

export const createQuickGoalReminder = async (goalText: string, time: string) => {
  return await createCustomReminder({
    title: '🎯 Hedef Hatırlatıcısı',
    message: goalText,
    time,
    days: [0, 1, 2, 3, 4, 5, 6], // Every day
    enabled: true,
    sound: 'bell',
    vibration: true,
    repeatType: 'daily',
    category: 'goal',
    icon: 'target',
    priority: 'default',
  });
};