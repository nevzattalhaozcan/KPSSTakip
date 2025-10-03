import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export interface MotivationalMessage {
  id: string;
  message: string;
  category: 'motivation' | 'success' | 'persistence' | 'wisdom' | 'encouragement';
  author?: string;
}

// Motivational messages specifically for KPSS exam preparation
export const motivationalMessages: MotivationalMessage[] = [
  // Motivation
  {
    id: '1',
    message: 'Her yeni gün, hedefine bir adım daha yaklaşma fırsatıdır. KPSS\'de başarı için bugün de elinden geleni yap!',
    category: 'motivation'
  },
  {
    id: '2',
    message: 'Başarı, günlük küçük adımların birleşimidir. Bugün atacağın her adım seni KPSS başarısına götürür!',
    category: 'motivation'
  },
  {
    id: '3',
    message: 'Kendine olan inancını asla kaybetme. KPSS\'yi geçecek güçtesin!',
    category: 'motivation'
  },
  {
    id: '4',
    message: 'Zorluklarla karşılaştığında hatırlayın: En güzel çiçekler en zor koşullarda büyür. KPSS yolculuğun da böyle!',
    category: 'motivation'
  },
  {
    id: '5',
    message: 'Çalışma disiplinin, gelecekteki hayatının temelini atıyor. Her ders, her soru sana değer katıyor!',
    category: 'motivation'
  },

  // Success
  {
    id: '6',
    message: 'Başarı, hazırlık ile fırsatın buluştuğu andır. KPSS için hazırlığını sürdür!',
    category: 'success'
  },
  {
    id: '7',
    message: 'Hayallerinin peşinden gitmek için asla geç değildir. KPSS başarın seni bekliyor!',
    category: 'success'
  },
  {
    id: '8',
    message: 'Başarı bir gecede gelmez, ama her gece biraz daha yaklaşırsın. Sabırlı ol!',
    category: 'success'
  },

  // Persistence
  {
    id: '9',
    message: 'Pes etmek, başarıya en yakın olduğun anda olur. Devam et, hedefin çok yakın!',
    category: 'persistence'
  },
  {
    id: '10',
    message: 'Zorluklar seni güçlendirir, başarısızlıklar sana tecrübe kazandırır. KPSS yolunda her deneyim değerlidir!',
    category: 'persistence'
  },
  {
    id: '11',
    message: 'Bugün yorgunsan bile, yarın için umudunu kaybetme. Dinlen ve güçlü dön!',
    category: 'persistence'
  },

  // Wisdom
  {
    id: '12',
    message: 'Bilgi güçtür, ama düzenli çalışma bilgiyi beceriye dönüştürür. KPSS için hem bilgi hem beceri gerekli!',
    category: 'wisdom'
  },
  {
    id: '13',
    message: 'Kaliteli çalışma, uzun saatlerden daha değerlidir. Verimli olmaya odaklan!',
    category: 'wisdom'
  },
  {
    id: '14',
    message: 'Hatalarından öğrenmek, doğru yaptıklarından daha değerli olabilir. Her yanıt bir öğrenme fırsatı!',
    category: 'wisdom'
  },

  // Encouragement
  {
    id: '15',
    message: 'Sen bu yolda yalnız değilsin. Binlerce kişi aynı hedefe yürüyor, sen de onların arasında parlayabilirsin!',
    category: 'encouragement'
  },
  {
    id: '16',
    message: 'Her çalışma seansı seni hedefine yaklaştırıyor. Kendinle gurur duy!',
    category: 'encouragement'
  },
  {
    id: '17',
    message: 'KPSS\'de başarı sadece puanla ölçülmez, kişisel gelişiminle de ölçülür. Her iki alanda da ilerliyorsun!',
    category: 'encouragement'
  },
  {
    id: '18',
    message: 'Bugün kendini geliştiren, yarın fırsatları değerlendirir. KPSS\'deki başarın da böyle gelecek!',
    category: 'encouragement'
  },

  // Time-specific messages
  {
    id: '19',
    message: 'Sabah erken çalışmak zihni tazeler ve verimi artırır. Günaydın, başarılı bir gün seni bekliyor!',
    category: 'motivation'
  },
  {
    id: '20',
    message: 'Akşam çalışması günü değerlendirme ve pekiştirme zamanıdır. Bugün öğrendiklerini unutma!',
    category: 'wisdom'
  },
  {
    id: '21',
    message: 'Hafta sonu bile çalışıyor olman, hedefine olan bağlılığını gösterir. Tebrikler!',
    category: 'encouragement'
  },

  // Goal-oriented messages
  {
    id: '22',
    message: 'Büyük hedefler küçük adımlarla gerçekleşir. KPSS hedefin için bugün ne yapacaksın?',
    category: 'motivation'
  },
  {
    id: '23',
    message: 'Hayalindeki işe kavuşmak için attığın her adım değerlidir. Yoluna devam et!',
    category: 'success'
  },
  {
    id: '24',
    message: 'KPSS sadece bir sınav değil, geleceğinin kapısıdır. O kapıyı açacak anahtar senin elinde!',
    category: 'motivation'
  },
  {
    id: '25',
    message: 'Kendine yatırım yapmaya devam et. KPSS başarısı en iyi yatırımının meyvesi olacak!',
    category: 'wisdom'
  }
];

