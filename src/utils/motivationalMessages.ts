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
    message: 'Her yeni gün, hedefinize bir adım daha yaklaşma fırsatıdır. KPSS\'de başarı için bugün de elinizden geleni yapın!',
    category: 'motivation'
  },
  {
    id: '2',
    message: 'Başarı, günlük küçük adımların birleşimidir. Bugün atacağınız her adım sizi KPSS başarısına götürür!',
    category: 'motivation'
  },
  {
    id: '3',
    message: 'Kendinize olan inancınızı asla kaybetmeyin. KPSS\'yi geçecek güçtesiniz!',
    category: 'motivation'
  },
  {
    id: '4',
    message: 'Zorluklarla karşılaştığınızda hatırlayın: En güzel çiçekler en zor koşullarda büyür. KPSS yolculuğunuz da böyle!',
    category: 'motivation'
  },
  {
    id: '5',
    message: 'Çalışma disiplininiz, gelecekteki hayatınızın temelini atıyor. Her ders, her soru size değer katıyor!',
    category: 'motivation'
  },

  // Success
  {
    id: '6',
    message: 'Başarı, hazırlık ile fırsatın buluştuğu andır. KPSS için hazırlığınızı sürdürün!',
    category: 'success'
  },
  {
    id: '7',
    message: 'Hayallerinizin peşinden gitmek için asla geç değildir. KPSS başarınız sizi bekliyor!',
    category: 'success'
  },
  {
    id: '8',
    message: 'Başarı bir gecede gelmez, ama her gece biraz daha yaklaşırsınız. Sabırlı olun!',
    category: 'success'
  },

  // Persistence
  {
    id: '9',
    message: 'Pes etmek, başarıya en yakın olduğunuz anda olur. Devam edin, hedefiniz çok yakın!',
    category: 'persistence'
  },
  {
    id: '10',
    message: 'Zorluklar sizi güçlendirir, başarısızlıklar size tecrübe kazandırır. KPSS yolunda her deneyim değerlidir!',
    category: 'persistence'
  },
  {
    id: '11',
    message: 'Bugün yorgunsanız bile, yarın için umudunuzu kaybetmeyin. Dinlenin ve güçlü dönün!',
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
    message: 'Kaliteli çalışma, uzun saatlerden daha değerlidir. Verimli olmaya odaklanın!',
    category: 'wisdom'
  },
  {
    id: '14',
    message: 'Hatalarınızdan öğrenmek, doğru yaptıklarınızdan daha değerli olabilir. Her yanıt bir öğrenme fırsatı!',
    category: 'wisdom'
  },

  // Encouragement
  {
    id: '15',
    message: 'Siz bu yolda yalnız değilsiniz. Binlerce kişi aynı hedefe yürüyor, siz de onların arasında parlayabilirsiniz!',
    category: 'encouragement'
  },
  {
    id: '16',
    message: 'Her çalışma seansı sizi hedefinize yaklaştırıyor. Kendinizle gurur duyun!',
    category: 'encouragement'
  },
  {
    id: '17',
    message: 'KPSS\'de başarı sadece puanla ölçülmez, kişisel gelişiminizle de ölçülür. Her iki alanda da ilerliyorsunuz!',
    category: 'encouragement'
  },
  {
    id: '18',
    message: 'Bugün kendisini geliştiren, yarın fırsatları değerlendirir. KPSS\'deki başarınız da böyle gelecek!',
    category: 'encouragement'
  },

  // Time-specific messages
  {
    id: '19',
    message: 'Sabah erken çalışmak zihni tazeler ve verimi artırır. Günaydın, başarılı bir gün sizi bekliyor!',
    category: 'motivation'
  },
  {
    id: '20',
    message: 'Akşam çalışması günü değerlendirme ve pekiştirme zamanıdır. Bugün öğrendiklerinizi unutmayın!',
    category: 'wisdom'
  },
  {
    id: '21',
    message: 'Hafta sonu bile çalışıyor olmanız, hedefinize olan bağlılığınızı gösterir. Tebrikler!',
    category: 'encouragement'
  },

  // Goal-oriented messages
  {
    id: '22',
    message: 'Büyük hedefler küçük adımlarla gerçekleşir. KPSS hedefiniz için bugün ne yapacaksınız?',
    category: 'motivation'
  },
  {
    id: '23',
    message: 'Hayalinizdeki işe kavuşmak için attığınız her adım değerlidir. Yolunuza devam edin!',
    category: 'success'
  },
  {
    id: '24',
    message: 'KPSS sadece bir sınav değil, geleceğinizin kapısıdır. O kapıyı açacak anahtar elinizde!',
    category: 'motivation'
  },
  {
    id: '25',
    message: 'Kendinize yatırım yapmaya devam edin. KPSS başarısı en iyi yatırımınızın meyvesi olacak!',
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

// Show motivational message as alert
export const showMotivationalMessage = async (): Promise<boolean> => {
  try {
    const shouldShow = await shouldShowMotivationalMessage();
    
    if (!shouldShow) {
      return false;
    }

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
            // TODO: Navigate to motivation settings
            console.log('Navigate to motivation settings');
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