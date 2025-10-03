import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Fallback notification system for React Native 0.81+ compatibility

export interface CustomReminder {
  id: string;
  title: string;
  message: string;
  time: string;
  days: string[];
  icon: string;
  category: string;
  repeatType: 'weekly' | 'daily' | 'monthly';
  isActive: boolean;
  createdAt: string;
  // Optional properties for backward compatibility
  enabled?: boolean;
  sound?: string;
  vibration?: boolean;
  subject?: string;
  priority?: 'low' | 'high' | 'default';
}

export const reminderTemplates = [
  {
    id: 'study-morning',
    title: 'Günlük Çalışma',
    message: 'KPSS çalışma zamanın geldi!',
    time: '09:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    icon: 'book-open-page-variant',
    category: 'study',
    repeatType: 'weekly' as const,
    isActive: true
  },
  {
    id: 'break-reminder',
    title: 'Mola Zamanı',
    message: '15 dakika mola ver ve dinlen',
    time: '11:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    icon: 'coffee',
    category: 'break',
    repeatType: 'weekly' as const,
    isActive: true
  }
];

const STORAGE_KEY = '@custom_reminders';

export const loadCustomReminders = async (): Promise<CustomReminder[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading custom reminders:', error);
    return [];
  }
};

export const createCustomReminder = async (reminderData: Omit<CustomReminder, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const reminders = await loadCustomReminders();
    const newReminder: CustomReminder = {
      ...reminderData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      isActive: true
    };
    
    reminders.push(newReminder);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    return newReminder.id;
  } catch (error) {
    console.error('Error creating custom reminder:', error);
    throw error;
  }
};

export const editCustomReminder = async (id: string, updates: Partial<CustomReminder>): Promise<void> => {
  try {
    const reminders = await loadCustomReminders();
    const index = reminders.findIndex(r => r.id === id);
    
    if (index !== -1) {
      reminders[index] = { ...reminders[index], ...updates };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    }
  } catch (error) {
    console.error('Error editing custom reminder:', error);
    throw error;
  }
};

// Alias for backwards compatibility
export const updateCustomReminder = editCustomReminder;

export const duplicateReminder = async (id: string): Promise<boolean> => {
  try {
    const reminders = await loadCustomReminders();
    const reminder = reminders.find(r => r.id === id);
    
    if (reminder) {
      await createCustomReminder({
        ...reminder,
        title: `${reminder.title} (Kopya)`
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error duplicating reminder:', error);
    return false;
  }
};

export const deleteCustomReminder = async (id: string): Promise<void> => {
  try {
    const reminders = await loadCustomReminders();
    const updatedReminders = reminders.filter(reminder => reminder.id !== id);
    await AsyncStorage.setItem('customReminders', JSON.stringify(updatedReminders));
    
    // Fallback: Log the cancellation since we can't cancel actual notifications
    console.log(`Notification cancelled for reminder ${id} (fallback mode)`);
  } catch (error) {
    console.error('Error deleting custom reminder:', error);
  }
};

export const getRemindersByCategory = async (category: string): Promise<CustomReminder[]> => {
  try {
    const reminders = await loadCustomReminders();
    return category === 'all' 
      ? reminders 
      : reminders.filter(r => r.category === category);
  } catch (error) {
    console.error('Error getting reminders by category:', error);
    return [];
  }
};

export const clearAllCustomReminders = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('customReminders');
    // Fallback: Log the cancellation since we can't cancel actual notifications
    console.log('All notifications cancelled (fallback mode)');
  } catch (error) {
    console.error('Error clearing custom reminders:', error);
  }
};

export const scheduleAllCustomReminders = async (): Promise<void> => {
  try {
    const reminders = await loadCustomReminders();
    
    // Fallback: Log the scheduling since we can't schedule actual notifications
    console.log('All notifications cancelled (fallback mode)');
    
    reminders.filter(r => r.isActive).forEach(reminder => {
      const [hours, minutes] = reminder.time.split(':').map(Number);
      
      reminder.days.forEach(day => {
        // Fallback: Log the scheduled notification
        console.log(`Notification scheduled for ${reminder.title} on ${day} at ${hours}:${minutes} (fallback mode)`);
        
        // In a real implementation, you would schedule the notification here
        // For now, we just log it to prevent crashes
      });
    });
  } catch (error) {
    console.error('Error scheduling custom reminders:', error);
  }
};

export const getCategoryColor = (category: string): string => {
  const colors = {
    study: '#4CAF50',
    break: '#FF9800',
    goal: '#2196F3',
    exam: '#9C27B0',
    default: '#757575'
  };
  return colors[category as keyof typeof colors] || colors.default;
};

export const getCategoryIcon = (category: string): string => {
  const icons = {
    study: 'book-open-page-variant',
    break: 'coffee',
    goal: 'target',
    exam: 'school',
    default: 'bell'
  };
  return icons[category as keyof typeof icons] || icons.default;
};

export const formatTime = (time: string): string => {
  return time;
};

export const formatDays = (days: string[]): string => {
  const dayNames = {
    monday: 'Pzt',
    tuesday: 'Sal',
    wednesday: 'Çar',
    thursday: 'Per',
    friday: 'Cum',
    saturday: 'Cmt',
    sunday: 'Paz'
  };
  
  if (days.length === 7) return 'Her gün';
  if (days.length === 5 && !days.includes('saturday') && !days.includes('sunday')) {
    return 'Hafta içi';
  }
  
  return days.map(day => dayNames[day as keyof typeof dayNames]).join(', ');
};

export const getNextTriggerDate = (reminder: CustomReminder): Date => {
  const [hours, minutes] = reminder.time.split(':').map(Number);
  const now = new Date();
  
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(hours, minutes, 0, 0);
  return nextWeek;
};

// Quick reminder creation functions
export const createQuickStudyReminder = async (subject: string, time: string): Promise<string> => {
  return await createCustomReminder({
    title: `${subject} Çalışma`,
    message: `${subject} çalışma zamanınız geldi!`,
    time,
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    icon: 'book-open-page-variant',
    category: 'study',
    repeatType: 'weekly',
    isActive: true
  });
};

export const createQuickBreakReminder = async (minutes: number): Promise<string> => {
  return await createCustomReminder({
    title: 'Mola Zamanı',
    message: `${minutes} dakika mola verme zamanı!`,
    time: '11:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    icon: 'coffee',
    category: 'break',
    repeatType: 'weekly',
    isActive: true
  });
};

export const createQuickGoalReminder = async (goal: string, time: string): Promise<string> => {
  return await createCustomReminder({
    title: 'Hedef Kontrolü',
    message: `${goal} hedefini kontrol etme zamanı!`,
    time,
    days: ['sunday'],
    icon: 'target',
    category: 'goal',
    repeatType: 'weekly',
    isActive: true
  });
};

// Additional utility functions for the backup file
export const getReminderStats = async () => {
  const reminders = await loadCustomReminders();
  const active = reminders.filter(r => r.isActive).length;
  const categories = reminders.reduce((acc, reminder) => {
    acc[reminder.category] = (acc[reminder.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    total: reminders.length,
    active,
    categories
  };
};

export const getSmartSuggestions = async () => {
  // Mock smart suggestions based on usage patterns
  return [
    {
      title: '🌅 Sabah Çalışma',
      message: 'Sabah enerjinle günü verimli başlat!',
      time: '09:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      enabled: true,
      sound: 'default',
      vibration: true,
      repeatType: 'weekly' as const,
      category: 'study',
      icon: 'weather-night',
      priority: 'default' as const,
    }
  ];
};