// Settings for motivational messages
export interface MotivationSettings {
  enabled: boolean;
  frequency: 'daily' | 'every_visit' | 'weekly';
  categories: string[];
  showTime: 'morning' | 'evening' | 'anytime';
  lastShown?: string;
}

const MOTIVATION_SETTINGS_KEY = 'motivationSettings';
const LAST_MESSAGE_KEY = 'lastMotivationalMessage';

// Default settings
const defaultSettings: MotivationSettings = {
  enabled: true,
  frequency: 'daily',
  categories: ['motivation', 'success', 'persistence', 'wisdom', 'encouragement'],
  showTime: 'anytime'
};

// Get motivational settings
export const getMotivationSettings = async (): Promise<MotivationSettings> => {
  try {
    const settings = await AsyncStorage.getItem(MOTIVATION_SETTINGS_KEY);
    return settings ? JSON.parse(settings) : defaultSettings;
  } catch (error) {
    console.error('Error loading motivation settings:', error);
    return defaultSettings;
  }
};

// Save motivational settings
export const saveMotivationSettings = async (settings: MotivationSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(MOTIVATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving motivation settings:', error);
  }
};

// Get a random motivational message based on settings
export const getRandomMotivationalMessage = async (): Promise<MotivationalMessage | null> => {
  try {
    const settings = await getMotivationSettings();
    
    if (!settings.enabled) {
      return null;
    }

    // Filter messages by selected categories
    const filteredMessages = motivationalMessages.filter(
      msg => settings.categories.includes(msg.category)
    );

    if (filteredMessages.length === 0) {
      return null;
    }

    // Get random message
    const randomIndex = Math.floor(Math.random() * filteredMessages.length);
    return filteredMessages[randomIndex];
  } catch (error) {
    console.error('Error getting motivational message:', error);
    return null;
  }
};

// Check if should show motivational message based on frequency
export const shouldShowMotivationalMessage = async (): Promise<boolean> => {
  try {
    const settings = await getMotivationSettings();
    
    if (!settings.enabled) {
      return false;
    }

    const today = new Date().toDateString();
    const lastShown = await AsyncStorage.getItem(LAST_MESSAGE_KEY);

    switch (settings.frequency) {
      case 'every_visit':
        return true;
      
      case 'daily':
        return lastShown !== today;
      
      case 'weekly':
        if (!lastShown) return true;
        const lastShownDate = new Date(lastShown);
        const daysDiff = Math.floor((Date.now() - lastShownDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff >= 7;
      
      default:
        return true;
    }
  } catch (error) {
    console.error('Error checking if should show motivational message:', error);
    return false;
  }
};

// Show motivational message with alert
export const showMotivationalMessage = async (onOpenSettings?: () => void): Promise<boolean> => {
  try {
    const message = await getRandomMotivationalMessage();
    
    if (!message) {
      return false;
    }

    // Show the message as an alert
    Alert.alert(
      '💪 Motivasyon',
      message.message,
      [
        {
          text: '👍 Teşekkürler',
          style: 'default',
          onPress: async () => {
            // Mark as shown
            await AsyncStorage.setItem(LAST_MESSAGE_KEY, new Date().toDateString());
          }
        },
        {
          text: '⚙️ Ayarlar',
          style: 'default',
          onPress: () => {
            if (onOpenSettings) {
              onOpenSettings();
            } else {
              console.log('Navigate to motivation settings');
            }
          }
        }
      ]
    );

    return true;
  } catch (error) {
    console.error('Error showing motivational message:', error);
    return false;
  }
};

// Get motivational message for specific category
export const getMessageByCategory = async (category: string): Promise<MotivationalMessage | null> => {
  try {
    const categoryMessages = motivationalMessages.filter(msg => msg.category === category);
    
    if (categoryMessages.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * categoryMessages.length);
    return categoryMessages[randomIndex];
  } catch (error) {
    console.error('Error getting message by category:', error);
    return null;
  }
};

// Get time-appropriate message
export const getTimeBasedMessage = (): MotivationalMessage => {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 12) {
    // Morning messages
    return motivationalMessages.find(msg => msg.id === '19') || motivationalMessages[0];
  } else if (hour >= 18 && hour < 22) {
    // Evening messages
    return motivationalMessages.find(msg => msg.id === '20') || motivationalMessages[1];
  } else {
    // General motivational message
    return motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
  }
};

// Utility function to get encouragement message after completing tasks
export const getEncouragementMessage = (): MotivationalMessage => {
  const encouragementMessages = motivationalMessages.filter(msg => msg.category === 'encouragement');
  return encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
};