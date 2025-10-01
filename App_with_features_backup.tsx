// App.tsx içine Ayarlar ekranını eklemek için Tab.Navigator'a şunu ekleyin:

// 1. Import ekleyin (dosyanın başına):
// import SettingsScreen from './src/screens/SettingsScreen';

// 2. Tab.Navigator içine şu satırı ekleyin (İlerleme'den sonra):
// <Tab.Screen name="Ayarlar" component={SettingsScreen} />

// 3. screenOptions içindeki tabBarIcon fonksiyonuna şunu ekleyin:
// else if (route.name === 'Ayarlar') iconName = 'cog';

// TAM GÜNCELLENM İŞ DOSYA:

import React, {useEffect, useState, useRef, createContext, useContext} from 'react';
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
  AppState,
} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';
import { scheduleEndOfDayNotification, showDailyReportReadyNotification } from './src/utils/reportNotifications';

// Theme Context
interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme types
type ThemeColors = {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  background: string;
  backgroundLight: string;
  card: string;
  cardSecondary: string;
  text: string;
  textSecondary: string;
  textLight: string;
  textMuted: string;
  border: string;
  borderLight: string;
  accent: string;
  shadow: string;
  shadowOpacity: number;
  warningBackground: string;
  warningBorder: string;
  iconWarning: string;
  iconSuccess: string;
  iconDanger: string;
};

// Light theme colors
const lightColors: ThemeColors = {
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
  shadow: '#000000',
  shadowOpacity: 0.08,
  warningBackground: '#FEF3C7',
  warningBorder: '#FDE68A',
  iconWarning: '#F59E0B',
  iconSuccess: '#10B981',
  iconDanger: '#EF4444',
};

// Dark theme colors
const darkColors: ThemeColors = {
  primary: '#818CF8',
  secondary: '#A78BFA',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  background: '#0F172A',
  backgroundLight: '#1E293B',
  card: '#1E293B',
  cardSecondary: '#334155',
  text: '#F1F5F9',
  textSecondary: '#E2E8F0',
  textLight: '#CBD5E1',
  textMuted: '#94A3B8',
  border: '#374151',
  borderLight: '#475569',
  accent: '#1E293B',
  shadow: '#000000',
  shadowOpacity: 0.25,
  warningBackground: '#374151',
  warningBorder: '#475569',
  iconWarning: '#FBBF24',
  iconSuccess: '#34D399',
  iconDanger: '#F87171',
};

