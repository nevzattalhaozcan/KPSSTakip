// App.tsx içine Ayarlar ekranını eklemek için Tab.Navigator'a şunu ekleyin:

// 1. Import ekleyin (dosyanın başına):
// import SettingsScreen from './src/screens/SettingsScreen';

// 2. Tab.Navigator içine şu satırı ekleyin (İlerleme'den sonra):
// <Tab.Screen name="Ayarlar" component={SettingsScreen} />

// 3. screenOptions içindeki tabBarIcon fonksiyonuna şunu ekleyin:
// else if (route.name === 'Ayarlar') iconName = 'cog';

// TAM GÜNCELLENM İŞ DOSYA:

import React, {useEffect, useState, useRef} from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Platform,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SettingsScreen from './src/screens/SettingsScreen';
import { scheduleEndOfDayNotification, showDailyReportReadyNotification } from './src/utils/reportNotifications';

// Renkler
const colors = {
  primary: '#6366F1',
  secondary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  background: '#F1F5F9',
  backgroundLight: '#FFFFFF',
  card: '#FFFFFF',
  cardSecondary: '#F8FAFC',
  text: '#1E293B',
  textSecondary: '#334155',
  textLight: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  accent: '#F0F9FF',
};

// Ders verileri
const subjects = [
  {
    id: 'turkce',
    name: 'Türkçe',
    icon: 'book-alphabet',
    color: '#EF4444',
    topics: [
      'Sözcükte Anlam',
      'Cümlede Anlam',
      'Paragrafta Anlam',
      'Yazım Kuralları',
      'Noktalama İşaretleri',
      'Sözcük Türleri',
      'Fiilde Çatı',
      'Fiilde Kip',
      'Anlatım Bozuklukları',
      'Dil Bilgisi',
    ],
  },
  {
    id: 'matematik',
    name: 'Matematik',
    icon: 'calculator',
    color: '#3B82F6',
    topics: [
      'Temel Kavramlar',
      'Dört İşlem',
      'Kesirler',
      'Oran-Orantı',
      'Yüzdeler',
      'Kâr-Zarar',
      'Faiz Problemleri',
      'Denklemler',
      'Üslü Sayılar',
      'Geometri',
    ],
  },
  {
    id: 'tarih',
    name: 'Tarih',
    icon: 'clock-time-four',
    color: '#8B5CF6',
    topics: [
      'İlk Türk Devletleri',
      'İslam Tarihi',
      'Selçuklular',
      'Osmanlı Kuruluş',
      'Osmanlı Yükseliş',
      'Osmanlı Duraklama',
      'Osmanlı Gerileme',
      'Tanzimat Dönemi',
      'Meşrutiyet Dönemi',
      'Kurtuluş Savaşı',
    ],
  },
  {
    id: 'cografya',
    name: 'Coğrafya',
    icon: 'earth',
    color: '#10B981',
    topics: [
      'Dünya Coğrafyası',
      'Türkiye Coğrafyası',
      'Fiziki Coğrafya',
      'Beşeri Coğrafya',
      'Ekonomik Coğrafya',
      'İklim',
      'Nüfus',
      'Yerşekilleri',
      'Doğal Kaynaklar',
      'Çevre Sorunları',
    ],
  },
  {
    id: 'vatandaslik',
    name: 'Vatandaşlık',
    icon: 'flag',
    color: '#F59E0B',
    topics: [
      'Anayasa Hukuku',
      'İnsan Hakları',
      'Türk Anayasa Tarihi',
      'Devlet Organları',
      'Yasama',
      'Yürütme',
      'Yargı',
      'Yerel Yönetimler',
      'Seçim Sistemleri',
      'Temel Kavramlar',
    ],
  },
];

// Daily log interfaces
interface DailyLogEntry {
  date: string; // YYYY-MM-DD format
  studyTime: number; // minutes
  completedTopics: {
    subjectId: string;
    topicIndex: number;
    topicName: string;
    timeSpent: number; // minutes
    type: 'studied' | 'video' | 'questions' | 'completed';
  }[];
  totalProgress: {
    studied: number;
    videosWatched: number;
    questionsSolved: number;
    completed: number;
  };
  notes: string;
  mood: 'excellent' | 'good' | 'average' | 'challenging' | 'difficult';
  goals: {
    planned: number;
    achieved: number;
  };
  sessions?: number; // number of study sessions
}

interface WeeklyReport {
  weekStart: string; // YYYY-MM-DD format
  weekEnd: string;
  totalStudyTime: number;
  dailyLogs: DailyLogEntry[];
  subjectBreakdown: {
    [subjectId: string]: {
      timeSpent: number;
      topicsCompleted: number;
      progress: number;
    };
  };
  achievements: string[];
  improvements: string[];
  nextWeekGoals: string[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface MonthlyReport {
  month: string; // YYYY-MM format
  totalStudyTime: number;
  weeklyReports: WeeklyReport[];
  overallProgress: number;
  subjectMastery: {
    [subjectId: string]: number;
  };
  studyStreak: number;
  topPerformanceDays: string[];
  recommendations: string[];
}

// Study Timer interfaces
interface StudySession {
  id: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  subject?: string;
  topic?: string;
  notes?: string;
  completed: boolean;
}

interface TimerSettings {
  sessionDuration: number; // in minutes
  breakReminder: boolean;
  breakDuration: number; // in minutes
  autoStart: boolean;
}

// Default timer settings
const defaultTimerSettings: TimerSettings = {
  sessionDuration: 25, // 25 minutes default (Pomodoro technique)
  breakReminder: true,
  breakDuration: 5,
  autoStart: false,
};

// Daily Goals interfaces
interface DailyGoal {
  id: string;
  subjectId: string;
  date: string; // YYYY-MM-DD format
  goals: {
    videos: number;
    questions: number;
    topics: number;
    studyTime: number; // in minutes
  };
  progress: {
    videos: number;
    questions: number;
    topics: number;
    studyTime: number; // in minutes
  };
  completed: boolean;
}

interface GoalProgress {
  achieved: number;
  total: number;
  percentage: number;
}

// Haftalık program
const defaultWeeklySchedule = [
  {day: 'Pazartesi', subject: 'Türkçe', icon: 'book-alphabet', color: '#EF4444'},
  {day: 'Salı', subject: 'Matematik', icon: 'calculator', color: '#3B82F6'},
  {day: 'Çarşamba', subject: 'Tarih', icon: 'clock-time-four', color: '#8B5CF6'},
  {day: 'Perşembe', subject: 'Coğrafya', icon: 'earth', color: '#10B981'},
  {day: 'Cuma', subject: 'Vatandaşlık', icon: 'flag', color: '#F59E0B'},
  {day: 'Cumartesi', subject: 'Tekrar', icon: 'repeat', color: '#64748B'},
  {day: 'Pazar', subject: 'Test', icon: 'file-document-edit', color: '#EC4899'},
];

// Ana Ekran
function HomeScreen({ weeklySchedule }: { weeklySchedule: typeof defaultWeeklySchedule }) {
  const [todaySubject, setTodaySubject] = useState<{
    day: string;
    subject: string;
    icon: string;
    color: string;
  } | null>(null);
  const [completionRate, setCompletionRate] = useState(0);
  const [stats, setStats] = useState({
    studiedTopics: 0,
    videosWatched: 0,
    questionsSolved: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [todayGoals, setTodayGoals] = useState<DailyGoal[]>([]);
  const [goalProgress, setGoalProgress] = useState<GoalProgress>({
    achieved: 0,
    total: 0,
    percentage: 0,
  });
  
  // Timer states
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0); // in seconds
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
  const [timerSettings, setTimerSettings] = useState<TimerSettings>(defaultTimerSettings);
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [sessionSubject, setSessionSubject] = useState<string>('');
  const [sessionTopic, setSessionTopic] = useState<string>('');
  const timerRef = useRef<any>(null);

  const calculateGoalProgress = React.useCallback((goals: DailyGoal[]) => {
    if (goals.length === 0) {
      setGoalProgress({ achieved: 0, total: 0, percentage: 0 });
      return;
    }

    let totalAchieved = 0;
    let totalGoals = 0;

    goals.forEach(goal => {
      const { goals: targetGoals, progress } = goal;
      
      // Count individual goal achievements
      if (progress.videos >= targetGoals.videos) totalAchieved++;
      if (progress.questions >= targetGoals.questions) totalAchieved++;
      if (progress.topics >= targetGoals.topics) totalAchieved++;
      if (progress.studyTime >= targetGoals.studyTime) totalAchieved++;
      
      // Count total goals
      if (targetGoals.videos > 0) totalGoals++;
      if (targetGoals.questions > 0) totalGoals++;
      if (targetGoals.topics > 0) totalGoals++;
      if (targetGoals.studyTime > 0) totalGoals++;
    });

    const percentage = totalGoals > 0 ? Math.round((totalAchieved / totalGoals) * 100) : 0;
    
    setGoalProgress({
      achieved: totalAchieved,
      total: totalGoals,
      percentage,
    });
  }, []);

  const loadTodayGoals = React.useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const goalsData = await AsyncStorage.getItem('dailyGoals');
      if (goalsData) {
        const allGoals: DailyGoal[] = JSON.parse(goalsData);
        const todayGoalsData = allGoals.filter(goal => goal.date === today);
        setTodayGoals(todayGoalsData);
        calculateGoalProgress(todayGoalsData);
      }
    } catch (error) {
      console.log('Daily goals yüklenemedi:', error);
    }
  }, [calculateGoalProgress]);

  useEffect(() => {
    const today = new Date().getDay();
    const dayIndex = today === 0 ? 6 : today - 1;
    setTodaySubject(weeklySchedule[dayIndex]);
    loadTimerSettings();
    loadTodayGoals();
  }, [weeklySchedule, loadTodayGoals]);

  const showBreakReminder = React.useCallback(() => {
    Alert.alert(
      '🍀 Mola Zamanı!',
      `${timerSettings.sessionDuration} dakika çalıştın. ${timerSettings.breakDuration} dakika mola vermeyi unutma!`,
      [
        { text: 'Devam Et', style: 'cancel' },
        { text: 'Mola Ver', onPress: () => setIsTimerRunning(false) },
      ]
    );
  }, [timerSettings.sessionDuration, timerSettings.breakDuration]);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => {
          const newTime = prev + 1;
          // Check if session duration reached and break reminder is enabled
          if (timerSettings.breakReminder && newTime >= timerSettings.sessionDuration * 60) {
            showBreakReminder();
            return newTime;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning, timerSettings.breakReminder, timerSettings.sessionDuration, showBreakReminder]);

