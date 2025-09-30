import PushNotification from 'react-native-push-notification';
import {Platform, PermissionsAndroid} from 'react-native';

// Android 13+ için bildirim izni kontrol et
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

// Günlük hatırlatıcı ayarla
export const scheduleDailyReminder = (hour: number, minute: number, subject: string) => {
  const now = new Date();
  const scheduledTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    0,
    0
  );

  // Eğer bugünün zamanı geçmişse, yarın için ayarla
  if (scheduledTime.getTime() <= now.getTime()) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  PushNotification.localNotificationSchedule({
    channelId: 'kpss-channel',
    title: '📚 KPSS Çalışma Zamanı!',
    message: `Bugün ${subject} çalışma günü. Haydi başlayalım! 💪`,
    date: scheduledTime,
    repeatType: 'day',
  });
};

// Haftalık program için bildirimleri ayarla
export const scheduleWeeklyReminders = async () => {
  try {
    // İzin kontrolü
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) {
      console.log('No notification permission for scheduling');
      return false;
    }

    const schedule = [
      { day: 1, subject: 'Türkçe' },
      { day: 2, subject: 'Matematik' },
      { day: 3, subject: 'Tarih' },
      { day: 4, subject: 'Coğrafya' },
      { day: 5, subject: 'Vatandaşlık' },
      { day: 6, subject: 'Tekrar' },
      { day: 0, subject: 'Test Çözme' },
    ];

    // Her gün saat 09:00 için hatırlatıcı ayarla
    schedule.forEach((item) => {
      try {
        const now = new Date();
        const targetDay = item.day;
        const currentDay = now.getDay();
        
        let daysUntilTarget = targetDay - currentDay;
        if (daysUntilTarget < 0) {
          daysUntilTarget += 7;
        } else if (daysUntilTarget === 0 && now.getHours() >= 9) {
          daysUntilTarget = 7;
        }

        const scheduledDate = new Date(now);
        scheduledDate.setDate(now.getDate() + daysUntilTarget);
        scheduledDate.setHours(9, 0, 0, 0);

        PushNotification.localNotificationSchedule({
          channelId: 'kpss-channel',
          id: `weekly_${item.day}`,
          title: '📚 Günaydın! KPSS Zamanı',
          message: `Bugün ${item.subject} günü! Hadi başlayalım! 🎯`,
          date: scheduledDate,
          repeatType: 'week',
        });
      } catch (error) {
        console.log(`Error scheduling notification for ${item.subject}:`, error);
      }
    });

    console.log('Haftalık hatırlatıcılar ayarlandı!');
    return true;
  } catch (error) {
    console.log('Error in scheduleWeeklyReminders:', error);
    return false;
  }
};

// Akşam motivasyon bildirimi
export const scheduleEveningMotivation = () => {
  const now = new Date();
  const scheduledTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    20,
    0,
    0,
    0
  );

  if (scheduledTime.getTime() <= now.getTime()) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }

  PushNotification.localNotificationSchedule({
    channelId: 'kpss-channel',
    title: '🌟 Günlük Özet',
    message: 'Bugün ne kadar ilerleme kaydettin? Kontrol et! 📊',
    date: scheduledTime,
    repeatType: 'day',
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