// Renkler - will be dynamically set by theme
let colors: ThemeColors = lightColors;

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
  const { colors: themeColors } = useTheme();
  const themedStyles = getThemedStyles(themeColors);
  
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

  // Get today's goal for the current subject
  const getTodaySubjectGoal = React.useCallback(() => {
    if (!todaySubject || todayGoals.length === 0) return null;
    
    const subjectData = subjects.find(s => s.name === todaySubject.subject);
    if (!subjectData) return null;
    
    return todayGoals.find(goal => goal.subjectId === subjectData.id);
  }, [todaySubject, todayGoals]);

  // Create a daily goal for today's subject
  const createTodayGoal = React.useCallback(async () => {
    if (!todaySubject) return;
    
    const subjectData = subjects.find(s => s.name === todaySubject.subject);
    if (!subjectData) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const newGoal: DailyGoal = {
        id: `${subjectData.id}_${today}`,
        subjectId: subjectData.id,
        date: today,
        goals: {
          videos: 2,
          questions: 10,
          topics: 3,
          studyTime: 120, // 2 hours
        },
        progress: {
          videos: 0,
          questions: 0,
          topics: 0,
          studyTime: 0,
        },
        completed: false,
      };

      const goalsData = await AsyncStorage.getItem('dailyGoals');
      let allGoals: DailyGoal[] = goalsData ? JSON.parse(goalsData) : [];
      
      // Remove any existing goal for this subject and date
      allGoals = allGoals.filter(goal => !(goal.subjectId === subjectData.id && goal.date === today));
      
      // Add the new goal
      allGoals.push(newGoal);
      
      await AsyncStorage.setItem('dailyGoals', JSON.stringify(allGoals));
      
      // Reload today's goals
      await loadTodayGoals();
      
      Alert.alert(
        'Hedef Oluşturuldu! 🎯',
        `${todaySubject.subject} için günlük hedef belirlendi:\n• 2 Video\n• 10 Soru\n• 3 Konu\n• 2 Saat Çalışma`
      );
    } catch (error) {
      console.log('Daily goal oluşturulamadı:', error);
      Alert.alert('Hata', 'Günlük hedef oluşturulamadı.');
    }
  }, [todaySubject, loadTodayGoals]);

  useEffect(() => {
    const today = new Date().getDay();
    const dayIndex = today === 0 ? 6 : today - 1;
    setTodaySubject(weeklySchedule[dayIndex]);
    loadTimerSettings();
    loadTodayGoals();
    restoreTimerState();
  }, [weeklySchedule, loadTodayGoals]);

  // Restore timer state on app start
  const restoreTimerState = async () => {
    try {
      const savedTimerState = await AsyncStorage.getItem('currentTimerState');
      if (savedTimerState) {
        const timerState = JSON.parse(savedTimerState);
        
        if (timerState.currentSession) {
          setCurrentSession(timerState.currentSession);
          setSessionSubject(timerState.currentSession.subject);
          setSessionTopic(timerState.currentSession.topic || '');
          setTimeElapsed(timerState.timeElapsed);
          setIsTimerRunning(timerState.isRunning);
          
          console.log('Timer state restored:', timerState);
        }
      }
    } catch (error) {
      console.log('Error restoring timer state:', error);
    }
  };

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
          
          // Save timer state every 10 seconds for background functionality
          if (newTime % 10 === 0 && currentSession) {
            const timerState = {
              isRunning: true,
              timeElapsed: newTime,
              currentSession,
              startTime: Date.now() - (newTime * 1000),
            };
            
            AsyncStorage.setItem('currentTimerState', JSON.stringify(timerState))
              .catch(error => console.log('Error saving timer state:', error));
          }
          
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
  }, [isTimerRunning, timerSettings.breakReminder, timerSettings.sessionDuration, showBreakReminder, currentSession]);

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

  const startStudySession = async () => {
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

    // Save timer state for background functionality
    const timerState = {
      isRunning: true,
      timeElapsed: 0,
      currentSession: session,
      startTime: Date.now(),
    };
    
    try {
      await AsyncStorage.setItem('currentTimerState', JSON.stringify(timerState));
    } catch (error) {
      console.log('Error saving timer state:', error);
    }
  };

  const pauseSession = async () => {
    setIsTimerRunning(false);

    // Update timer state
    if (currentSession) {
      const timerState = {
        isRunning: false,
        timeElapsed,
        currentSession,
        startTime: Date.now(),
      };
      
      try {
        await AsyncStorage.setItem('currentTimerState', JSON.stringify(timerState));
      } catch (error) {
        console.log('Error saving paused timer state:', error);
      }
    }
  };

  const resumeSession = async () => {
    setIsTimerRunning(true);

    // Update timer state
    if (currentSession) {
      const timerState = {
        isRunning: true,
        timeElapsed,
        currentSession,
        startTime: Date.now(),
      };
      
      try {
        await AsyncStorage.setItem('currentTimerState', JSON.stringify(timerState));
      } catch (error) {
        console.log('Error saving resumed timer state:', error);
      }
    }
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

      // Clear timer state
      try {
        await AsyncStorage.removeItem('currentTimerState');
        await AsyncStorage.removeItem('timerBackgroundState');
        
        // Cancel any pending background notifications
        PushNotification.cancelLocalNotification('background_session_complete');
        PushNotification.cancelLocalNotification('background_break_reminder');
      } catch (error) {
        console.log('Error clearing timer state:', error);
      }
      
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
    <View style={themedStyles.container}>
      {/* Enhanced Header */}
      <View style={[styles.modernHeader, { backgroundColor: themeColors.primary }]}>
        <View style={styles.headerGradientOverlay}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.modernHeaderTitle, { color: 'white' }]}>KPSS Takip</Text>
              <Text style={[styles.modernHeaderSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
                Başarıya Giden Yol 🎯
              </Text>
            </View>
            <View style={styles.headerStats}>
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatNumber}>{stats.studiedTopics}</Text>
                <Text style={styles.headerStatLabel}>Konu</Text>
              </View>
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatNumber}>{goalProgress.percentage}%</Text>
                <Text style={styles.headerStatLabel}>Başarı</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={themedStyles.homeContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
            colors={[themeColors.primary, themeColors.secondary]}
            title="Yenileniyor..."
            titleColor={themeColors.textSecondary}
          />
        }
      >
        <View style={themedStyles.topSection}>
          {todaySubject && (
            <View style={[styles.modernTodayCard, { backgroundColor: themeColors.card }]}>
              <View style={styles.todayCardContent}>
                <View style={[styles.subjectIconContainer, { backgroundColor: todaySubject.color + '15' }]}>
                  <Icon name={todaySubject.icon} size={28} color={todaySubject.color} />
                </View>
                <View style={styles.todayCardInfo}>
                  <Text style={[styles.todayCardLabel, { color: themeColors.textLight }]}>Bugünün Dersi</Text>
                  <Text style={[styles.todayCardSubject, { color: themeColors.text }]}>{todaySubject.subject}</Text>
                  <View style={styles.progressRow}>
                    <View style={[styles.progressBar, { backgroundColor: themeColors.border }]}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            backgroundColor: todaySubject.color,
                            width: `${goalProgress.percentage}%`
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.progressText, { color: todaySubject.color }]}>
                      {goalProgress.percentage}%
                    </Text>
                  </View>
                </View>
              </View>
              <View style={[styles.achievementBadge, { backgroundColor: todaySubject.color }]}>
                <Icon name="trophy" size={16} color="white" />
                <Text style={styles.achievementText}>{goalProgress.achieved}/{goalProgress.total}</Text>
              </View>
            </View>
          )}

          {/* Daily Goal Card - Only show if there's a goal for today's subject */}
          {(() => {
            const todayGoal = getTodaySubjectGoal();
            
            // If no goal exists for today's subject, show create goal option
            if (!todayGoal && todaySubject) {
              return (
                <View style={[styles.dailyGoalCard, {borderLeftColor: themeColors.primary, backgroundColor: themeColors.card}]}>
                  <View style={themedStyles.dailyGoalHeader}>
                    <Icon name="target-account" size={24} color={themeColors.primary} />
                    <View style={themedStyles.dailyGoalInfo}>
                      <Text style={[styles.dailyGoalTitle, { color: themeColors.text }]}>Günlük Hedef Belirle</Text>
                      <Text style={[styles.dailyGoalSubtitle, { color: themeColors.textLight }]}>
                        {todaySubject.subject} için hedef oluştur
                      </Text>
                    </View>
                    <TouchableOpacity 
                      onPress={createTodayGoal}
                      style={[styles.goalCompletionBadge, {backgroundColor: themeColors.primary}]}
                    >
                      <Icon name="plus" size={16} color={themeColors.backgroundLight} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }
            
            if (!todayGoal) return null;

            const { goals, progress } = todayGoal;
            const totalGoalItems = (goals.videos > 0 ? 1 : 0) + 
                                  (goals.questions > 0 ? 1 : 0) + 
                                  (goals.topics > 0 ? 1 : 0) + 
                                  (goals.studyTime > 0 ? 1 : 0);
            
            const completedItems = (progress.videos >= goals.videos && goals.videos > 0 ? 1 : 0) +
                                  (progress.questions >= goals.questions && goals.questions > 0 ? 1 : 0) +
                                  (progress.topics >= goals.topics && goals.topics > 0 ? 1 : 0) +
                                  (progress.studyTime >= goals.studyTime && goals.studyTime > 0 ? 1 : 0);

            const completionPercentage = totalGoalItems > 0 ? Math.round((completedItems / totalGoalItems) * 100) : 0;

            return (
              <View style={[themedStyles.dailyGoalCard, {borderLeftColor: themeColors.success, backgroundColor: themeColors.card}]}>
                <View style={themedStyles.dailyGoalHeader}>
                  <Icon name="target" size={24} color={themeColors.success} />
                  <View style={themedStyles.dailyGoalInfo}>
                    <Text style={[styles.dailyGoalTitle, { color: themeColors.text }]}>Günlük Hedef</Text>
                    <Text style={[styles.dailyGoalSubtitle, { color: themeColors.textLight }]}>
                      {completedItems}/{totalGoalItems} Hedef Tamamlandı ({completionPercentage}%)
                    </Text>
                  </View>
                  <View style={[themedStyles.goalCompletionBadge, 
                    {backgroundColor: completionPercentage === 100 ? themeColors.success : themeColors.warning}]}>
                    <Icon 
                      name={completionPercentage === 100 ? "check" : "clock"} 
                      size={16} 
                      color={themeColors.backgroundLight} 
                    />
                  </View>
                </View>

                <View style={themedStyles.goalProgressList}>
                  {goals.studyTime > 0 && (
                    <View style={themedStyles.goalProgressItem}>
                      <View style={themedStyles.goalProgressIcon}>
                        <Icon name="clock" size={16} color={themeColors.primary} />
                      </View>
                      <Text style={[themedStyles.goalProgressText, { color: themeColors.text }]}>
                        {Math.floor(progress.studyTime / 60)}s {progress.studyTime % 60}dk / {Math.floor(goals.studyTime / 60)}s {goals.studyTime % 60}dk
                      </Text>
                      <Icon 
                        name={progress.studyTime >= goals.studyTime ? "check-circle" : "circle-outline"} 
                        size={20} 
                        color={progress.studyTime >= goals.studyTime ? themeColors.success : themeColors.textMuted} 
                      />
                    </View>
                  )}
                  
                  {goals.videos > 0 && (
                    <View style={themedStyles.goalProgressItem}>
                      <View style={themedStyles.goalProgressIcon}>
                        <Icon name="video" size={16} color={themeColors.secondary} />
                      </View>
                      <Text style={[themedStyles.goalProgressText, { color: themeColors.text }]}>
                        {progress.videos} / {goals.videos} Video
                      </Text>
                      <Icon 
                        name={progress.videos >= goals.videos ? "check-circle" : "circle-outline"} 
                        size={20} 
                        color={progress.videos >= goals.videos ? themeColors.success : themeColors.textMuted} 
                      />
                    </View>
                  )}
                  
                  {goals.questions > 0 && (
                    <View style={themedStyles.goalProgressItem}>
                      <View style={themedStyles.goalProgressIcon}>
                        <Icon name="file-document-edit" size={16} color={themeColors.warning} />
                      </View>
                      <Text style={[themedStyles.goalProgressText, { color: themeColors.text }]}>
                        {progress.questions} / {goals.questions} Soru
                      </Text>
                      <Icon 
                        name={progress.questions >= goals.questions ? "check-circle" : "circle-outline"} 
                        size={20} 
                        color={progress.questions >= goals.questions ? themeColors.success : themeColors.textMuted} 
                      />
                    </View>
                  )}
                  
                  {goals.topics > 0 && (
                    <View style={themedStyles.goalProgressItem}>
                      <View style={themedStyles.goalProgressIcon}>
                        <Icon name="book-check" size={16} color={themeColors.danger} />
                      </View>
                      <Text style={[themedStyles.goalProgressText, { color: themeColors.text }]}>
                        {progress.topics} / {goals.topics} Konu
                      </Text>
                      <Icon 
                        name={progress.topics >= goals.topics ? "check-circle" : "circle-outline"} 
                        size={20} 
                        color={progress.topics >= goals.topics ? themeColors.success : themeColors.textMuted} 
                      />
                    </View>
                  )}
                </View>

                {completionPercentage === 100 && (
                  <View style={[themedStyles.goalCompletedBanner, { backgroundColor: themeColors.success + '15' }]}>
                    <Icon name="party-popper" size={20} color={themeColors.success} />
                    <Text style={[themedStyles.goalCompletedText, { color: themeColors.success }]}>
                      Tebrikler! Günlük hedeflerin tamamlandı! 🎉
                    </Text>
                  </View>
                )}
              </View>
            );
          })()}

          {/* Study Timer Widget */}
          <View style={[themedStyles.timerWidget, { backgroundColor: themeColors.card }]}>
            <View style={themedStyles.timerHeader}>
              <Icon name="timer" size={20} color={themeColors.primary} />
              <Text style={[themedStyles.timerTitle, { color: themeColors.text }]}>Çalışma Zamanlayıcısı</Text>
              <TouchableOpacity 
                onPress={() => setShowTimerSettings(true)}
                style={themedStyles.timerSettingsButton}
              >
                <Icon name="cog" size={16} color={themeColors.textMuted} />
              </TouchableOpacity>
            </View>
            
            <View style={themedStyles.timerDisplay}>
              <Text style={[themedStyles.timerTime, { color: themeColors.primary }]}>{formatTime(timeElapsed)}</Text>
              <Text style={[themedStyles.timerSubtext, { color: themeColors.textLight }]}>
                {currentSession ? 
                  `${currentSession.subject || 'Genel Çalışma'}${currentSession.topic ? ` - ${currentSession.topic}` : ''}` : 
                  'Hedef: ' + timerSettings.sessionDuration + ' dk'
                }
              </Text>
            </View>

            <View style={themedStyles.timerControls}>
              {!isTimerRunning && !currentSession ? (
                <TouchableOpacity 
                  onPress={startStudySession}
                  style={[styles.timerButton, styles.startButton]}
                >
                  <Icon name="play" size={16} color={colors.backgroundLight} />
                  <Text style={themedStyles.timerButtonText}>Başla</Text>
                </TouchableOpacity>
              ) : isTimerRunning ? (
                <TouchableOpacity 
                  onPress={pauseSession}
                  style={[styles.timerButton, styles.pauseButton]}
                >
                  <Icon name="pause" size={16} color={colors.backgroundLight} />
                  <Text style={themedStyles.timerButtonText}>Duraklat</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={resumeSession}
                  style={[styles.timerButton, styles.resumeButton]}
                >
                  <Icon name="play" size={16} color={colors.backgroundLight} />
                  <Text style={themedStyles.timerButtonText}>Devam Et</Text>
                </TouchableOpacity>
              )}
              
              {currentSession && (
                <TouchableOpacity 
                  onPress={endSession}
                  style={[styles.timerButton, styles.endButton]}
                >
                  <Icon name="stop" size={16} color={colors.backgroundLight} />
                  <Text style={themedStyles.timerButtonText}>Bitir</Text>
                </TouchableOpacity>
              )}
            </View>

            {currentSession && (
              <View style={themedStyles.sessionInputs}>
                <View style={themedStyles.inputRow}>
                  <TextInput
                    style={themedStyles.sessionInput}
                    placeholder="Ders (opsiyonel)"
                    value={sessionSubject}
                    onChangeText={setSessionSubject}
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={themedStyles.inputRow}>
                  <TextInput
                    style={themedStyles.sessionInput}
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

        <View style={[styles.modernStatsSection, { backgroundColor: themeColors.background }]}>
          <Text style={[styles.homeSectionTitle, { color: themeColors.text }]}>Günlük İstatistikler</Text>
          <View style={styles.modernStatsGrid}>
            <View style={[styles.modernStatCard, { backgroundColor: themeColors.card }]}>
              <View style={[styles.statIconBg, { backgroundColor: '#10b981' + '15' }]}>
                <Icon name="book-check" size={24} color="#10b981" />
              </View>
              <Text style={[styles.modernStatValue, { color: themeColors.text }]}>{stats.studiedTopics}</Text>
              <Text style={[styles.modernStatLabel, { color: themeColors.textLight }]}>Konu Tamamlandı</Text>
            </View>
            <View style={[styles.modernStatCard, { backgroundColor: themeColors.card }]}>
              <View style={[styles.statIconBg, { backgroundColor: themeColors.primary + '15' }]}>
                <Icon name="video" size={24} color={themeColors.primary} />
              </View>
              <Text style={[styles.modernStatValue, { color: themeColors.text }]}>{stats.videosWatched}</Text>
              <Text style={[styles.modernStatLabel, { color: themeColors.textLight }]}>Video İzlendi</Text>
            </View>
            <View style={[styles.modernStatCard, { backgroundColor: themeColors.card }]}>
              <View style={[styles.statIconBg, { backgroundColor: '#f59e0b' + '15' }]}>
                <Icon name="checkbox-marked-circle" size={24} color="#f59e0b" />
              </View>
              <Text style={[styles.modernStatValue, { color: themeColors.text }]}>{stats.questionsSolved}</Text>
              <Text style={[styles.modernStatLabel, { color: themeColors.textLight }]}>Soru Çözüldü</Text>
            </View>
          </View>
        </View>

        <View style={styles.compactMotivationCard}>
          <Icon name="fire" size={20} color={colors.iconWarning} />
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
  const { colors: themeColors } = useTheme();
  const themedStyles = getThemedStyles(themeColors);
  
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
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.subjectHeader, { backgroundColor: themeColors.card }]}>
          <TouchableOpacity onPress={() => setSelectedSubject(null)}>
            <Icon name="arrow-left" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.subjectHeaderTitle, { color: themeColors.text }]}>{selectedSubject.name}</Text>
          <View style={styles.subjectHeaderActions}>
            <TouchableOpacity 
              onPress={() => setIsEditingTopics(!isEditingTopics)}
              style={styles.editTopicsButton}
            >
              <Icon 
                name={isEditingTopics ? "check" : "pencil"} 
                size={20} 
                color={isEditingTopics ? themeColors.success : themeColors.primary} 
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
    <ScrollView style={themedStyles.container}>
      <View style={themedStyles.header}>
        <Text style={themedStyles.headerTitle}>Dersler</Text>
        <Text style={themedStyles.headerSubtitle}>Konu takibini yap 📚</Text>
      </View>
      <View style={styles.subjectsGrid}>
        {subjects.map(subject => {
          const progressPercent = getSubjectProgress(subject.id);
          return (
            <TouchableOpacity
              key={subject.id}
              style={[themedStyles.card, {borderLeftColor: subject.color}]}
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
  const { colors: themeColors } = useTheme();
  const themedStyles = getThemedStyles(themeColors);
  
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
  const { colors: themeColors } = useTheme();
  const themedStyles = getThemedStyles(themeColors);
  
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
      style={[themedStyles.container, { backgroundColor: themeColors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={themeColors.primary}
          colors={[themeColors.primary, themeColors.secondary]}
          title="Yenileniyor..."
          titleColor={themeColors.textSecondary}
        />
      }
    >
      <View style={[themedStyles.header, { backgroundColor: themeColors.background }]}>
        <Text style={[themedStyles.headerTitle, { color: themeColors.text }]}>İlerleme</Text>
        <Text style={[themedStyles.headerSubtitle, { color: themeColors.textLight }]}>Performansını gör 📈</Text>
      </View>

      <View style={[themedStyles.statsCard, { backgroundColor: themeColors.card }]}>
        <Text style={[themedStyles.statsTitle, { color: themeColors.text }]}>Genel Durum</Text>
        <View style={themedStyles.statsGrid}>
          <View style={[themedStyles.progressStatItem, themedStyles.statItemWithBg, { backgroundColor: themeColors.cardSecondary }]}>
            <View style={[themedStyles.statIconContainer, {backgroundColor: `${themeColors.success}15`}]}>
              <Icon name="book-check" size={36} color={themeColors.success} />
            </View>
            <Text style={[themedStyles.progressStatValue, { color: themeColors.text }]}>{stats.completedTopics}</Text>
            <Text style={[themedStyles.progressStatLabel, { color: themeColors.textLight }]}>Tamamlanan</Text>
          </View>
          <View style={[themedStyles.progressStatItem, themedStyles.statItemWithBg, { backgroundColor: themeColors.cardSecondary }]}>
            <View style={[themedStyles.statIconContainer, {backgroundColor: `${themeColors.primary}15`}]}>
              <Icon name="book-open" size={36} color={themeColors.primary} />
            </View>
            <Text style={[themedStyles.progressStatValue, { color: themeColors.text }]}>{stats.studiedTopics}</Text>
            <Text style={[themedStyles.progressStatLabel, { color: themeColors.textLight }]}>Çalışılan</Text>
          </View>
        </View>
        <View style={themedStyles.statsGrid}>
          <View style={[themedStyles.progressStatItem, themedStyles.statItemWithBg, { backgroundColor: themeColors.cardSecondary }]}>
            <View style={[themedStyles.statIconContainer, {backgroundColor: `${themeColors.secondary}15`}]}>
              <Icon name="video" size={36} color={themeColors.secondary} />
            </View>
            <Text style={[themedStyles.progressStatValue, { color: themeColors.text }]}>{stats.videosWatched}</Text>
            <Text style={[themedStyles.progressStatLabel, { color: themeColors.textLight }]}>Video</Text>
          </View>
          <View style={[themedStyles.progressStatItem, themedStyles.statItemWithBg, { backgroundColor: themeColors.cardSecondary }]}>
            <View style={[themedStyles.statIconContainer, {backgroundColor: `${themeColors.warning}15`}]}>
              <Icon name="file-document-edit" size={36} color={themeColors.warning} />
            </View>
            <Text style={[themedStyles.progressStatValue, { color: themeColors.text }]}>{stats.questionsSolved}</Text>
            <Text style={[themedStyles.progressStatLabel, { color: themeColors.textLight }]}>Soru</Text>
          </View>
        </View>
      </View>

      <View style={[themedStyles.statsCard, { backgroundColor: themeColors.card }]}>
        <Text style={[themedStyles.statsTitle, { color: themeColors.text }]}>Ders Bazlı İlerleme</Text>
        {subjectStats.map((subject, index) => (
          <View key={index} style={themedStyles.subjectProgressItem}>
            <View style={themedStyles.subjectProgressHeader}>
              <View style={themedStyles.subjectProgressInfo}>
                <Icon name={subject.icon} size={20} color={subject.color} />
                <Text style={[themedStyles.subjectProgressName, { color: themeColors.text }]}>{subject.name}</Text>
              </View>
              <Text style={[themedStyles.subjectProgressPercent, { color: themeColors.primary }]}>{subject.percent}%</Text>
            </View>
            <View style={[themedStyles.progressBarContainer, { backgroundColor: themeColors.borderLight }]}>
              <View 
                style={[
                  themedStyles.progressBarFill, 
                  {width: `${subject.percent}%`, backgroundColor: subject.color}
                ]} 
              />
            </View>
            <Text style={[themedStyles.progressLabel, { color: themeColors.textLight }]}>
              {subject.completed}/{subject.total} konu tamamlandı
            </Text>
          </View>
        ))}
      </View>

      <View style={[themedStyles.motivationCard, { backgroundColor: themeColors.accent, borderColor: themeColors.borderLight }]}>
        <Icon name="trophy" size={28} color={themeColors.warning} />
        <Text style={[themedStyles.motivationText, { color: themeColors.primary }]}>
          Harika gidiyorsun! Devam et! 🌟
        </Text>
      </View>
    </ScrollView>
  );
}

// Reports Screen
function ReportsScreen() {
  const { colors: themeColors } = useTheme();
  const themedStyles = getThemedStyles(themeColors);
  
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
      <View style={[themedStyles.container, { backgroundColor: themeColors.background }]}>
        <View style={[themedStyles.header, { backgroundColor: themeColors.background }]}>
          <TouchableOpacity onPress={() => setSelectedReport(null)}>
            <Icon name="arrow-left" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[themedStyles.headerTitle, { color: themeColors.text }]}>Günlük Rapor</Text>
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSaveDailyLog = () => {
    // This will be implemented by the DailyLogForm component
  };

  return (
    <ScrollView style={[themedStyles.container, { backgroundColor: themeColors.background }]}>
      <View style={[themedStyles.header, { backgroundColor: themeColors.background }]}>
        <Text style={[themedStyles.headerTitle, { color: themeColors.text }]}>İlerleme Raporları</Text>
        <Text style={[themedStyles.headerSubtitle, { color: themeColors.textLight }]}>Detaylı analiz ve takip 📊</Text>
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

// Theme Provider Component
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const loadThemePreference = React.useCallback(async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themePreference');
      if (savedTheme) {
        const preferDark = savedTheme === 'dark';
        setIsDarkMode(preferDark);
        colors = preferDark ? darkColors : lightColors;
      } else {
        // Default to light mode
        setIsDarkMode(false);
        colors = lightColors;
      }
    } catch (error) {
      console.log('Theme yüklenemedi:', error);
    }
  }, []);

  useEffect(() => {
    loadThemePreference();
  }, [loadThemePreference]);

  const toggleTheme = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    colors = newTheme ? darkColors : lightColors;
    
    try {
      await AsyncStorage.setItem('themePreference', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.log('Theme kaydedilemedi:', error);
    }
  };

  const themeValue = {
    isDarkMode,
    toggleTheme,
    colors: isDarkMode ? darkColors : lightColors,
  };

  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
}

function App() {
  const { isDarkMode, colors: themeColors } = useTheme();
  
  const [weeklySchedule, setWeeklySchedule] = useState(defaultWeeklySchedule);
  
  // Background timer state management
  const appStateRef = useRef(AppState.currentState);

  // Schedule notifications for background timer
  const scheduleBackgroundTimerNotifications = React.useCallback(async (timerState: any) => {
    if (!timerState.currentSession) return;
    
    try {
      const settings = await loadNotificationSettings();
      if (!settings.studyReminders.enabled) return;

      // Calculate remaining time for current session
      const remainingTime = (timerState.currentSession.duration * 60) - timerState.timeElapsed;
      
      if (remainingTime > 60) { // Only schedule if more than 1 minute remaining
        // Schedule session completion notification
        const completionTime = new Date(Date.now() + remainingTime * 1000);
        
        PushNotification.localNotificationSchedule({
          channelId: 'kpss-channel',
          id: 'background_session_complete',
          title: '✅ Çalışma Seansı Tamamlandı!',
          message: `${timerState.currentSession.subject} çalışman bitti! Uygulamayı açarak ilerlemeni kaydet.`,
          date: completionTime,
          playSound: settings.studyReminders.sound,
          vibrate: settings.studyReminders.vibration,
        });

        console.log(`Background notification scheduled for ${remainingTime} seconds`);
      }

      // Schedule break reminders if enabled
      if (settings.breakReminders.enabled && remainingTime > 300) { // More than 5 minutes
        const breakInterval = settings.breakReminders.interval * 60; // Convert to seconds
        const nextBreakTime = breakInterval - (timerState.timeElapsed % breakInterval);
        
        if (nextBreakTime > 60 && nextBreakTime < remainingTime) {
          const breakNotificationTime = new Date(Date.now() + nextBreakTime * 1000);
          
          PushNotification.localNotificationSchedule({
            channelId: 'kpss-channel',
            id: 'background_break_reminder',
            title: '⏰ Mola Zamanı!',
            message: `${settings.breakReminders.interval} dakika çalıştın. 5 dakika mola ver!`,
            date: breakNotificationTime,
            playSound: settings.studyReminders.sound,
            vibrate: settings.studyReminders.vibration,
          });

          console.log(`Background break notification scheduled for ${nextBreakTime} seconds`);
        }
      }
    } catch (error) {
      console.log('Error scheduling background notifications:', error);
    }
  }, []);

  // Handle when app goes to background
  const handleAppGoingToBackground = React.useCallback(async () => {
    try {
      // Get current timer state from HomeScreen
      const timerState = await AsyncStorage.getItem('currentTimerState');
      if (timerState) {
        const currentTimer = JSON.parse(timerState);
        
        if (currentTimer.isRunning && currentTimer.currentSession) {
          // Save background timestamp
          const backgroundState = {
            ...currentTimer,
            backgroundTime: Date.now(),
          };
          await AsyncStorage.setItem('timerBackgroundState', JSON.stringify(backgroundState));
          
          // Schedule background notifications
          await scheduleBackgroundTimerNotifications(currentTimer);
        }
      }
    } catch (error) {
      console.log('Error handling app going to background:', error);
    }
  }, [scheduleBackgroundTimerNotifications]);

  // Handle when app comes to foreground
  const handleAppComingToForeground = React.useCallback(async () => {
    try {
      const backgroundState = await AsyncStorage.getItem('timerBackgroundState');
      if (backgroundState) {
        const timerState = JSON.parse(backgroundState);
        
        if (timerState.isRunning) {
          // Calculate time elapsed while in background
          const backgroundDuration = Math.floor((Date.now() - timerState.backgroundTime) / 1000);
          const updatedTimeElapsed = timerState.timeElapsed + backgroundDuration;
          
          // Update timer state
          const updatedTimerState = {
            ...timerState,
            timeElapsed: updatedTimeElapsed,
          };
          
          await AsyncStorage.setItem('currentTimerState', JSON.stringify(updatedTimerState));
          
          // Cancel any pending background notifications
          PushNotification.cancelLocalNotification('background_session_complete');
          PushNotification.cancelLocalNotification('background_break_reminder');
        }
        
        // Clear background state
        await AsyncStorage.removeItem('timerBackgroundState');
      }
    } catch (error) {
      console.log('Error restoring from background:', error);
    }
  }, []);

  // Handle app state changes for background timer
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const currentState = appStateRef.current;
      appStateRef.current = nextAppState;
      
      if (currentState.match(/inactive|background/) && nextAppState === 'active') {
        handleAppComingToForeground();
      } else if (nextAppState.match(/inactive|background/)) {
        handleAppGoingToBackground();
      }
    });

    return () => subscription?.remove();
  }, [handleAppComingToForeground, handleAppGoingToBackground]);

  // Load custom schedule from storage
  useEffect(() => {
    loadCustomSchedule();
    // Initialize daily report notifications
    scheduleEndOfDayNotification();
    
    // Initialize custom notification system
    const initializeNotifications = async () => {
      try {
        await configureNotifications();
        await scheduleCustomNotifications();
        console.log('Custom notification system initialized');
      } catch (error) {
        console.log('Failed to initialize custom notifications:', error);
      }
    };
    
    initializeNotifications();
    
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
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={themeColors.background} 
      />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({route}) => ({
            tabBarIcon: ({ color, size }) => getTabBarIcon(route.name, color, size),
            tabBarActiveTintColor: themeColors.primary,
            tabBarInactiveTintColor: themeColors.textLight,
            tabBarStyle: [styles.tabBar, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }],
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
          <Tab.Screen name="Ayarlar" component={SettingsScreenWithTheme} />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

// Settings Screen with Theme Toggle
function SettingsScreenWithTheme() {
  const { isDarkMode, toggleTheme, colors: themeColors } = useTheme();
  const [customReminders, setCustomReminders] = React.useState<CustomReminder[]>([]);
  const [showRemindersModal, setShowRemindersModal] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [reminderStats, setReminderStats] = React.useState<any>(null);
  const [smartSuggestions, setSmartSuggestions] = React.useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  React.useEffect(() => {
    loadRemindersData();
  }, []);

  const loadRemindersData = async () => {
    try {
      const reminders = await loadCustomReminders();
      setCustomReminders(reminders);
      
      // Load stats
      const stats = await getReminderStats();
      setReminderStats(stats);
      
      // Load smart suggestions
      const suggestions = await getSmartSuggestions();
      setSmartSuggestions(suggestions);
    } catch (error) {
      console.error('Error loading reminders data:', error);
    }
  };

  const handleQuickStudyReminder = async () => {
    Alert.prompt(
      'Hızlı Çalışma Hatırlatıcısı',
      'Hangi ders için hatırlatıcı oluşturmak istiyorsunuz?',
      async (subject) => {
        if (subject && subject.trim()) {
          try {
            await createQuickStudyReminder(subject.trim(), '09:00');
            await scheduleAllCustomReminders();
            loadRemindersData();
            Alert.alert('✅ Başarılı', `${subject} için çalışma hatırlatıcısı oluşturuldu!`);
          } catch (error) {
            Alert.alert('❌ Hata', 'Hatırlatıcı oluşturulamadı.');
          }
        }
      }
    );
  };

  const handleQuickBreakReminder = async () => {
    try {
      await createQuickBreakReminder(25);
      await scheduleAllCustomReminders();
      loadRemindersData();
      Alert.alert('✅ Başarılı', '25 dakika sonra mola hatırlatıcısı oluşturuldu!');
    } catch (error) {
      Alert.alert('❌ Hata', 'Mola hatırlatıcısı oluşturulamadı.');
    }
  };

  const handleQuickGoalReminder = async () => {
    Alert.prompt(
      'Hızlı Hedef Hatırlatıcısı',
      'Hangi hedef için hatırlatıcı oluşturmak istiyorsunuz?',
      async (goalText) => {
        if (goalText && goalText.trim()) {
          try {
            await createQuickGoalReminder(goalText.trim(), '19:00');
            await scheduleAllCustomReminders();
            loadRemindersData();
            Alert.alert('✅ Başarılı', 'Hedef hatırlatıcısı oluşturuldu!');
          } catch (error) {
            Alert.alert('❌ Hata', 'Hatırlatıcı oluşturulamadı.');
          }
        }
      }
    );
  };

  const toggleReminder = async (reminder: CustomReminder) => {
    try {
      await updateCustomReminder(reminder.id, { enabled: !reminder.enabled });
      await scheduleAllCustomReminders();
      loadRemindersData();
    } catch (error) {
      Alert.alert('❌ Hata', 'Hatırlatıcı güncellenemedi.');
    }
  };

  const deleteReminder = async (reminder: CustomReminder) => {
    Alert.alert(
      '🗑️ Hatırlatıcıyı Sil',
      `"${reminder.title}" hatırlatıcısını silmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomReminder(reminder.id);
              await scheduleAllCustomReminders();
              loadRemindersData();
              Alert.alert('✅ Başarılı', 'Hatırlatıcı silindi.');
            } catch (error) {
              Alert.alert('❌ Hata', 'Hatırlatıcı silinemedi.');
            }
          },
        },
      ]
    );
  };

  const addTemplateReminder = async (template: typeof reminderTemplates[0]) => {
    try {
      await createCustomReminder(template);
      await scheduleAllCustomReminders();
      loadRemindersData();
      Alert.alert('✅ Başarılı', 'Şablon hatırlatıcı eklendi!');
    } catch (error) {
      Alert.alert('❌ Hata', 'Şablon eklenemedi.');
    }
  };

  const handleDuplicateReminder = async (reminder: CustomReminder) => {
    try {
      const success = await duplicateReminder(reminder.id);
      if (success) {
        await scheduleAllCustomReminders();
        loadRemindersData();
        Alert.alert('✅ Başarılı', 'Hatırlatıcı kopyalandı!');
      } else {
        Alert.alert('❌ Hata', 'Hatırlatıcı kopyalanamadı.');
      }
    } catch (error) {
      Alert.alert('❌ Hata', 'Bir hata oluştu.');
    }
  };

  const handleEditReminder = (reminder: CustomReminder) => {
    Alert.prompt(
      '✏️ Hatırlatıcıyı Düzenle',
      'Yeni başlık girin:',
      async (newTitle) => {
        if (newTitle && newTitle.trim()) {
          try {
            await editCustomReminder(reminder.id, { title: newTitle.trim() });
            await scheduleAllCustomReminders();
            loadRemindersData();
            Alert.alert('✅ Başarılı', 'Hatırlatıcı güncellendi!');
          } catch (error) {
            Alert.alert('❌ Hata', 'Hatırlatıcı güncellenemedi.');
          }
        }
      },
      'plain-text',
      reminder.title
    );
  };

  const handleCategoryFilter = async (category: string) => {
    setSelectedCategory(category);
    if (category === 'all') {
      loadRemindersData();
    } else {
      try {
        const filteredReminders = await getRemindersByCategory(category);
        setCustomReminders(filteredReminders);
      } catch (error) {
        console.error('Error filtering reminders:', error);
      }
    }
  };

  const handleAddSuggestion = async (suggestion: any) => {
    try {
      await createCustomReminder(suggestion);
      await scheduleAllCustomReminders();
      loadRemindersData();
      Alert.alert('✅ Başarılı', 'Önerilen hatırlatıcı eklendi!');
    } catch (error) {
      Alert.alert('❌ Hata', 'Hatırlatıcı eklenemedi.');
    }
  };
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.reportsHeader}>
        <Text style={[styles.reportsHeaderTitle, { color: themeColors.text }]}>Ayarlar</Text>
        <Text style={[styles.reportsHeaderSubtitle, { color: themeColors.textLight }]}>Uygulamayı özelleştir ⚙️</Text>
      </View>

      <View style={styles.reportTypesGrid}>
        <TouchableOpacity 
          style={[styles.reportTypeCard, {borderLeftColor: themeColors.primary, backgroundColor: themeColors.card}]}
          onPress={toggleTheme}
        >
          <Icon name={isDarkMode ? "weather-night" : "weather-sunny"} size={32} color={themeColors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.reportTypeTitle, { color: themeColors.text }]}>
              {isDarkMode ? 'Koyu Tema' : 'Açık Tema'}
            </Text>
            <Text style={[styles.reportTypeDesc, { color: themeColors.textLight }]}>
              {isDarkMode ? 'Açık temaya geç' : 'Koyu temaya geç'}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={themeColors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.reportTypeCard, {borderLeftColor: themeColors.warning, backgroundColor: themeColors.card}]}
          onPress={async () => {
            try {
              const success = await sendTestNotification();
              if (success) {
                Alert.alert('🔔 Test Bildirimi', 'Test bildirimi gönderildi!');
              } else {
                Alert.alert('❌ Hata', 'Test bildirimi gönderilemedi. Bildirim izinlerini kontrol edin.');
              }
            } catch (error) {
              Alert.alert('❌ Hata', 'Bildirim sistemi hatası.');
            }
          }}
        >
          <Icon name="bell" size={32} color={themeColors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.reportTypeTitle, { color: themeColors.text }]}>Bildirimleri Test Et</Text>
            <Text style={[styles.reportTypeDesc, { color: themeColors.textLight }]}>Test bildirimi gönder</Text>
          </View>
          <Icon name="chevron-right" size={24} color={themeColors.textLight} />
        </TouchableOpacity>

        {/* Custom Reminders Section */}
        <TouchableOpacity 
          style={[styles.reportTypeCard, {borderLeftColor: themeColors.secondary, backgroundColor: themeColors.card}]}
          onPress={() => setShowRemindersModal(true)}
        >
          <Icon name="bell-ring" size={32} color={themeColors.secondary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.reportTypeTitle, { color: themeColors.text }]}>Özel Hatırlatıcılar</Text>
            <Text style={[styles.reportTypeDesc, { color: themeColors.textLight }]}>
              {customReminders.length} hatırlatıcı • Kişiselleştir
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={themeColors.textLight} />
        </TouchableOpacity>

        {/* Quick Reminder Actions */}
        <View style={[styles.reminderQuickActions, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.quickActionsTitle, { color: themeColors.text }]}>Hızlı Hatırlatıcılar</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: themeColors.primary + '20' }]}
              onPress={handleQuickStudyReminder}
            >
              <Icon name="book" size={20} color={themeColors.primary} />
              <Text style={[styles.quickActionText, { color: themeColors.primary }]}>Çalışma</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: themeColors.warning + '20' }]}
              onPress={handleQuickBreakReminder}
            >
              <Icon name="coffee" size={20} color={themeColors.warning} />
              <Text style={[styles.quickActionText, { color: themeColors.warning }]}>Mola</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: themeColors.success + '20' }]}
              onPress={handleQuickGoalReminder}
            >
              <Icon name="target" size={20} color={themeColors.success} />
              <Text style={[styles.quickActionText, { color: themeColors.success }]}>Hedef</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.reportTypeCard, {borderLeftColor: themeColors.danger, backgroundColor: themeColors.card}]}
          onPress={() => {
            Alert.alert(
              'İlerleme Sıfırlama',
              'Tüm ilerlemeniz silinecek. Emin misiniz?',
              [
                { text: 'İptal', style: 'cancel' },
                {
                  text: 'Sıfırla',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await AsyncStorage.removeItem('progress');
                      await AsyncStorage.removeItem('dailyLogs');
                      await AsyncStorage.removeItem('customSchedule');
                      Alert.alert('Başarılı', 'Tüm veriler sıfırlandı.');
                    } catch (error) {
                      Alert.alert('Hata', 'Veriler sıfırlanamadı.');
                    }
                  },
                },
              ]
            );
          }}
        >
          <Icon name="refresh" size={32} color={themeColors.danger} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.reportTypeTitle, { color: themeColors.text }]}>İlerlemeyi Sıfırla</Text>
            <Text style={[styles.reportTypeDesc, { color: themeColors.textLight }]}>Tüm verileri temizle</Text>
          </View>
          <Icon name="chevron-right" size={24} color={themeColors.textLight} />
        </TouchableOpacity>
      </View>

      <View style={[styles.todayPreview, { backgroundColor: themeColors.card }]}>
        <Text style={[styles.todayPreviewTitle, { color: themeColors.text }]}>Hakkında</Text>
        <View style={{ alignItems: 'center', marginTop: 16 }}>
          <Icon name="heart" size={32} color={themeColors.danger} />
          <Text style={[styles.reportTypeDesc, { textAlign: 'center', marginTop: 12, color: themeColors.textLight }]}>
            KPSS Takip v1.0.0{'\n'}
            KPSS'de başarılar dileriz! 🎯
          </Text>
        </View>
      </View>

      {/* Custom Reminders Modal */}
      <Modal
        visible={showRemindersModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <TouchableOpacity onPress={() => setShowRemindersModal(false)}>
              <Text style={[styles.modalCancel, { color: themeColors.primary }]}>Kapat</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Özel Hatırlatıcılar</Text>
            <TouchableOpacity onPress={loadRemindersData}>
              <Icon name="refresh" size={20} color={themeColors.primary} />
            </TouchableOpacity>
          </View>

          {/* Stats Overview */}
          {reminderStats && (
            <View style={[styles.statsContainer, { backgroundColor: themeColors.card }]}>
              <View style={styles.reminderStatItem}>
                <Text style={[styles.statNumber, { color: themeColors.primary }]}>{reminderStats.total}</Text>
                <Text style={[styles.reminderStatLabel, { color: themeColors.textLight }]}>Toplam</Text>
              </View>
              <View style={styles.reminderStatItem}>
                <Text style={[styles.statNumber, { color: getCategoryColor('study') }]}>{reminderStats.active}</Text>
                <Text style={[styles.reminderStatLabel, { color: themeColors.textLight }]}>Aktif</Text>
              </View>
              <View style={styles.reminderStatItem}>
                <Text style={[styles.statNumber, { color: getCategoryColor('goal') }]}>{Object.keys(reminderStats.categories).length}</Text>
                <Text style={[styles.reminderStatLabel, { color: themeColors.textLight }]}>Kategori</Text>
              </View>
            </View>
          )}

          {/* Category Filter */}
          <View style={[styles.categoryFilter, { backgroundColor: themeColors.card }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['all', 'study', 'break', 'goal', 'motivation'].map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    {
                      backgroundColor: selectedCategory === category ? themeColors.primary : themeColors.cardSecondary,
                    }
                  ]}
                  onPress={() => handleCategoryFilter(category)}
                >
                  <Icon 
                    name={category === 'all' ? 'view-grid' : getCategoryIcon(category)} 
                    size={16} 
                    color={selectedCategory === category ? 'white' : themeColors.text} 
                  />
                  <Text style={[
                    styles.categoryButtonText,
                    { color: selectedCategory === category ? 'white' : themeColors.text }
                  ]}>
                    {category === 'all' ? 'Tümü' : 
                     category === 'study' ? 'Çalışma' :
                     category === 'break' ? 'Mola' :
                     category === 'goal' ? 'Hedef' : 'Motivasyon'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView style={styles.remindersList}>
            {/* Smart Suggestions */}
            {smartSuggestions.length > 0 && (
              <View style={[styles.reminderQuickActions, { backgroundColor: themeColors.card }]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.quickActionsTitle, { color: themeColors.text }]}>🤖 Akıllı Öneriler</Text>
                  <TouchableOpacity onPress={() => setShowSuggestions(!showSuggestions)}>
                    <Icon name={showSuggestions ? "chevron-up" : "chevron-down"} size={20} color={themeColors.primary} />
                  </TouchableOpacity>
                </View>
                {showSuggestions && smartSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.suggestionItem, { backgroundColor: themeColors.cardSecondary }]}
                    onPress={() => handleAddSuggestion(suggestion)}
                  >
                    <View style={[styles.suggestionIcon, { backgroundColor: suggestion.color + '20' }]}>
                      <Icon name={suggestion.icon} size={20} color={suggestion.color} />
                    </View>
                    <View style={styles.templateInfo}>
                      <Text style={[styles.templateTitle, { color: themeColors.text }]}>{suggestion.title}</Text>
                      <Text style={[styles.templateDesc, { color: themeColors.textLight }]}>
                        {formatTime(suggestion.time)} • {formatDays(suggestion.days, suggestion.repeatType)}
                      </Text>
                    </View>
                    <Icon name="plus-circle" size={20} color={getCategoryColor('study')} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Template Gallery */}
            <View style={[styles.reminderQuickActions, { backgroundColor: themeColors.card }]}>
              <Text style={[styles.quickActionsTitle, { color: themeColors.text }]}>📋 Hazır Şablonlar</Text>
              {reminderTemplates.slice(0, 4).map((template, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.templateItem, { backgroundColor: themeColors.cardSecondary }]}
                  onPress={() => addTemplateReminder(template)}
                >
                  <View style={[styles.templateIcon, { backgroundColor: getCategoryColor(template.category) + '20' }]}>
                    <Icon name={template.icon} size={20} color={getCategoryColor(template.category)} />
                  </View>
                  <View style={styles.templateInfo}>
                    <Text style={[styles.templateTitle, { color: themeColors.text }]}>{template.title}</Text>
                    <Text style={[styles.templateDesc, { color: themeColors.textLight }]}>
                      {formatTime(template.time)} • {formatDays(template.days, template.repeatType)}
                    </Text>
                  </View>
                  <Icon name="plus-circle" size={20} color={getCategoryColor('study')} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.reminderQuickActions, { backgroundColor: themeColors.card }]}>
              <Text style={[styles.quickActionsTitle, { color: themeColors.text }]}>
                Aktif Hatırlatıcılar ({customReminders.filter(r => r.enabled).length})
              </Text>
              {customReminders.length === 0 ? (
                <View style={[styles.emptyReminders, { backgroundColor: themeColors.cardSecondary }]}>
                  <Icon name="bell-off" size={32} color={themeColors.textMuted} />
                  <Text style={[styles.emptyRemindersText, { color: themeColors.textMuted }]}>
                    Henüz hatırlatıcınız yok
                  </Text>
                  <Text style={[styles.emptyRemindersDesc, { color: themeColors.textLight }]}>
                    Yukarıdaki şablonları kullanarak hızlıca başlayın
                  </Text>
                </View>
              ) : (
                customReminders.map((reminder) => (
                  <View key={reminder.id} style={[styles.reminderItem, { backgroundColor: themeColors.cardSecondary }]}>
                    <View style={styles.reminderItemHeader}>
                      <View style={[styles.templateIcon, { backgroundColor: getCategoryColor(reminder.category) + '20' }]}>
                        <Icon name={reminder.icon} size={20} color={getCategoryColor(reminder.category)} />
                      </View>
                      <View style={styles.reminderItemInfo}>
                        <Text style={[styles.reminderItemTitle, { color: themeColors.text }]}>
                          {reminder.title}
                        </Text>
                        <Text style={[styles.reminderItemTime, { color: themeColors.textLight }]}>
                          {formatTime(reminder.time)} • {formatDays(reminder.days, reminder.repeatType)}
                        </Text>
                        {reminder.nextTrigger && (
                          <Text style={[styles.nextTriggerText, { color: themeColors.textMuted }]}>
                            Sonraki: {getNextTriggerDate(reminder).toLocaleDateString('tr-TR')}
                          </Text>
                        )}
                      </View>
                      <View style={styles.reminderActions}>
                        <TouchableOpacity
                          onPress={() => handleEditReminder(reminder)}
                          style={[styles.actionButton, { backgroundColor: themeColors.primary + '20' }]}
                        >
                          <Icon name="pencil" size={16} color={themeColors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDuplicateReminder(reminder)}
                          style={[styles.actionButton, { backgroundColor: getCategoryColor('goal') + '20' }]}
                        >
                          <Icon name="content-copy" size={16} color={getCategoryColor('goal')} />
                        </TouchableOpacity>
                        <Switch
                          value={reminder.enabled}
                          onValueChange={() => toggleReminder(reminder)}
                          trackColor={{ false: themeColors.border, true: themeColors.primary }}
                          style={styles.reminderSwitch}
                        />
                        <TouchableOpacity
                          onPress={() => deleteReminder(reminder)}
                          style={[styles.deleteButton, { backgroundColor: themeColors.danger + '20' }]}
                        >
                          <Icon name="delete" size={16} color={themeColors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={[styles.reminderItemMessage, { color: themeColors.textSecondary }]}>
                      {reminder.message}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const getThemedStyles = (themeColors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  header: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 32,
    paddingBottom: 32,
    backgroundColor: themeColors.background,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: themeColors.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 18,
    color: themeColors.textLight,
    fontWeight: '500',
  },
  card: {
    backgroundColor: themeColors.card,
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 24,
    borderRadius: 20,
    borderLeftWidth: 5,
    elevation: 3,
    shadowColor: themeColors.shadow,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: themeColors.shadowOpacity,
    shadowRadius: 12,
  },
  homeContent: {
    paddingBottom: 40,
  },
  topSection: {
    marginBottom: 20,
  },
  compactHeader: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    paddingBottom: 16,
    backgroundColor: themeColors.background,
  },
  compactHeaderTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: themeColors.text,
    letterSpacing: -0.5,
  },
  compactHeaderSubtitle: {
    fontSize: 16,
    color: themeColors.textLight,
    fontWeight: '500',
  },
  compactTodayCard: {
    backgroundColor: themeColors.card,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: themeColors.shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  compactTodayInfo: {
    flex: 1,
    marginLeft: 16,
  },
  compactTodayLabel: {
    fontSize: 12,
    color: themeColors.textLight,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactTodaySubject: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.text,
    marginTop: 2,
  },
  compactProgressBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: themeColors.primary,
  },
  compactProgressText: {
    fontSize: 13,
    fontWeight: '700',
    color: themeColors.backgroundLight,
  },
  compactTimerCard: {
    backgroundColor: themeColors.card,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: themeColors.secondary,
    elevation: 2,
    shadowColor: themeColors.shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  timerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.text,
  },
  timerSettingsButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: themeColors.cardSecondary,
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '800',
    color: themeColors.secondary,
    letterSpacing: -2,
  },
  timerStatus: {
    fontSize: 14,
    color: themeColors.textLight,
    marginTop: 8,
    fontWeight: '600',
  },
  timerControls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  timerButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.backgroundLight,
  },
  sessionInputs: {
    marginTop: 8,
  },
  inputRow: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.text,
    marginBottom: 8,
  },
  sessionInput: {
    backgroundColor: themeColors.cardSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: themeColors.text,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  compactStatsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: themeColors.card,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 1,
    shadowColor: themeColors.shadow,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: themeColors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: themeColors.textLight,
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  dailyGoalCard: {
    backgroundColor: themeColors.card,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: themeColors.shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  dailyGoalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dailyGoalInfo: {
    flex: 1,
    marginLeft: 12,
  },
  dailyGoalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.text,
    marginBottom: 2,
  },
  dailyGoalSubtitle: {
    fontSize: 13,
    color: themeColors.textLight,
    fontWeight: '500',
  },
  goalCompletionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalProgressList: {
    gap: 12,
  },
  goalProgressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalProgressIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: themeColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalProgressText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: themeColors.textSecondary,
  },
  goalCompletedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.success + '15',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  goalCompletedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.success,
  },
  timerWidget: {
    backgroundColor: themeColors.card,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: themeColors.primary,
    elevation: 2,
    shadowColor: themeColors.shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  timerTime: {
    fontSize: 48,
    fontWeight: '800',
    color: themeColors.primary,
    letterSpacing: -2,
  },
  timerSubtext: {
    fontSize: 14,
    color: themeColors.textLight,
    marginTop: 8,
    fontWeight: '600',
  },
  // ProgressScreen styles
  statsCard: {
    backgroundColor: themeColors.card,
    marginHorizontal: 24,
    marginBottom: 20,
    padding: 28,
    borderRadius: 20,
    elevation: 3,
    shadowColor: themeColors.shadow,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: themeColors.shadowOpacity,
    shadowRadius: 12,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: themeColors.text,
    marginBottom: 28,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  progressStatItem: {
    alignItems: 'center',
    padding: 16,
  },
  statItemWithBg: {
    backgroundColor: themeColors.cardSecondary,
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
  progressStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: themeColors.text,
    marginTop: 12,
  },
  progressStatLabel: {
    fontSize: 13,
    color: themeColors.textLight,
    marginTop: 6,
    fontWeight: '600',
  },
  subjectCard: {
    backgroundColor: themeColors.card,
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
    borderLeftWidth: 5,
    elevation: 3,
    shadowColor: themeColors.shadow,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: themeColors.shadowOpacity,
    shadowRadius: 12,
  },
  subjectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subjectCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: themeColors.text,
    flex: 1,
  },
  progressContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 48,
    fontWeight: '800',
    color: themeColors.primary,
    textAlign: 'center',
  },
  progressLabel: {
    fontSize: 14,
    color: themeColors.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  subjectProgressItem: {
    marginBottom: 24,
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
    flex: 1,
  },
  subjectProgressName: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.text,
    marginLeft: 12,
  },
  subjectProgressPercent: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: themeColors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  motivationCard: {
    backgroundColor: themeColors.accent,
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: themeColors.borderLight,
  },
  motivationText: {
    fontSize: 16,
    color: themeColors.primary,
    marginLeft: 16,
    flex: 1,
    fontWeight: '600',
    lineHeight: 24,
  },
});

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
    shadowColor: colors.shadow,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: colors.shadowOpacity,
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
    shadowColor: colors.shadow,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: colors.shadowOpacity,
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
    shadowColor: colors.shadow,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: colors.shadowOpacity,
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
    shadowColor: colors.shadow,
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
    shadowColor: colors.shadow,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: colors.shadowOpacity,
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
    backgroundColor: colors.warningBackground,
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 32,
    padding: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: colors.warningBorder,
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
    shadowColor: colors.shadow,
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
    shadowColor: colors.shadow,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: colors.shadowOpacity,
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
    shadowColor: colors.shadow,
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
    shadowColor: colors.shadow,
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
    shadowColor: colors.shadow,
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
    shadowColor: colors.shadow,
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
    shadowColor: colors.shadow,
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
    shadowColor: colors.shadow,
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
    shadowColor: colors.shadow,
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
    shadowColor: colors.shadow,
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
    shadowColor: colors.shadow,
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
  // Daily Goal Card Styles
  dailyGoalCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  dailyGoalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dailyGoalInfo: {
    flex: 1,
    marginLeft: 12,
  },
  dailyGoalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  dailyGoalSubtitle: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '500',
  },
  goalCompletionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalProgressList: {
    gap: 12,
  },
  goalProgressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalProgressIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalProgressText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  goalCompletedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  goalCompletedText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  // Notification Settings Styles
  notificationSection: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  notificationSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  notificationSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 8,
  },
  notificationSettingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  notificationSettingDesc: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 2,
  },
  notificationTimeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.cardSecondary,
    borderRadius: 8,
    marginLeft: 16,
    marginBottom: 8,
  },
  notificationTimeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  notificationMiniButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  notificationMiniButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Custom Reminders Styles
  reminderQuickActions: {
    backgroundColor: colors.card,
    marginHorizontal: 24,
    marginVertical: 12,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalCancel: {
    fontSize: 16,
    fontWeight: '600',
  },
  remindersList: {
    flex: 1,
    padding: 20,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  templateInfo: {
    flex: 1,
    marginLeft: 12,
  },
  templateTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  templateDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyReminders: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 10,
    marginVertical: 10,
  },
  emptyRemindersText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  emptyRemindersDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
  reminderItem: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  reminderItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reminderItemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  reminderItemTime: {
    fontSize: 12,
    marginTop: 2,
  },
  reminderItemMessage: {
    fontSize: 13,
    marginTop: 8,
    marginLeft: 32,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    marginLeft: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 12,
  },
  reminderStatItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  reminderStatLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  categoryFilter: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  nextTriggerText: {
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
  },
  reminderSwitch: {
    marginHorizontal: 8,
  },
  modernHeader: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerGradientOverlay: {
    borderRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  modernHeaderTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modernHeaderSubtitle: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  headerStats: {
    flexDirection: 'row',
    gap: 20,
  },
  headerStatItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  headerStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  headerStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  modernTodayCard: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  todayCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  todayCardInfo: {
    flex: 1,
  },
  todayCardLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  todayCardSubject: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  achievementBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  achievementText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  homeSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modernStatsSection: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  modernStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modernStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modernStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modernStatLabel: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
});

// Main App with Theme Provider
function AppWithTheme() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

// Themed App Component that rebuilds when theme changes
function ThemedApp() {
  const { isDarkMode, colors: themeColors } = useTheme();
  
  // Update global colors reference and force re-render on theme change
  React.useEffect(() => {
    colors = themeColors;
  }, [themeColors]);
  
  return <App key={isDarkMode ? 'dark' : 'light'} />;
}

export default AppWithTheme;