  const loadTimerSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('timerSettings');
      if (settings) {
        setTimerSettings(JSON.parse(settings));
      }
    } catch (error) {
      console.log('Timer settings yüklenemedi:', error);
    }
  };

  const saveTimerSettings = async (settings: TimerSettings) => {
    try {
      await AsyncStorage.setItem('timerSettings', JSON.stringify(settings));
      setTimerSettings(settings);
    } catch (error) {
      console.log('Timer settings kaydedilemedi:', error);
    }
  };

  const startStudySession = () => {
    const sessionId = Date.now().toString();
    const session: StudySession = {
      id: sessionId,
      startTime: new Date(),
      duration: 0,
      subject: sessionSubject || todaySubject?.subject || '',
      topic: sessionTopic,
      completed: false,
    };
    
    setCurrentSession(session);
    setIsTimerRunning(true);
    setTimeElapsed(0);
  };

  const pauseSession = () => {
    setIsTimerRunning(false);
  };

  const resumeSession = () => {
    setIsTimerRunning(true);
  };

  const endSession = async () => {
    if (currentSession) {
      const endTime = new Date();
      const duration = Math.floor(timeElapsed / 60); // Convert to minutes
      
      const completedSession: StudySession = {
        ...currentSession,
        endTime,
        duration,
        completed: true,
      };

      await saveStudySession(completedSession);
      await updateDailyLogWithSession(completedSession);
      
      setCurrentSession(null);
      setIsTimerRunning(false);
      setTimeElapsed(0);
      setSessionSubject('');
      setSessionTopic('');
      
      Alert.alert(
        'Çalışma Tamamlandı! 🎉',
        `${duration} dakika çalıştın. Harika! 💪`,
        [{ text: 'Tamam', style: 'default' }]
      );
    }
  };

  const saveStudySession = async (session: StudySession) => {
    try {
      const existingSessions = await AsyncStorage.getItem('studySessions');
      const sessions: StudySession[] = existingSessions ? JSON.parse(existingSessions) : [];
      sessions.push(session);
      await AsyncStorage.setItem('studySessions', JSON.stringify(sessions));
    } catch (error) {
      console.log('Study session kaydedilemedi:', error);
    }
  };

  const updateDailyLogWithSession = async (session: StudySession) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const existingLogs = await AsyncStorage.getItem('dailyLogs');
      const logs: DailyLogEntry[] = existingLogs ? JSON.parse(existingLogs) : [];
      
      const todayLogIndex = logs.findIndex(log => log.date === today);
      
      if (todayLogIndex >= 0) {
        // Update existing log
        logs[todayLogIndex].studyTime += session.duration;
        logs[todayLogIndex].sessions = (logs[todayLogIndex].sessions || 0) + 1;
        if (session.subject && !logs[todayLogIndex].notes.includes(session.subject)) {
          logs[todayLogIndex].notes += `\n📚 ${session.subject}${session.topic ? ` - ${session.topic}` : ''} (${session.duration} dk)`;
        }
      } else {
        // Create new log
        const newLog: DailyLogEntry = {
          date: today,
          studyTime: session.duration,
          mood: 'good',
          notes: `📚 ${session.subject}${session.topic ? ` - ${session.topic}` : ''} (${session.duration} dk)`,
          completedTopics: [],
          totalProgress: {
            studied: 0,
            videosWatched: 0,
            questionsSolved: 0,
            completed: 0,
          },
          goals: {
            planned: 0,
            achieved: 0,
          },
          sessions: 1,
        };
        logs.push(newLog);
      }
      
      await AsyncStorage.setItem('dailyLogs', JSON.stringify(logs));
      
      // Also update daily goals with study time from timer
      await updateDailyGoalsWithSession(session);
    } catch (error) {
      console.log('Daily log güncellenemedi:', error);
    }
  };

  const updateDailyGoalsWithSession = async (session: StudySession) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const goalsData = await AsyncStorage.getItem('dailyGoals');
      
      if (!goalsData || !session.subject) return;
      
      let dailyGoals: DailyGoal[] = JSON.parse(goalsData);
      const subjectData = subjects.find(s => s.name === session.subject);
      
      if (!subjectData) return;
      
      const goalIndex = dailyGoals.findIndex(goal => 
        goal.date === today && goal.subjectId === subjectData.id
      );
      
      if (goalIndex !== -1) {
        // Update study time progress
        dailyGoals[goalIndex].progress.studyTime += session.duration;
        
        // Check if goal is completed
        const goal = dailyGoals[goalIndex];
        goal.completed = (
          goal.progress.videos >= goal.goals.videos &&
          goal.progress.questions >= goal.goals.questions &&
          goal.progress.topics >= goal.goals.topics &&
          goal.progress.studyTime >= goal.goals.studyTime
        );
        
        await AsyncStorage.setItem('dailyGoals', JSON.stringify(dailyGoals));
      }
    } catch (error) {
      console.log('Daily goals session update failed:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        const today = new Date().getDay();
        const dayIndex = today === 0 ? 6 : today - 1;
        setTodaySubject(weeklySchedule[dayIndex]);
        await loadProgress();
        await loadTodayGoals();
      };
      
      refreshData();
    }, [weeklySchedule, loadTodayGoals])
  );

  const loadProgress = async () => {
    try {
      const progress = await AsyncStorage.getItem('progress');
      if (progress) {
        const data = JSON.parse(progress);
        let total = 0;
        let completed = 0;
        let studied = 0;
        let videos = 0;
        let questions = 0;

        subjects.forEach(subject => {
          subject.topics.forEach((_, index) => {
            total += 4;
            const topicData = data[subject.id]?.[index];
            if (topicData) {
              if (topicData.studied) {
                completed++;
                studied++;
              }
              if (topicData.videoWatched) {
                completed++;
                videos++;
              }
              if (topicData.questionsSolved) {
                completed++;
                questions++;
              }
              if (topicData.completed) completed++;
            }
          });
        });

        setCompletionRate(total > 0 ? Math.round((completed / total) * 100) : 0);
        setStats({
          studiedTopics: studied,
          videosWatched: videos,
          questionsSolved: questions,
        });
      }
    } catch (error) {
      console.log('Progress yüklenemedi:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    
    // Update today's subject
    const today = new Date().getDay();
    const dayIndex = today === 0 ? 6 : today - 1;
    setTodaySubject(weeklySchedule[dayIndex]);
    
    // Reload progress data and goals
    await loadProgress();
    await loadTodayGoals();
    
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.compactHeader}>
        <Text style={styles.compactHeaderTitle}>KPSS Takip</Text>
        <Text style={styles.compactHeaderSubtitle}>Başarıya Giden Yol 🎯</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.homeContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary, colors.secondary]}
            title="Yenileniyor..."
            titleColor={colors.textSecondary}
          />
        }
      >
        <View style={styles.topSection}>
          {todaySubject && (
            <View style={[styles.compactTodayCard, {borderLeftColor: todaySubject.color}]}>
              <Icon name={todaySubject.icon} size={24} color={todaySubject.color} />
              <View style={styles.compactTodayInfo}>
                <Text style={styles.compactTodayLabel}>Bugünün Dersi</Text>
                <Text style={styles.compactTodaySubject}>{todaySubject.subject}</Text>
              </View>
              <View style={styles.compactProgressBadge}>
                <Text style={styles.compactProgressText}>{goalProgress.percentage}%</Text>
              </View>
              {goalProgress.total > 0 && (
                <View style={styles.goalSummary}>
                  <Text style={styles.goalSummaryText}>
                    {goalProgress.achieved}/{goalProgress.total} Hedef
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Study Timer Widget */}
          <View style={styles.timerWidget}>
            <View style={styles.timerHeader}>
              <Icon name="timer" size={20} color={colors.primary} />
              <Text style={styles.timerTitle}>Çalışma Zamanlayıcısı</Text>
              <TouchableOpacity 
                onPress={() => setShowTimerSettings(true)}
                style={styles.timerSettingsButton}
              >
                <Icon name="cog" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.timerDisplay}>
              <Text style={styles.timerTime}>{formatTime(timeElapsed)}</Text>
              <Text style={styles.timerSubtext}>
                {currentSession ? 
                  `${currentSession.subject || 'Genel Çalışma'}${currentSession.topic ? ` - ${currentSession.topic}` : ''}` : 
                  'Hedef: ' + timerSettings.sessionDuration + ' dk'
                }
              </Text>
            </View>

            <View style={styles.timerControls}>
              {!isTimerRunning && !currentSession ? (
                <TouchableOpacity 
                  onPress={startStudySession}
                  style={[styles.timerButton, styles.startButton]}
                >
                  <Icon name="play" size={16} color={colors.backgroundLight} />
                  <Text style={styles.timerButtonText}>Başla</Text>
                </TouchableOpacity>
              ) : isTimerRunning ? (
                <TouchableOpacity 
                  onPress={pauseSession}
                  style={[styles.timerButton, styles.pauseButton]}
                >
                  <Icon name="pause" size={16} color={colors.backgroundLight} />
                  <Text style={styles.timerButtonText}>Duraklat</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={resumeSession}
                  style={[styles.timerButton, styles.resumeButton]}
                >
                  <Icon name="play" size={16} color={colors.backgroundLight} />
                  <Text style={styles.timerButtonText}>Devam Et</Text>
                </TouchableOpacity>
              )}
              
              {currentSession && (
                <TouchableOpacity 
                  onPress={endSession}
                  style={[styles.timerButton, styles.endButton]}
                >
                  <Icon name="stop" size={16} color={colors.backgroundLight} />
                  <Text style={styles.timerButtonText}>Bitir</Text>
                </TouchableOpacity>
              )}
            </View>

            {currentSession && (
              <View style={styles.sessionInputs}>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.sessionInput}
                    placeholder="Ders (opsiyonel)"
                    value={sessionSubject}
                    onChangeText={setSessionSubject}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.sessionInput}
                    placeholder="Konu (opsiyonel)"
                    value={sessionTopic}
                    onChangeText={setSessionTopic}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.compactStatsSection}>
          <View style={styles.statsRow}>
            <View style={styles.compactStatItem}>
              <Icon name="book-check" size={20} color={colors.success} />
              <Text style={styles.compactStatValue}>{stats.studiedTopics}</Text>
              <Text style={styles.compactStatLabel}>Konu</Text>
            </View>
            <View style={styles.compactStatItem}>
              <Icon name="video" size={20} color={colors.primary} />
              <Text style={styles.compactStatValue}>{stats.videosWatched}</Text>
              <Text style={styles.compactStatLabel}>Video</Text>
            </View>
            <View style={styles.compactStatItem}>
              <Icon name="checkbox-marked-circle" size={20} color={colors.warning} />
              <Text style={styles.compactStatValue}>{stats.questionsSolved}</Text>
              <Text style={styles.compactStatLabel}>Soru</Text>
            </View>
          </View>
        </View>

        <View style={styles.compactMotivationCard}>
          <Icon name="fire" size={20} color="#F59E0B" />
          <Text style={styles.compactMotivationText}>
            Her gün biraz daha ilerliyorsun! 💪
          </Text>
        </View>
      </ScrollView>

      {/* Timer Settings Modal */}
      <Modal
        visible={showTimerSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTimerSettings(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Zamanlayıcı Ayarları</Text>
              <TouchableOpacity 
                onPress={() => setShowTimerSettings(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Çalışma Süresi (dakika)</Text>
              <View style={styles.settingInputRow}>
                <TouchableOpacity 
                  onPress={() => saveTimerSettings({...timerSettings, sessionDuration: Math.max(5, timerSettings.sessionDuration - 5)})}
                  style={styles.adjustButton}
                >
                  <Icon name="minus" size={16} color={colors.primary} />
                </TouchableOpacity>
                <Text style={styles.settingValue}>{timerSettings.sessionDuration}</Text>
                <TouchableOpacity 
                  onPress={() => saveTimerSettings({...timerSettings, sessionDuration: Math.min(120, timerSettings.sessionDuration + 5)})}
                  style={styles.adjustButton}
                >
                  <Icon name="plus" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Mola Hatırlatıcısı</Text>
              <TouchableOpacity 
                onPress={() => saveTimerSettings({...timerSettings, breakReminder: !timerSettings.breakReminder})}
                style={styles.toggleButton}
              >
                <Icon 
                  name={timerSettings.breakReminder ? "toggle-switch" : "toggle-switch-off"} 
                  size={24} 
                  color={timerSettings.breakReminder ? colors.success : colors.textMuted} 
                />
              </TouchableOpacity>
            </View>

            {timerSettings.breakReminder && (
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Mola Süresi (dakika)</Text>
                <View style={styles.settingInputRow}>
                  <TouchableOpacity 
                    onPress={() => saveTimerSettings({...timerSettings, breakDuration: Math.max(1, timerSettings.breakDuration - 1)})}
                    style={styles.adjustButton}
                  >
                    <Icon name="minus" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.settingValue}>{timerSettings.breakDuration}</Text>
                  <TouchableOpacity 
                    onPress={() => saveTimerSettings({...timerSettings, breakDuration: Math.min(30, timerSettings.breakDuration + 1)})}
                    style={styles.adjustButton}
                  >
                    <Icon name="plus" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity 
              onPress={() => setShowTimerSettings(false)}
              style={styles.modalSaveButton}
            >
              <Text style={styles.modalSaveButtonText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Dersler Ekranı
function SubjectsScreen() {
  interface Subject {
    id: string;
    name: string;
    icon: string;
    color: string;
    topics: string[];
  }
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [progress, setProgress] = useState<Record<string, { [topicIndex: number]: TopicProgress }>>({});
  const [customTopics, setCustomTopics] = useState<Record<string, string[]>>({});
  const [isEditingTopics, setIsEditingTopics] = useState(false);
  const [newTopicText, setNewTopicText] = useState('');

  useEffect(() => {
    loadProgress();
    loadCustomTopics();
  }, []);

  const loadProgress = async () => {
    try {
      const data = await AsyncStorage.getItem('progress');
      if (data) {
        setProgress(JSON.parse(data));
      }
    } catch (error) {
      console.log('Progress yüklenemedi:', error);
    }
  };

  const loadCustomTopics = async () => {
    try {
      const data = await AsyncStorage.getItem('customTopics');
      if (data) {
        setCustomTopics(JSON.parse(data));
      }
    } catch (error) {
      console.log('Custom topics yüklenemedi:', error);
    }
  };

  const saveCustomTopics = async (newCustomTopics: Record<string, string[]>) => {
    try {
      await AsyncStorage.setItem('customTopics', JSON.stringify(newCustomTopics));
      setCustomTopics(newCustomTopics);
    } catch (error) {
      console.log('Custom topics kaydedilemedi:', error);
    }
  };

  const getTopicsForSubject = (subjectId: string): string[] => {
    const defaultTopics = subjects.find(s => s.id === subjectId)?.topics || [];
    return customTopics[subjectId] || defaultTopics;
  };

  const addCustomTopic = (subjectId: string, topicName: string) => {
    if (topicName.trim()) {
      const currentTopics = getTopicsForSubject(subjectId);
      const newTopics = [...currentTopics, topicName.trim()];
      const newCustomTopics = { ...customTopics, [subjectId]: newTopics };
      saveCustomTopics(newCustomTopics);
      setNewTopicText('');
    }
  };

  const removeCustomTopic = (subjectId: string, topicIndex: number) => {
    const currentTopics = getTopicsForSubject(subjectId);
    const newTopics = currentTopics.filter((_, index) => index !== topicIndex);
    const newCustomTopics = { ...customTopics, [subjectId]: newTopics };
    saveCustomTopics(newCustomTopics);
    
    // Also clean up progress for removed topic
    const newProgress = { ...progress };
    if (newProgress[subjectId]) {
      delete newProgress[subjectId][topicIndex];
      // Reindex remaining topics
      const reindexedProgress: { [topicIndex: number]: TopicProgress } = {};
      Object.keys(newProgress[subjectId])
        .map(Number)
        .filter(index => index < topicIndex)
        .forEach(index => {
          reindexedProgress[index] = newProgress[subjectId][index];
        });
      Object.keys(newProgress[subjectId])
        .map(Number)
        .filter(index => index > topicIndex)
        .forEach(index => {
          reindexedProgress[index - 1] = newProgress[subjectId][index];
        });
      newProgress[subjectId] = reindexedProgress;
      saveProgress(newProgress);
    }
  };

  interface TopicProgress {
    studied: boolean;
    videoWatched: boolean;
    questionsSolved: boolean;
    completed: boolean;
  }

  interface SubjectProgress {
    [topicIndex: number]: TopicProgress;
  }

  interface ProgressData {
    [subjectId: string]: SubjectProgress;
  }

  const updateDailyGoalsProgress = React.useCallback(async (progressData: ProgressData) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const goalsData = await AsyncStorage.getItem('dailyGoals');
      
      if (!goalsData) return;
      
      let dailyGoals: DailyGoal[] = JSON.parse(goalsData);
      let updated = false;

      // Update progress for each subject's goals
      subjects.forEach(subject => {
        const goalIndex = dailyGoals.findIndex(goal => 
          goal.date === today && goal.subjectId === subject.id
        );
        
        if (goalIndex !== -1) {
          const subjectProgress = progressData[subject.id];
          if (subjectProgress) {
            let videos = 0;
            let questions = 0;
            let topics = 0;
            let studyTime = 0;

            // Count progress for this subject
            Object.keys(subjectProgress).forEach(topicIndexStr => {
              const topicIndex = Number(topicIndexStr);
              const topicData = subjectProgress[topicIndex];
              
              if (topicData.videoWatched) videos++;
              if (topicData.questionsSolved) questions++;
              if (topicData.studied) topics++;
              if (topicData.completed) studyTime += 30; // Estimate 30 min per completed topic
            });

            // Update the goal progress
            dailyGoals[goalIndex].progress = {
              videos,
              questions,
              topics,
              studyTime,
            };

            // Check if goal is completed
            const goal = dailyGoals[goalIndex];
            goal.completed = (
              goal.progress.videos >= goal.goals.videos &&
              goal.progress.questions >= goal.goals.questions &&
              goal.progress.topics >= goal.goals.topics &&
              goal.progress.studyTime >= goal.goals.studyTime
            );

            updated = true;
          }
        }
      });

      if (updated) {
        await AsyncStorage.setItem('dailyGoals', JSON.stringify(dailyGoals));
      }
    } catch (error) {
      console.log('Daily goals progress update failed:', error);
    }
  }, []);

  const updateDailyLogFromProgress = React.useCallback(async (progressData: ProgressData) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const existingLogs = await AsyncStorage.getItem('dailyLogs');
      let dailyLogs: DailyLogEntry[] = existingLogs ? JSON.parse(existingLogs) : [];
      
      // Find or create today's log
      let todayLogIndex = dailyLogs.findIndex(log => log.date === today);
      let todayLog: DailyLogEntry;
      
      if (todayLogIndex === -1) {
        // Create new log for today
        todayLog = {
          date: today,
          studyTime: 0,
          completedTopics: [],
          totalProgress: {
            studied: 0,
            videosWatched: 0,
            questionsSolved: 0,
            completed: 0,
          },
          notes: '',
          mood: 'good',
          goals: {
            planned: 5,
            achieved: 0,
          },
        };
        dailyLogs.push(todayLog);
        todayLogIndex = dailyLogs.length - 1;
      } else {
        todayLog = dailyLogs[todayLogIndex];
      }

      // Calculate current progress from all subjects
      let totalStudied = 0;
      let totalVideos = 0;
      let totalQuestions = 0;
      let totalCompleted = 0;
      const completedTopicsToday: any[] = [];

      subjects.forEach(subject => {
        const subjectProgress = progressData[subject.id];
        if (subjectProgress) {
          Object.keys(subjectProgress).forEach(topicIndexStr => {
            const topicIndex = Number(topicIndexStr);
            const topicData = subjectProgress[topicIndex];
            
            if (topicData.studied) {
              totalStudied++;
              completedTopicsToday.push({
                subjectId: subject.id,
                topicIndex,
                topicName: subject.topics[topicIndex] || 'Unknown Topic',
                timeSpent: 30, // Estimate 30 minutes per topic
                type: 'studied' as const,
              });
            }
            if (topicData.videoWatched) {
              totalVideos++;
              completedTopicsToday.push({
                subjectId: subject.id,
                topicIndex,
                topicName: subject.topics[topicIndex] || 'Unknown Topic',
                timeSpent: 20, // Estimate 20 minutes per video
                type: 'video' as const,
              });
            }
            if (topicData.questionsSolved) {
              totalQuestions++;
              completedTopicsToday.push({
                subjectId: subject.id,
                topicIndex,
                topicName: subject.topics[topicIndex] || 'Unknown Topic',
                timeSpent: 15, // Estimate 15 minutes per question set
                type: 'questions' as const,
              });
            }
            if (topicData.completed) {
              totalCompleted++;
            }
          });
        }
      });

      // Update today's log
      todayLog.totalProgress = {
        studied: totalStudied,
        videosWatched: totalVideos,
        questionsSolved: totalQuestions,
        completed: totalCompleted,
      };
      todayLog.completedTopics = completedTopicsToday;
      todayLog.studyTime = completedTopicsToday.reduce((sum, topic) => sum + topic.timeSpent, 0);
      todayLog.goals.achieved = totalCompleted;

      dailyLogs[todayLogIndex] = todayLog;
      
      // Sort logs by date (newest first)
      dailyLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      await AsyncStorage.setItem('dailyLogs', JSON.stringify(dailyLogs));
      
      // Also update daily goals progress
      await updateDailyGoalsProgress(progressData);
    } catch (error) {
      console.log('Daily log update failed:', error);
    }
  }, [updateDailyGoalsProgress]);

  const saveProgress = React.useCallback(async (newProgress: ProgressData) => {
    try {
      await AsyncStorage.setItem('progress', JSON.stringify(newProgress));
      setProgress(newProgress);
      
      // Auto-generate daily log entry when progress is saved
      await updateDailyLogFromProgress(newProgress);
    } catch (error) {
      console.log('Progress kaydedilemedi:', error);
    }
  }, [updateDailyLogFromProgress]);

  interface ToggleProgressField {
    studied: boolean;
    videoWatched: boolean;
    questionsSolved: boolean;
    completed: boolean;
  }

  type ProgressField = keyof ToggleProgressField;

  const toggleProgress = React.useCallback((
    subjectId: string,
    topicIndex: number,
    field: ProgressField
  ) => {
    const newProgress: ProgressState = {...progress};
    if (!newProgress[subjectId]) {
      newProgress[subjectId] = {};
    }
    if (!newProgress[subjectId][topicIndex]) {
      newProgress[subjectId][topicIndex] = {
        studied: false,
        videoWatched: false,
        questionsSolved: false,
        completed: false,
      };
    }
    newProgress[subjectId][topicIndex][field] =
      !newProgress[subjectId][topicIndex][field];
    saveProgress(newProgress);
  }, [progress, saveProgress]);

  interface Subject {
    id: string;
    name: string;
    icon: string;
    color: string;
    topics: string[];
  }

  interface TopicProgress {
    studied: boolean;
    videoWatched: boolean;
    questionsSolved: boolean;
    completed: boolean;
  }

  interface ProgressState {
    [subjectId: string]: {
      [topicIndex: number]: TopicProgress;
    };
  }

  const getSubjectProgress = (subjectId: string): number => {
    const subjectTopics: number = getTopicsForSubject(subjectId).length;
    let completed = 0;
    if ((progress as ProgressState)[subjectId]) {
      Object.keys((progress as ProgressState)[subjectId]).forEach((topicIndex: string) => {
        if ((progress as ProgressState)[subjectId][Number(topicIndex)].completed) {
          completed++;
        }
      });
    }
    return subjectTopics > 0 ? Math.round((completed / subjectTopics) * 100) : 0;
  };

  if (selectedSubject) {
    return (
      <View style={styles.container}>
        <View style={styles.subjectHeader}>
          <TouchableOpacity onPress={() => setSelectedSubject(null)}>
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.subjectHeaderTitle}>{selectedSubject.name}</Text>
          <View style={styles.subjectHeaderActions}>
            <TouchableOpacity 
              onPress={() => setIsEditingTopics(!isEditingTopics)}
              style={styles.editTopicsButton}
            >
              <Icon 
                name={isEditingTopics ? "check" : "pencil"} 
                size={20} 
                color={isEditingTopics ? colors.success : colors.primary} 
              />
            </TouchableOpacity>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>
                {getSubjectProgress(selectedSubject.id)}%
              </Text>
            </View>
          </View>
        </View>
        <ScrollView style={styles.topicList}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.headerTopicCell]}>Konu</Text>
            <View style={styles.headerIconCell}>
              <Icon
                name="book-open-variant"
                size={22}
                color={colors.backgroundLight}
              />
              <Text style={styles.headerIconLabel}>Ders</Text>
            </View>
            <View style={styles.headerIconCell}>
              <Icon
                name="video"
                size={22}
                color={colors.backgroundLight}
              />
              <Text style={styles.headerIconLabel}>Video</Text>
            </View>
            <View style={styles.headerIconCell}>
              <Icon
                name="file-document-edit"
                size={22}
                color={colors.backgroundLight}
              />
              <Text style={styles.headerIconLabel}>Test</Text>
            </View>
            <View style={styles.headerIconCell}>
              <Icon
                name="check-circle"
                size={22}
                color={colors.backgroundLight}
              />
              <Text style={styles.headerIconLabel}>Tamam</Text>
            </View>
          </View>
          {getTopicsForSubject(selectedSubject.id).map((topic, index) => {
            const topicProgress = progress[selectedSubject.id]?.[index] || {
              studied: false,
              videoWatched: false,
              questionsSolved: false,
              completed: false,
            };
            const isLastRow = index === getTopicsForSubject(selectedSubject.id).length - 1;
            return (
              <View key={index} style={[
                styles.tableRow,
                isLastRow && !isEditingTopics && styles.lastTableRow
              ]}>
                <View style={styles.topicCellContainer}>
                  <Text style={[
                    styles.tableCell, 
                    styles.topicCell,
                    topicProgress.completed && styles.completedTopicText
                  ]}>
                    {topic}
                  </Text>
                  {isEditingTopics && (
                    <TouchableOpacity
                      onPress={() => removeCustomTopic(selectedSubject.id, index)}
                      style={styles.deleteTopicButton}
                    >
                      <Icon name="delete" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() =>
                    toggleProgress(selectedSubject.id, index, 'studied')
                  }
                  style={[
                    styles.iconCell,
                    topicProgress.studied && styles.checkboxActive
                  ]}>
                  <Icon
                    name={
                      topicProgress.studied
                        ? 'checkbox-marked-circle'
                        : 'checkbox-blank-circle-outline'
                    }
                    size={22}
                    color={topicProgress.studied ? colors.success : colors.border}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    toggleProgress(selectedSubject.id, index, 'videoWatched')
                  }
                  style={[
                    styles.iconCell,
                    topicProgress.videoWatched && styles.checkboxActiveVideo
                  ]}>
                  <Icon
                    name={
                      topicProgress.videoWatched
                        ? 'checkbox-marked-circle'
                        : 'checkbox-blank-circle-outline'
                    }
                    size={22}
                    color={
                      topicProgress.videoWatched ? colors.primary : colors.border
                    }
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    toggleProgress(selectedSubject.id, index, 'questionsSolved')
                  }
                  style={[
                    styles.iconCell,
                    topicProgress.questionsSolved && styles.checkboxActiveQuestion
                  ]}>
                  <Icon
                    name={
                      topicProgress.questionsSolved
                        ? 'checkbox-marked-circle'
                        : 'checkbox-blank-circle-outline'
                    }
                    size={22}
                    color={
                      topicProgress.questionsSolved ? colors.warning : colors.border
                    }
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    toggleProgress(selectedSubject.id, index, 'completed')
                  }
                  style={[
                    styles.iconCell,
                    topicProgress.completed && styles.checkboxActiveCompleted
                  ]}>
                  <Icon
                    name={
                      topicProgress.completed
                        ? 'checkbox-marked-circle'
                        : 'checkbox-blank-circle-outline'
                    }
                    size={22}
                    color={
                      topicProgress.completed ? colors.secondary : colors.border
                    }
                  />
                </TouchableOpacity>
              </View>
            );
          })}
          {isEditingTopics && (
            <View style={[styles.tableRow, styles.addTopicRow, styles.lastTableRow]}>
              <TextInput
                style={styles.addTopicInput}
                placeholder="Yeni konu ekle..."
                placeholderTextColor={colors.textMuted}
                value={newTopicText}
                onChangeText={setNewTopicText}
                onSubmitEditing={() => addCustomTopic(selectedSubject.id, newTopicText)}
              />
              <TouchableOpacity
                onPress={() => addCustomTopic(selectedSubject.id, newTopicText)}
                style={styles.addTopicButton}
              >
                <Icon name="plus" size={22} color={colors.success} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dersler</Text>
        <Text style={styles.headerSubtitle}>Konu takibini yap 📚</Text>
      </View>
      <View style={styles.subjectsGrid}>
        {subjects.map(subject => {
          const progressPercent = getSubjectProgress(subject.id);
          return (
            <TouchableOpacity
              key={subject.id}
              style={[styles.subjectCard, {borderLeftColor: subject.color}]}
              onPress={() => setSelectedSubject(subject)}>
              <View style={styles.subjectCardHeader}>
                <Icon name={subject.icon} size={32} color={subject.color} />
                <View style={[styles.miniProgressBadge, {backgroundColor: `${subject.color}20`}]}>
                  <Text style={[styles.miniProgressText, {color: subject.color}]}>
                    {progressPercent}%
                  </Text>
                </View>
              </View>
              <Text style={styles.subjectCardTitle}>{subject.name}</Text>
              <Text style={styles.subjectCardTopics}>
                {getTopicsForSubject(subject.id).length} Konu
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// Ajanda Ekranı
function ScheduleScreen({ 
  weeklySchedule, 
  saveCustomSchedule 
}: { 
  weeklySchedule: typeof defaultWeeklySchedule; 
  saveCustomSchedule: (newSchedule: typeof defaultWeeklySchedule) => Promise<void>;
}) {
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customSchedule, setCustomSchedule] = useState(weeklySchedule);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [selectedSubjectForGoals, setSelectedSubjectForGoals] = useState<string>('');
  const [dailyGoals, setDailyGoals] = useState({
    videos: 0,
    questions: 0,
    topics: 0,
    studyTime: 0,
  });

  useEffect(() => {
    setCustomSchedule(weeklySchedule);
  }, [weeklySchedule]);

  const handleScheduleItemPress = (subject: string) => {
    setSelectedSubjectForGoals(subject);
    loadExistingGoals(subject);
    setShowGoalsModal(true);
  };

  const loadExistingGoals = async (subject: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const goalsData = await AsyncStorage.getItem('dailyGoals');
      if (goalsData) {
        const allGoals: DailyGoal[] = JSON.parse(goalsData);
        const subjectData = subjects.find(s => s.name === subject);
        const existingGoal = allGoals.find(goal => 
          goal.date === today && goal.subjectId === subjectData?.id
        );
        
        if (existingGoal) {
          setDailyGoals(existingGoal.goals);
        } else {
          setDailyGoals({ videos: 0, questions: 0, topics: 0, studyTime: 0 });
        }
      }
    } catch (error) {
      console.log('Existing goals yüklenemedi:', error);
    }
  };

  const saveDailyGoals = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const subjectData = subjects.find(s => s.name === selectedSubjectForGoals);
      
      if (!subjectData) return;

      const goalsData = await AsyncStorage.getItem('dailyGoals');
      const allGoals: DailyGoal[] = goalsData ? JSON.parse(goalsData) : [];
      
      // Remove existing goal for this subject and date
      const filteredGoals = allGoals.filter(goal => 
        !(goal.date === today && goal.subjectId === subjectData.id)
      );

      // Add new goal
      const newGoal: DailyGoal = {
        id: `${today}-${subjectData.id}`,
        subjectId: subjectData.id,
        date: today,
        goals: dailyGoals,
        progress: { videos: 0, questions: 0, topics: 0, studyTime: 0 },
        completed: false,
      };

      filteredGoals.push(newGoal);
      await AsyncStorage.setItem('dailyGoals', JSON.stringify(filteredGoals));
      
      setShowGoalsModal(false);
      Alert.alert('✅ Başarılı', `${selectedSubjectForGoals} için günlük hedefler kaydedildi!`);
    } catch (error) {
      console.log('Daily goals kaydedilemedi:', error);
      Alert.alert('❌ Hata', 'Hedefler kaydedilirken bir hata oluştu.');
    }
  };

  const handleSaveCustomization = async () => {
    await saveCustomSchedule(customSchedule);
    setIsCustomizing(false);
    setEditingDay(null);
  };

  const handleCancelCustomization = () => {
    setCustomSchedule(weeklySchedule);
    setIsCustomizing(false);
    setEditingDay(null);
  };

  const handleDayEdit = (dayIndex: number, newSubject: string) => {
    const updatedSchedule = [...customSchedule];
    const subjectData = subjects.find(s => s.name === newSubject) || { icon: 'help-circle', color: colors.textLight };
    
    updatedSchedule[dayIndex] = {
      ...updatedSchedule[dayIndex],
      subject: newSubject,
      icon: subjectData.icon,
      color: subjectData.color,
    };
    
    setCustomSchedule(updatedSchedule);
    setEditingDay(null);
  };

  const handleMoveDay = (fromIndex: number, toIndex: number) => {
    const updatedSchedule = [...customSchedule];
    const [movedItem] = updatedSchedule.splice(fromIndex, 1);
    updatedSchedule.splice(toIndex, 0, movedItem);
    setCustomSchedule(updatedSchedule);
  };

  if (isCustomizing) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Program Düzenle</Text>
          <Text style={styles.headerSubtitle}>Çalışma programını özelleştir ✏️</Text>
        </View>

        <View style={styles.customizationControls}>
          <TouchableOpacity onPress={handleSaveCustomization} style={[styles.controlButton, styles.saveButton]}>
            <Icon name="check" size={20} color={colors.backgroundLight} />
            <Text style={styles.controlButtonText}>Kaydet</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCancelCustomization} style={[styles.controlButton, styles.cancelButton]}>
            <Icon name="close" size={20} color={colors.backgroundLight} />
            <Text style={styles.controlButtonText}>İptal</Text>
          </TouchableOpacity>
        </View>

        {customSchedule.map((item, index) => (
          <View key={index} style={[styles.editableScheduleCard, {borderLeftColor: item.color}]}>
            <View style={styles.scheduleDay}>
              <Text style={styles.scheduleDayText}>{item.day}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.editableScheduleContent}
              onPress={() => setEditingDay(editingDay === index ? null : index)}
            >
              <Icon name={item.icon} size={28} color={item.color} />
              <Text style={styles.scheduleSubject}>{item.subject}</Text>
              <Icon name="pencil" size={16} color={colors.textLight} />
            </TouchableOpacity>

            {editingDay === index && (
              <View style={styles.subjectOptions}>
                {[...subjects.map(s => s.name), 'Tekrar', 'Test', 'Dinlenme', 'Serbest Çalışma'].map((subject) => (
                  <TouchableOpacity
                    key={subject}
                    style={styles.subjectOption}
                    onPress={() => handleDayEdit(index, subject)}
                  >
                    <Text style={styles.subjectOptionText}>{subject}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.moveControls}>
              {index > 0 && (
                <TouchableOpacity onPress={() => handleMoveDay(index, index - 1)} style={styles.moveButton}>
                  <Icon name="arrow-up" size={20} color={colors.primary} />
                </TouchableOpacity>
              )}
              {index < customSchedule.length - 1 && (
                <TouchableOpacity onPress={() => handleMoveDay(index, index + 1)} style={styles.moveButton}>
                  <Icon name="arrow-down" size={20} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Haftalık Program</Text>
        <Text style={styles.headerSubtitle}>Çalışma takvimin 📅</Text>
        <TouchableOpacity 
          style={styles.customizeButton}
          onPress={() => setIsCustomizing(true)}
        >
          <Icon name="cog" size={20} color={colors.primary} />
          <Text style={styles.customizeButtonText}>Düzenle</Text>
        </TouchableOpacity>
      </View>
      {weeklySchedule.map((item, index) => (
        <TouchableOpacity 
          key={index} 
          style={[styles.scheduleCard, {borderLeftColor: item.color}]}
          onPress={() => handleScheduleItemPress(item.subject)}
          activeOpacity={0.8}
        >
          <View style={styles.scheduleDay}>
            <Text style={styles.scheduleDayText}>{item.day}</Text>
          </View>
          <View style={styles.scheduleContent}>
            <Icon name={item.icon} size={28} color={item.color} />
            <Text style={styles.scheduleSubject}>{item.subject}</Text>
          </View>
          <View style={styles.scheduleActions}>
            <Icon name="chevron-right" size={24} color={colors.textLight} />
          </View>
        </TouchableOpacity>
      ))}
      
      <View style={styles.tipCard}>
        <Icon name="lightbulb-on" size={24} color={colors.warning} />
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>💡 İpucu</Text>
          <Text style={styles.tipText}>
            Düzenli çalışma başarının anahtarıdır. Her gün belirlenen derse odaklan!
          </Text>
        </View>
      </View>

      {/* Daily Goals Modal */}
      <Modal
        visible={showGoalsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGoalsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedSubjectForGoals} - Günlük Hedefler</Text>
              <TouchableOpacity 
                onPress={() => setShowGoalsModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.goalInputSection}>
              <View style={styles.goalInputItem}>
                <View style={styles.goalInputHeader}>
                  <Icon name="video" size={20} color={colors.primary} />
                  <Text style={styles.goalInputLabel}>Video İzle</Text>
                </View>
                <View style={styles.goalInputRow}>
                  <TouchableOpacity 
                    onPress={() => setDailyGoals({...dailyGoals, videos: Math.max(0, dailyGoals.videos - 1)})}
                    style={styles.adjustButton}
                  >
                    <Icon name="minus" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.goalInputValue}>{dailyGoals.videos}</Text>
                  <TouchableOpacity 
                    onPress={() => setDailyGoals({...dailyGoals, videos: Math.min(20, dailyGoals.videos + 1)})}
                    style={styles.adjustButton}
                  >
                    <Icon name="plus" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.goalInputItem}>
                <View style={styles.goalInputHeader}>
                  <Icon name="help-circle" size={20} color={colors.warning} />
                  <Text style={styles.goalInputLabel}>Soru Çöz</Text>
                </View>
                <View style={styles.goalInputRow}>
                  <TouchableOpacity 
                    onPress={() => setDailyGoals({...dailyGoals, questions: Math.max(0, dailyGoals.questions - 5)})}
                    style={styles.adjustButton}
                  >
                    <Icon name="minus" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.goalInputValue}>{dailyGoals.questions}</Text>
                  <TouchableOpacity 
                    onPress={() => setDailyGoals({...dailyGoals, questions: Math.min(100, dailyGoals.questions + 5)})}
                    style={styles.adjustButton}
                  >
                    <Icon name="plus" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.goalInputItem}>
                <View style={styles.goalInputHeader}>
                  <Icon name="book-check" size={20} color={colors.success} />
                  <Text style={styles.goalInputLabel}>Konu Tamamla</Text>
                </View>
                <View style={styles.goalInputRow}>
                  <TouchableOpacity 
                    onPress={() => setDailyGoals({...dailyGoals, topics: Math.max(0, dailyGoals.topics - 1)})}
                    style={styles.adjustButton}
                  >
                    <Icon name="minus" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.goalInputValue}>{dailyGoals.topics}</Text>
                  <TouchableOpacity 
                    onPress={() => setDailyGoals({...dailyGoals, topics: Math.min(10, dailyGoals.topics + 1)})}
                    style={styles.adjustButton}
                  >
                    <Icon name="plus" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.goalInputItem}>
                <View style={styles.goalInputHeader}>
                  <Icon name="clock" size={20} color={colors.secondary} />
                  <Text style={styles.goalInputLabel}>Çalışma Süresi (dk)</Text>
                </View>
                <View style={styles.goalInputRow}>
                  <TouchableOpacity 
                    onPress={() => setDailyGoals({...dailyGoals, studyTime: Math.max(0, dailyGoals.studyTime - 15)})}
                    style={styles.adjustButton}
                  >
                    <Icon name="minus" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.goalInputValue}>{dailyGoals.studyTime}</Text>
                  <TouchableOpacity 
                    onPress={() => setDailyGoals({...dailyGoals, studyTime: Math.min(480, dailyGoals.studyTime + 15)})}
                    style={styles.adjustButton}
                  >
                    <Icon name="plus" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.goalModalActions}>
              <TouchableOpacity 
                onPress={() => setShowGoalsModal(false)}
                style={[styles.goalActionButton, styles.cancelGoalButton]}
              >
                <Text style={styles.cancelGoalButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={saveDailyGoals}
                style={[styles.goalActionButton, styles.saveGoalButton]}
              >
                <Text style={styles.saveGoalButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// İlerleme Ekranı
function ProgressScreen() {
  const [stats, setStats] = useState({
    totalTopics: 0,
    completedTopics: 0,
    videosWatched: 0,
    questionsSolved: 0,
    studiedTopics: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  type SubjectStat = {
    name: string;
    color: string;
    icon: string;
    completed: number;
    total: number;
    percent: number;
  };
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    try {
      const progress = await AsyncStorage.getItem('progress');
      if (progress) {
        const data = JSON.parse(progress);
        let completed = 0;
        let videos = 0;
        let questions = 0;
        let studied = 0;
        let total = 0;

        const subjectData = subjects.map(subject => {
          let subjectCompleted = 0;
          let subjectTotal = subject.topics.length;

          subject.topics.forEach((_, index) => {
            total++;
            const topicData = data[subject.id]?.[index];
            if (topicData) {
              if (topicData.completed) {
                completed++;
                subjectCompleted++;
              }
              if (topicData.videoWatched) videos++;
              if (topicData.questionsSolved) questions++;
              if (topicData.studied) studied++;
            }
          });

          return {
            name: subject.name,
            color: subject.color,
            icon: subject.icon,
            completed: subjectCompleted,
            total: subjectTotal,
            percent: subjectTotal > 0 ? Math.round((subjectCompleted / subjectTotal) * 100) : 0,
          };
        });

        setStats({
          totalTopics: total,
          completedTopics: completed,
          videosWatched: videos,
          questionsSolved: questions,
          studiedTopics: studied,
        });

        setSubjectStats(subjectData);
      }
    } catch (error) {
      console.log('İstatistikler yüklenemedi:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary, colors.secondary]}
          title="Yenileniyor..."
          titleColor={colors.textSecondary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>İlerleme</Text>
        <Text style={styles.headerSubtitle}>Performansını gör 📈</Text>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Genel Durum</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.progressStatItem, styles.statItemWithBg]}>
            <View style={[styles.statIconContainer, {backgroundColor: `${colors.success}15`}]}>
              <Icon name="book-check" size={36} color={colors.success} />
            </View>
            <Text style={styles.progressStatValue}>{stats.completedTopics}</Text>
            <Text style={styles.progressStatLabel}>Tamamlanan</Text>
          </View>
          <View style={[styles.progressStatItem, styles.statItemWithBg]}>
            <View style={[styles.statIconContainer, {backgroundColor: `${colors.primary}15`}]}>
              <Icon name="book-open" size={36} color={colors.primary} />
            </View>
            <Text style={styles.progressStatValue}>{stats.studiedTopics}</Text>
            <Text style={styles.progressStatLabel}>Çalışılan</Text>
          </View>
        </View>
        <View style={styles.statsGrid}>
          <View style={[styles.progressStatItem, styles.statItemWithBg]}>
            <View style={[styles.statIconContainer, {backgroundColor: `${colors.secondary}15`}]}>
              <Icon name="video" size={36} color={colors.secondary} />
            </View>
            <Text style={styles.progressStatValue}>{stats.videosWatched}</Text>
            <Text style={styles.progressStatLabel}>Video</Text>
          </View>
          <View style={[styles.progressStatItem, styles.statItemWithBg]}>
            <View style={[styles.statIconContainer, {backgroundColor: `${colors.warning}15`}]}>
              <Icon name="file-document-edit" size={36} color={colors.warning} />
            </View>
            <Text style={styles.progressStatValue}>{stats.questionsSolved}</Text>
            <Text style={styles.progressStatLabel}>Soru</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Ders Bazlı İlerleme</Text>
        {subjectStats.map((subject, index) => (
          <View key={index} style={styles.subjectProgressItem}>
            <View style={styles.subjectProgressHeader}>
              <View style={styles.subjectProgressInfo}>
                <Icon name={subject.icon} size={20} color={subject.color} />
                <Text style={styles.subjectProgressName}>{subject.name}</Text>
              </View>
              <Text style={styles.subjectProgressPercent}>{subject.percent}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarFill, 
                  {width: `${subject.percent}%`, backgroundColor: subject.color}
                ]} 
              />
            </View>
            <Text style={styles.subjectProgressDetails}>
              {subject.completed}/{subject.total} konu tamamlandı
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.motivationCard}>
        <Icon name="trophy" size={28} color="#F59E0B" />
        <Text style={styles.motivationText}>
          Harika gidiyorsun! Devam et! 🌟
        </Text>
      </View>
    </ScrollView>
  );
}

// Reports Screen
function ReportsScreen() {
  const [selectedReport, setSelectedReport] = useState<'daily' | 'weekly' | 'monthly' | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyLogs, setDailyLogs] = useState<DailyLogEntry[]>([]);
  const [currentDayLog, setCurrentDayLog] = useState<DailyLogEntry | null>(null);
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [newLogNotes, setNewLogNotes] = useState('');
  const [newLogMood, setNewLogMood] = useState<'excellent' | 'good' | 'average' | 'challenging' | 'difficult'>('good');

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'studied': return 'Ders';
      case 'video': return 'Video';
      case 'questions': return 'Soru';
      case 'completed': return 'Tamam';
      default: return 'Diğer';
    }
  };

  useEffect(() => {
    loadDailyLogs();
    loadTodayLog();
  }, []);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        await loadDailyLogs();
        await loadTodayLog();
      };
      
      refreshData();
    }, [])
  );

  const loadDailyLogs = async () => {
    try {
      const data = await AsyncStorage.getItem('dailyLogs');
      if (data) {
        setDailyLogs(JSON.parse(data));
      }
    } catch (error) {
      console.log('Daily logs yüklenemedi:', error);
    }
  };

  const loadTodayLog = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const data = await AsyncStorage.getItem('dailyLogs');
      if (data) {
        const logs: DailyLogEntry[] = JSON.parse(data);
        const todayLog = logs.find(log => log.date === today);
        setCurrentDayLog(todayLog || null);
      }
    } catch (error) {
      console.log('Today log yüklenemedi:', error);
    }
  };

  const saveDailyLog = async (logEntry: DailyLogEntry) => {
    try {
      const existingLogs = [...dailyLogs];
      const existingIndex = existingLogs.findIndex(log => log.date === logEntry.date);
      
      if (existingIndex >= 0) {
        existingLogs[existingIndex] = logEntry;
      } else {
        existingLogs.push(logEntry);
      }
      
      existingLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      await AsyncStorage.setItem('dailyLogs', JSON.stringify(existingLogs));
      setDailyLogs(existingLogs);
      
      if (logEntry.date === new Date().toISOString().split('T')[0]) {
        setCurrentDayLog(logEntry);
      }
    } catch (error) {
      console.log('Daily log kaydedilemedi:', error);
    }
  };

  const generateDailyReport = (date: string): DailyLogEntry | null => {
    return dailyLogs.find(log => log.date === date) || null;
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const generateWeeklyReport = (weekStart: string): WeeklyReport => {
    const weekEnd = new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    
    const weekLogs = dailyLogs.filter(log => 
      log.date >= weekStart && log.date <= weekEnd
    );

    const totalStudyTime = weekLogs.reduce((sum, log) => sum + log.studyTime, 0);
    
    const subjectBreakdown: { [key: string]: { timeSpent: number; topicsCompleted: number; progress: number } } = {};
    
    subjects.forEach(subject => {
      const subjectTopics = weekLogs.flatMap(log => 
        log.completedTopics.filter(topic => topic.subjectId === subject.id)
      );
      
      subjectBreakdown[subject.id] = {
        timeSpent: subjectTopics.reduce((sum, topic) => sum + topic.timeSpent, 0),
        topicsCompleted: subjectTopics.length,
        progress: Math.round((subjectTopics.length / subject.topics.length) * 100)
      };
    });

    const achievements = [];
    if (totalStudyTime > 20 * 60) achievements.push('20+ saat çalışma');
    if (weekLogs.length >= 5) achievements.push('5+ gün düzenli çalışma');
    
    return {
      weekStart,
      weekEnd,
      totalStudyTime,
      dailyLogs: weekLogs,
      subjectBreakdown,
      achievements,
      improvements: ['Daha fazla soru çözümü', 'Video izleme süresini artır'],
      nextWeekGoals: ['Günlük 3 saat hedefi', 'Tüm derslere odaklan']
    };
  };

  const getMoodIcon = (mood: string): string => {
    switch (mood) {
      case 'excellent': return 'emoticon-excited';
      case 'good': return 'emoticon-happy';
      case 'average': return 'emoticon-neutral';
      case 'challenging': return 'emoticon-sad';
      case 'difficult': return 'emoticon-cry';
      default: return 'emoticon-neutral';
    }
  };

  const getMoodColor = (mood: string): string => {
    switch (mood) {
      case 'excellent': return colors.success;
      case 'good': return colors.primary;
      case 'average': return colors.warning;
      case 'challenging': return '#F59E0B';
      case 'difficult': return colors.danger;
      default: return colors.textMuted;
    }
  };

  const getMoodText = (mood: string): string => {
    switch (mood) {
      case 'excellent': return 'Mükemmel';
      case 'good': return 'İyi';
      case 'average': return 'Orta';
      case 'challenging': return 'Zorlandım';
      case 'difficult': return 'Çok Zor';
      default: return 'Belirtilmemiş';
    }
  };

  if (selectedReport === 'daily') {
    const dailyReport = generateDailyReport(selectedDate);
    
    if (isAddingLog) {
      return (
        <View style={styles.container}>
          <View style={styles.reportHeader}>
            <TouchableOpacity onPress={() => setIsAddingLog(false)}>
              <Icon name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.reportHeaderTitle}>Günlük Kayıt Ekle</Text>
            <TouchableOpacity 
              onPress={() => {
                const newLog: DailyLogEntry = {
                  date: selectedDate,
                  studyTime: 60, // Default 1 hour
                  completedTopics: [],
                  totalProgress: {
                    studied: 0,
                    videosWatched: 0,
                    questionsSolved: 0,
                    completed: 0,
                  },
                  notes: newLogNotes,
                  mood: newLogMood,
                  goals: {
                    planned: 5,
                    achieved: 0,
                  },
                };
                saveDailyLog(newLog);
                setIsAddingLog(false);
                setNewLogNotes('');
              }}
              style={styles.addLogButton}
            >
              <Icon name="check" size={20} color={colors.success} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.reportContent}>
            <View style={styles.dailyLogForm}>
              <Text style={styles.formTitle}>Günlük Değerlendirme</Text>
              
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Günün Değerlendirmesi</Text>
                <View style={styles.moodSelector}>
                  {(['excellent', 'good', 'average', 'challenging', 'difficult'] as const).map((mood) => (
                    <TouchableOpacity
                      key={mood}
                      onPress={() => setNewLogMood(mood)}
                      style={[
                        styles.moodOption,
                        newLogMood === mood && styles.moodOptionSelected
                      ]}
                    >
                      <Icon 
                        name={getMoodIcon(mood)} 
                        size={24} 
                        color={newLogMood === mood ? colors.backgroundLight : getMoodColor(mood)} 
                      />
                      <Text style={[
                        styles.moodOptionText,
                        newLogMood === mood && styles.moodOptionTextSelected
                      ]}>
                        {getMoodText(mood)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Notlar (İsteğe bağlı)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Bugün nasıl geçti? Notlarını buraya ekle..."
                  placeholderTextColor={colors.textMuted}
                  value={newLogNotes}
                  onChangeText={setNewLogNotes}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </ScrollView>
        </View>
      );
    }
    
    return (
      <View style={styles.container}>
        <View style={styles.reportHeader}>
          <TouchableOpacity onPress={() => setSelectedReport(null)}>
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.reportHeaderTitle}>Günlük Rapor</Text>
          <TouchableOpacity 
            onPress={() => setIsAddingLog(true)}
            style={styles.addLogButton}
          >
            <Icon name="plus" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.reportContent}>
          <View style={styles.dateSelector}>
            <TouchableOpacity 
              onPress={() => {
                const prevDay = new Date(selectedDate);
                prevDay.setDate(prevDay.getDate() - 1);
                setSelectedDate(prevDay.toISOString().split('T')[0]);
              }}
              style={styles.dateNavButton}
            >
              <Icon name="chevron-left" size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.selectedDate}>{selectedDate}</Text>
            <TouchableOpacity 
              onPress={() => {
                const nextDay = new Date(selectedDate);
                nextDay.setDate(nextDay.getDate() + 1);
                if (nextDay <= new Date()) {
                  setSelectedDate(nextDay.toISOString().split('T')[0]);
                }
              }}
              style={styles.dateNavButton}
            >
              <Icon name="chevron-right" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {dailyReport ? (
            <View style={styles.dailyReportCard}>
              <View style={styles.studyTimeSection}>
                <Icon name="clock" size={24} color={colors.primary} />
                <Text style={styles.studyTimeText}>
                  {Math.floor(dailyReport.studyTime / 60)}s {dailyReport.studyTime % 60}dk
                </Text>
              </View>

              <View style={styles.moodSection}>
                <Text style={styles.sectionTitle}>Günün Değerlendirmesi</Text>
                <View style={styles.moodIndicator}>
                  <Icon 
                    name={getMoodIcon(dailyReport.mood)} 
                    size={32} 
                    color={getMoodColor(dailyReport.mood)} 
                  />
                  <Text style={styles.moodText}>{getMoodText(dailyReport.mood)}</Text>
                </View>
              </View>

              <View style={styles.topicsSection}>
                <Text style={styles.sectionTitle}>Tamamlanan Konular ({dailyReport.completedTopics.length})</Text>
                {dailyReport.completedTopics.length > 0 ? (
                  dailyReport.completedTopics.map((topic, index) => (
                    <View key={index} style={styles.topicItem}>
                      <View style={styles.topicInfo}>
                        <Text style={styles.topicName}>{topic.topicName}</Text>
                        <Text style={styles.topicType}>{getTypeLabel(topic.type)}</Text>
                      </View>
                      <Text style={styles.topicTime}>{topic.timeSpent}dk</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noTopicsText}>Henüz konu tamamlanmamış</Text>
                )}
              </View>

              <View style={styles.progressSummary}>
                <Text style={styles.sectionTitle}>Günlük Özet</Text>
                <View style={styles.progressStats}>
                  <View style={styles.progressStat}>
                    <Icon name="book-check" size={16} color={colors.success} />
                    <Text style={styles.progressStatText}>{dailyReport.totalProgress.studied} Ders</Text>
                  </View>
                  <View style={styles.progressStat}>
                    <Icon name="video" size={16} color={colors.primary} />
                    <Text style={styles.progressStatText}>{dailyReport.totalProgress.videosWatched} Video</Text>
                  </View>
                  <View style={styles.progressStat}>
                    <Icon name="file-document-edit" size={16} color={colors.warning} />
                    <Text style={styles.progressStatText}>{dailyReport.totalProgress.questionsSolved} Soru</Text>
                  </View>
                  <View style={styles.progressStat}>
                    <Icon name="check-circle" size={16} color={colors.secondary} />
                    <Text style={styles.progressStatText}>{dailyReport.totalProgress.completed} Tamam</Text>
                  </View>
                </View>
              </View>

              {dailyReport.notes && (
                <View style={styles.notesSection}>
                  <Text style={styles.sectionTitle}>Notlar</Text>
                  <Text style={styles.notesText}>{dailyReport.notes}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noDataCard}>
              <Icon name="calendar-blank" size={48} color={colors.textMuted} />
              <Text style={styles.noDataText}>Bu gün için kayıt bulunamadı</Text>
              <TouchableOpacity 
                onPress={() => setIsAddingLog(true)}
                style={styles.addLogButtonLarge}
              >
                <Text style={styles.addLogButtonText}>Günlük Kayıt Ekle</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'studied': return 'Ders';
      case 'video': return 'Video';
      case 'questions': return 'Soru';
      case 'completed': return 'Tamam';
      default: return 'Diğer';
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSaveDailyLog = () => {
    // This will be implemented by the DailyLogForm component
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.reportsHeader}>
        <Text style={styles.reportsHeaderTitle}>İlerleme Raporları</Text>
        <Text style={styles.reportsHeaderSubtitle}>Detaylı analiz ve takip 📊</Text>
      </View>

      <View style={styles.reportTypesGrid}>
        <TouchableOpacity 
          style={[styles.reportTypeCard, {borderLeftColor: colors.success}]}
          onPress={() => setSelectedReport('daily')}
        >
          <Icon name="calendar-today" size={32} color={colors.success} />
          <Text style={styles.reportTypeTitle}>Günlük Rapor</Text>
          <Text style={styles.reportTypeDesc}>Günlük çalışma detayları</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.reportTypeCard, {borderLeftColor: colors.primary}]}
          onPress={() => setSelectedReport('weekly')}
        >
          <Icon name="calendar-week" size={32} color={colors.primary} />
          <Text style={styles.reportTypeTitle}>Haftalık Rapor</Text>
          <Text style={styles.reportTypeDesc}>Haftalık ilerleme özeti</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.reportTypeCard, {borderLeftColor: colors.warning}]}
          onPress={() => setSelectedReport('monthly')}
        >
          <Icon name="calendar-month" size={32} color={colors.warning} />
          <Text style={styles.reportTypeTitle}>Aylık Rapor</Text>
          <Text style={styles.reportTypeDesc}>Aylık performans analizi</Text>
        </TouchableOpacity>
      </View>

      {currentDayLog && (
        <View style={styles.todayPreview}>
          <Text style={styles.todayPreviewTitle}>Bugünün Özeti</Text>
          <View style={styles.todayStats}>
            <View style={styles.todayStat}>
              <Icon name="clock" size={20} color={colors.primary} />
              <Text style={styles.todayStatText}>
                {Math.floor(currentDayLog.studyTime / 60)}s {currentDayLog.studyTime % 60}dk
              </Text>
            </View>
            <View style={styles.todayStat}>
              <Icon name="check-circle" size={20} color={colors.success} />
              <Text style={styles.todayStatText}>
                {currentDayLog.completedTopics.length} konu
              </Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// Tab Navigator
const Tab = createBottomTabNavigator();

const getTabBarIcon = (routeName: string, color: string, size: number) => {
  let iconName: string;
  if (routeName === 'Ana Sayfa') iconName = 'home';
  else if (routeName === 'Dersler') iconName = 'book-open-page-variant';
  else if (routeName === 'Ajanda') iconName = 'calendar';
  else if (routeName === 'İlerleme') iconName = 'chart-line';
  else if (routeName === 'Raporlar') iconName = 'file-chart';
  else if (routeName === 'Ayarlar') iconName = 'cog';
  else iconName = 'help-circle';
  return <Icon name={iconName} size={size} color={color} />;
};

function App() {
  const [weeklySchedule, setWeeklySchedule] = useState(defaultWeeklySchedule);

  // Load custom schedule from storage
  useEffect(() => {
    loadCustomSchedule();
    // Initialize daily report notifications
    scheduleEndOfDayNotification();
    
    // Check if we should show daily report notification
    const checkDailyReport = async () => {
      const lastReportDate = await AsyncStorage.getItem('lastDailyReportDate');
      const today = new Date().toISOString().split('T')[0];
      
      if (lastReportDate !== today) {
        // Show notification for previous day's report
        setTimeout(() => {
          showDailyReportReadyNotification();
        }, 5000); // Delay 5 seconds after app launch
      }
    };
    
    checkDailyReport();
  }, []);

  const loadCustomSchedule = async () => {
    try {
      const customSchedule = await AsyncStorage.getItem('customSchedule');
      if (customSchedule) {
        setWeeklySchedule(JSON.parse(customSchedule));
      }
    } catch (error) {
      console.log('Custom schedule loading error:', error);
    }
  };

  const saveCustomSchedule = async (newSchedule: typeof defaultWeeklySchedule) => {
    try {
      await AsyncStorage.setItem('customSchedule', JSON.stringify(newSchedule));
      setWeeklySchedule(newSchedule);
    } catch (error) {
      console.log('Custom schedule saving error:', error);
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({route}) => ({
            tabBarIcon: ({ color, size }) => getTabBarIcon(route.name, color, size),
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textLight,
            tabBarStyle: styles.tabBar,
            headerShown: false,
            tabBarLabelStyle: styles.tabBarLabel,
          })}>
          <Tab.Screen name="Ana Sayfa">
            {(props) => <HomeScreen {...props} weeklySchedule={weeklySchedule} />}
          </Tab.Screen>
          <Tab.Screen name="Dersler" component={SubjectsScreen} />
          <Tab.Screen name="Ajanda">
            {(props) => <ScheduleScreen {...props} weeklySchedule={weeklySchedule} saveCustomSchedule={saveCustomSchedule} />}
          </Tab.Screen>
          <Tab.Screen name="İlerleme" component={ProgressScreen} />
          <Tab.Screen name="Raporlar" component={ReportsScreen} />
          <Tab.Screen name="Ayarlar" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 32,
    paddingBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 18,
    color: colors.textLight,
    fontWeight: '500',
  },
  todayCard: {
    backgroundColor: colors.card,
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 24,
    borderRadius: 20,
    borderLeftWidth: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  todayInfo: {
    marginLeft: 20,
    flex: 1,
  },
  todayLabel: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  todaySubject: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  todayDay: {
    fontSize: 15,
    color: colors.textLight,
    marginTop: 8,
    fontWeight: '500',
  },
  statsCard: {
    backgroundColor: colors.card,
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 28,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 28,
    textAlign: 'center',
  },
  progressCircle: {
    alignItems: 'center',
    marginBottom: 32,
    padding: 20,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  progressPercent: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -2,
  },
  progressLabel: {
    fontSize: 16,
    color: colors.textLight,
    marginTop: 8,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    padding: 16,
  },
  statItemWithBg: {
    backgroundColor: colors.cardSecondary,
    borderRadius: 16,
    marginHorizontal: 4,
    flex: 1,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 6,
    fontWeight: '600',
  },
  motivationCard: {
    backgroundColor: colors.accent,
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  motivationText: {
    fontSize: 16,
    color: colors.primary,
    marginLeft: 16,
    flex: 1,
    fontWeight: '600',
    lineHeight: 24,
  },
  subjectsGrid: {
    padding: 24,
    paddingTop: 0,
  },
  subjectCard: {
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
    borderLeftWidth: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  subjectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  miniProgressBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  miniProgressText: {
    fontSize: 13,
    fontWeight: '700',
  },
  subjectCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subjectCardTopics: {
    fontSize: 15,
    color: colors.textLight,
    fontWeight: '500',
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 32,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  subjectHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  progressBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  progressBadgeText: {
    color: colors.card,
    fontSize: 15,
    fontWeight: '700',
  },
  topicList: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 2,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tableCell: {
    fontSize: 16,
    fontWeight: '500',
  },
  topicCell: {
    flex: 1,
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 20,
    paddingRight: 8,
    flexWrap: 'wrap',
  },
  iconCell: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginHorizontal: 3,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  headerIconCell: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  headerTopicCell: {
    flex: 1,
    color: colors.backgroundLight,
    fontSize: 17,
    fontWeight: '700',
    paddingRight: 12,
  },
  headerIconLabel: {
    color: colors.backgroundLight,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.success + '15',
    borderColor: colors.success,
    borderWidth: 2,
  },
  checkboxActiveVideo: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  checkboxActiveQuestion: {
    backgroundColor: colors.warning + '15',
    borderColor: colors.warning,
    borderWidth: 2,
  },
  checkboxActiveCompleted: {
    backgroundColor: colors.secondary + '15',
    borderColor: colors.secondary,
    borderWidth: 2,
  },
  lastTableRow: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomWidth: 0,
    marginBottom: 24,
  },
  scheduleCard: {
    backgroundColor: colors.card,
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 24,
    borderRadius: 20,
    borderLeftWidth: 5,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  scheduleDay: {
    width: 100,
    paddingRight: 16,
  },
  scheduleDayText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  scheduleContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleSubject: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 16,
  },
  tipCard: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 32,
    padding: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipContent: {
    marginLeft: 16,
    flex: 1,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 15,
    color: '#92400E',
    lineHeight: 22,
    fontWeight: '500',
  },
  progressStatItem: {
    alignItems: 'center',
    flex: 1,
    padding: 16,
  },
  progressStatValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
  },
  progressStatLabel: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  subjectProgressItem: {
    marginBottom: 24,
    padding: 4,
  },
  subjectProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectProgressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectProgressName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 12,
  },
  subjectProgressPercent: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: colors.borderLight,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  subjectProgressDetails: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '500',
  },
  tabBar: {
    backgroundColor: colors.card,
    borderTopWidth: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 12,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  // Agenda customization styles
  customizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 'auto',
  },
  customizeButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  customizationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveButton: {
    backgroundColor: colors.success,
  },
  cancelButton: {
    backgroundColor: colors.danger,
  },
  controlButtonText: {
    color: colors.backgroundLight,
    fontSize: 16,
    fontWeight: '600',
  },
  editableScheduleCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 20,
    borderRadius: 20,
    borderLeftWidth: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  editableScheduleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  subjectOptions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectOption: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subjectOptionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  moveControls: {
    flexDirection: 'column',
    gap: 8,
    marginLeft: 16,
  },
  moveButton: {
    backgroundColor: colors.primary + '15',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Topic customization styles
  subjectHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editTopicsButton: {
    backgroundColor: colors.backgroundLight,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  topicCellContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  completedTopicText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
    color: colors.textMuted,
  },
  deleteTopicButton: {
    backgroundColor: colors.danger + '15',
    padding: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  addTopicRow: {
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.primary + '20',
    borderStyle: 'dashed',
  },
  addTopicInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 12,
  },
  addTopicButton: {
    backgroundColor: colors.success + '15',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.success + '30',
  },
  // Compact home screen styles
  compactHeader: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  compactHeaderTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  compactHeaderSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: '500',
  },
  homeContent: {
    paddingBottom: 20,
  },
  topSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  compactTodayCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  compactTodayInfo: {
    marginLeft: 12,
    flex: 1,
  },
  compactTodayLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginBottom: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactTodaySubject: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  compactProgressBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  compactProgressText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  compactStatsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statsRow: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  compactStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  compactStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
  },
  compactStatLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
    fontWeight: '600',
  },
  compactMotivationCard: {
    backgroundColor: colors.accent,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactMotivationText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  // Reports screen styles
  reportsHeader: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
  },
  reportsHeaderTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  reportsHeaderSubtitle: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: '500',
  },
  reportTypesGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },
  reportTypeCard: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    marginBottom: 12,
  },
  reportTypeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 16,
    flex: 1,
  },
  reportTypeDesc: {
    fontSize: 12,
    color: colors.textLight,
    marginLeft: 16,
    marginTop: 2,
    flex: 1,
  },
  todayPreview: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  todayPreviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  todayStats: {
    flexDirection: 'row',
    gap: 16,
  },
  todayStat: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  todayStatText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    backgroundColor: colors.background,
  },
  reportHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  addLogButton: {
    backgroundColor: colors.primary + '15',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  reportContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  dateSelector: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  selectedDate: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  dailyReportCard: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  studyTimeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
  },
  studyTimeText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 12,
  },
  moodSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  moodIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 12,
  },
  moodText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 12,
  },
  topicsSection: {
    marginBottom: 20,
  },
  topicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  topicName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  topicTime: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  notesSection: {
    marginBottom: 20,
  },
  notesText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
  },
  noDataCard: {
    backgroundColor: colors.card,
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  noDataText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  addLogButtonLarge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addLogButtonText: {
    color: colors.backgroundLight,
    fontSize: 16,
    fontWeight: '600',
  },
  // Daily log form styles
  dailyLogForm: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  moodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  moodOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  moodOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 6,
  },
  moodOptionTextSelected: {
    color: colors.backgroundLight,
  },
  notesInput: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    color: colors.text,
    minHeight: 80,
  },
  dateNavButton: {
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topicInfo: {
    flex: 1,
  },
  topicType: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  noTopicsText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  progressSummary: {
    marginBottom: 20,
  },
  progressStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  progressStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flex: 1,
    minWidth: '45%',
  },
  progressStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 6,
  },
  // Timer Widget Styles
  timerWidget: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  timerSettingsButton: {
    padding: 4,
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerTime: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: 'monospace',
  },
  timerSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  timerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  startButton: {
    backgroundColor: colors.success,
  },
  pauseButton: {
    backgroundColor: colors.warning,
  },
  resumeButton: {
    backgroundColor: colors.primary,
  },
  endButton: {
    backgroundColor: colors.danger,
  },
  timerButtonText: {
    color: colors.backgroundLight,
    fontSize: 14,
    fontWeight: '600',
  },
  sessionInputs: {
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
  },
  sessionInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  settingInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    minWidth: 30,
    textAlign: 'center',
  },
  adjustButton: {
    backgroundColor: colors.background,
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButton: {
    padding: 4,
  },
  modalSaveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSaveButtonText: {
    color: colors.backgroundLight,
    fontSize: 16,
    fontWeight: '600',
  },
  // Goal Summary Styles
  goalSummary: {
    marginTop: 4,
    alignItems: 'center',
  },
  goalSummaryText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  // Schedule Actions
  scheduleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goalHintText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  // Goal Input Styles
  goalInputSection: {
    gap: 16,
    marginBottom: 20,
  },
  goalInputItem: {
    marginBottom: 12,
  },
  goalInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  goalInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  goalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  goalInputValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    minWidth: 40,
    textAlign: 'center',
  },
  goalModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  goalActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelGoalButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveGoalButton: {
    backgroundColor: colors.primary,
  },
  cancelGoalButtonText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  saveGoalButtonText: {
    color: colors.backgroundLight,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;