import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const scheduleDailyReportNotification = () => {
  try {
    // Schedule daily report notification for 9 PM
    PushNotification.localNotificationSchedule({
      title: '📊 Günlük Rapor Hazır!',
      message: 'Bugünün çalışma raporunu görüntülemek için tıklayın',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      repeatType: 'day',
      channelId: 'kpss-daily-reports',
      userInfo: {
        type: 'daily-report',
        action: 'open-reports'
      },
      actions: ['Raporu Gör', 'Daha Sonra'],
      invokeApp: true,
    });
  } catch (error) {
    console.log('Daily report notification scheduling failed:', error);
  }
};

export const scheduleEndOfDayNotification = () => {
  try {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(21, 0, 0, 0); // 9 PM
    
    // If it's already past 9 PM, schedule for tomorrow
    if (now.getTime() > endOfDay.getTime()) {
      endOfDay.setDate(endOfDay.getDate() + 1);
    }

    PushNotification.localNotificationSchedule({
      title: '🎯 Günü Değerlendir',
      message: 'Bugün nasıl geçti? Günlük raporunu oluşturmak için tıkla!',
      date: endOfDay,
      repeatType: 'day',
      channelId: 'kpss-daily-reports',
      userInfo: {
        type: 'end-of-day',
        action: 'create-daily-log'
      },
    });
  } catch (error) {
    console.log('End of day notification scheduling failed:', error);
  }
};

export const generateDailyLogFromProgress = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const progressData = await AsyncStorage.getItem('progress');
    
    if (!progressData) return null;
    
    const progress = JSON.parse(progressData);
    let completedToday = 0;
    const completedTopics: any[] = [];
    
    // This is a simplified version - in reality, you'd track when topics were completed
    Object.keys(progress).forEach(subjectId => {
      Object.keys(progress[subjectId]).forEach(topicIndex => {
        const topicProgress = progress[subjectId][topicIndex];
        if (topicProgress.completed) {
          completedToday++;
          // You'd need to track actual completion times for accurate logging
        }
      });
    });

    const dailyLog = {
      date: today,
      studyTime: completedToday * 30, // Estimate 30 minutes per completed topic
      completedTopics,
      totalProgress: {
        studied: 0,
        videosWatched: 0,
        questionsSolved: 0,
        completed: completedToday
      },
      notes: '',
      mood: 'good' as const,
      goals: {
        planned: 5,
        achieved: completedToday
      }
    };

    return dailyLog;
  } catch (error) {
    console.log('Error generating daily log:', error);
    return null;
  }
};

export const showDailyReportReadyNotification = async () => {
  try {
    const dailyLog = await generateDailyLogFromProgress();
    
    if (dailyLog && dailyLog.completedTopics.length > 0) {
      PushNotification.localNotification({
        title: '📈 Günlük Rapor Hazır!',
        message: `Bugün ${dailyLog.totalProgress.completed} konu tamamladın! Detayları gör.`,
        channelId: 'kpss-daily-reports',
        userInfo: {
          type: 'report-ready',
          action: 'open-daily-report',
          date: dailyLog.date
        },
        actions: ['Raporu Gör'],
      });
    }
  } catch (error) {
    console.log('Error showing daily report notification:', error);
  }
};