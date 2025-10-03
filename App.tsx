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
  PanResponder,
  Dimensions,
  Animated,
  Linking,
  ActivityIndicator,
} from 'react-native';
import {NavigationContainer, useFocusEffect} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeedbackService, FeedbackData } from './src/services/simpleFeedbackService';
import { showMotivationalMessage, getEncouragementMessage } from './src/utils/motivationalMessages';
import { MotivationSettingsModal } from './src/utils/motivationSettingsModal';
import { motivationalPushService } from './src/utils/pushNotificationService';
import { PushNotificationSettingsModal } from './src/utils/pushNotificationSettingsModal';
import { dailyReminderService } from './src/utils/dailyReminderService';
import { DailyReminderSettingsModal } from './src/utils/dailyReminderSettingsModal';

// Create context for global modal functions
const ModalContext = createContext<{
  openMotivationModal: () => void;
}>({
  openMotivationModal: () => {},
});

export const useModal = () => useContext(ModalContext);

// Color definitions
const colors = {
  primary: '#2E5BFF',
  primaryLight: '#4A73FF',
  primaryDark: '#1E4BDF',
  secondary: '#FF6B35',
  success: '#28a745',
  warning: '#FFC107',
  danger: '#DC3545',
  info: '#17a2b8',
  light: '#f8f9fa',
  dark: '#343a40',
  background: '#FFFFFF',
  backgroundLight: '#F8F9FA',
  card: '#FFFFFF',
  cardSecondary: '#F8F9FA',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  textSecondary: '#95A5A6',
  textMuted: '#BDC3C7',
  border: '#E9ECEF',
};

// Daily Goal interface
interface DailyGoal {
  id: string;
  date: string;
  subject: string;
  selectedTopics: string[]; // Array of topic IDs
  studyTimeMinutes: number; // Total study time in minutes
  questionCount: number; // Number of questions to solve
  progress: {
    completedTopics: string[]; // Array of completed topic IDs
    studyTimeSpent: number; // Minutes spent studying
    questionsAnswered: number; // Questions answered
  };
  completed: boolean;
}

// Course and Topic interfaces
interface Topic {
  id: string;
  name: string;
  courseId: string;
  completion: {
    konu: boolean;      // Topic studied
    video: boolean;     // Video watched
    soru: boolean;      // Questions solved
    tamamlandi: boolean; // Completed
  };
  notes: string;
  lastStudied?: string;
}

interface Course {
  id: string;
  name: string;
  icon: string;
  color: string;
  topics: Topic[];
  totalTopics: number;
  completedTopics: number;
}

interface GoalProgress {
  achieved: number;
  total: number;
  percentage: number;
}

// Study Log interface
interface StudyLog {
  id: string;
  date: string;
  createdAt: string; // ISO timestamp for ordering logs within the same day
  studyMinutes: number;
  videoMinutes: number;
  questionCount: number;
  studyTopics: string[]; // Topic IDs from daily goal + custom topics
  videoTopics: string[]; // Video topic IDs from today's course + custom topics
  customStudyTopics: { topicName: string; courseId: string }[]; // Custom topics not in daily goal
  customVideoTopics: { topicName: string; courseId: string }[]; // Custom video topics
  customQuestions: { courseId: string; count: number }[]; // Questions from other courses
}

// Weekly Goal Template interface
interface WeeklyGoalTemplate {
  id: string;
  courseId: string;
  courseName: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  defaultTopics: string[]; // Default topic IDs for this day/course
  defaultStudyTime: number; // Default study time in minutes
  defaultQuestionCount: number; // Default question count
  isActive: boolean;
}

// Custom Weekly Schedule interface (Legacy - for backward compatibility)
interface CustomWeeklySchedule {
  day: string;
  subject: string;
  icon: string;
  color: string;
  isCustom?: boolean;
  originalSubject?: string;
}

// New Day-based Agenda interface
interface DayAgenda {
  id: string;
  dayName: string;
  dayIndex: number; // 0=Monday, 6=Sunday
  courses: DayCourse[];
  isToday?: boolean;
}

interface DayCourse {
  id: string;
  courseId: string;
  courseName: string;
  icon: string;
  color: string;
  order: number;
  studyGoal?: {
    topics: string[];
    studyTimeMinutes: number;
    questionCount: number;
  };
  isActive: boolean;
  isCustomActivity?: boolean; // New field to mark custom activities
}

// Calendar view modes
type CalendarViewMode = 'list' | 'calendar';

function HomeScreen() {
  const { openMotivationModal } = useModal();
  const [weeklySchedule, setWeeklySchedule] = useState<CustomWeeklySchedule[]>(defaultWeeklySchedule);
  const [todaySubject, setTodaySubject] = useState<CustomWeeklySchedule | null>(null);
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
  const [courses, setCourses] = useState<Course[]>(defaultCourses);

  // Add state for showing welcome message only once
  const [hasShownWelcomeMessage, setHasShownWelcomeMessage] = useState(false);

  // Load custom weekly schedule
  const loadWeeklySchedule = React.useCallback(async () => {
    try {
      const scheduleData = await AsyncStorage.getItem('customWeeklySchedule');
      if (scheduleData) {
        const customSchedule: CustomWeeklySchedule[] = JSON.parse(scheduleData);
        setWeeklySchedule(customSchedule);
      } else {
        setWeeklySchedule(defaultWeeklySchedule);
      }
    } catch (error) {
      console.log('Error loading weekly schedule:', error);
      setWeeklySchedule(defaultWeeklySchedule);
    }
  }, []);
  
  // Study Log states
  const [showLogModal, setShowLogModal] = useState(false);
  const [todayStudyLog, setTodayStudyLog] = useState<StudyLog | null>(null);
  const [allStudyLogs, setAllStudyLogs] = useState<StudyLog[]>([]);
  const [showLogViewerModal, setShowLogViewerModal] = useState(false);
  const [selectedDateLogs, setSelectedDateLogs] = useState<StudyLog[]>([]);
  const [showAllLogsModal, setShowAllLogsModal] = useState(false);
  
  // Log Modal states  
  const [logStudyMinutes, setLogStudyMinutes] = useState(0);
  const [logVideoMinutes, setLogVideoMinutes] = useState(0);
  const [logQuestionCount, setLogQuestionCount] = useState(0);
  const [logStudyTopics, setLogStudyTopics] = useState<string[]>([]);
  const [logVideoTopics, setLogVideoTopics] = useState<string[]>([]);
  const [customStudyTopics, setCustomStudyTopics] = useState<{ topicName: string; courseId: string }[]>([]);
  const [customVideoTopics, setCustomVideoTopics] = useState<{ topicName: string; courseId: string }[]>([]);
  const [customQuestions, setCustomQuestions] = useState<{ courseId: string; count: number }[]>([]);
  const [showCustomStudyPicker, setShowCustomStudyPicker] = useState(false);
  const [showCustomVideoPicker, setShowCustomVideoPicker] = useState(false);
  const [showCustomQuestionPicker, setShowCustomQuestionPicker] = useState(false);
  
  // Input states for direct number entry
  const [studyMinutesInput, setStudyMinutesInput] = useState('0');
  const [videoMinutesInput, setVideoMinutesInput] = useState('0');
  const [questionCountInput, setQuestionCountInput] = useState('0');

  // Daily Goal Modal states
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [studyTimeMinutes, setStudyTimeMinutes] = useState(60); // Store in minutes
  const [studyTimeInput, setStudyTimeInput] = useState('60'); // For manual input
  const [questionCount, setQuestionCount] = useState(10);
  const [questionInput, setQuestionInput] = useState('10'); // For manual input
  const [showCrossTopicPicker, setShowCrossTopicPicker] = useState(false);

  // Schedule editing states
  const [showScheduleEditModal, setShowScheduleEditModal] = useState(false);
  const [editingDay, setEditingDay] = useState<CustomWeeklySchedule | null>(null);
  const [editDayName, setEditDayName] = useState('');
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editSelectedCourse, setEditSelectedCourse] = useState<Course>(defaultCourses[0]);

  // Calculate cumulative data for today from all study logs
  const getCumulativeTodayData = React.useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = allStudyLogs.filter(log => log.date === today);
    
    if (todayLogs.length === 0) return null;
    
    return todayLogs.reduce((acc, log) => ({
      studyMinutes: acc.studyMinutes + log.studyMinutes,
      videoMinutes: acc.videoMinutes + log.videoMinutes,
      questionCount: acc.questionCount + log.questionCount,
      studyTopics: [...new Set([...acc.studyTopics, ...log.studyTopics])]
    }), {
      studyMinutes: 0,
      videoMinutes: 0,
      questionCount: 0,
      studyTopics: [] as string[]
    });
  }, [allStudyLogs]);

  const calculateGoalProgress = React.useCallback((goals: DailyGoal[]) => {
    if (goals.length === 0) {
      setGoalProgress({ achieved: 0, total: 0, percentage: 0 });
      return;
    }

    const cumulativeData = getCumulativeTodayData();
    let totalAchieved = 0;
    let totalGoals = 0;

    goals.forEach(goal => {
      const { selectedTopics: goalTopics, studyTimeMinutes: goalStudyTime, questionCount: goalQuestions } = goal;
      
      // Count individual goal achievements based on cumulative study data
      if (goalTopics.length > 0) {
        totalGoals++;
        if (cumulativeData) {
          const studiedTopicsFromGoal = cumulativeData.studyTopics.filter(topicId => 
            goalTopics.includes(topicId)
          );
          if (studiedTopicsFromGoal.length >= goalTopics.length) totalAchieved++;
        }
      }
      
      if (goalQuestions > 0) {
        totalGoals++;
        if (cumulativeData && cumulativeData.questionCount >= goalQuestions) totalAchieved++;
      }
      
      if (goalStudyTime > 0) {
        totalGoals++;
        if (cumulativeData && cumulativeData.studyMinutes >= goalStudyTime) totalAchieved++;
      }
    });

    const percentage = totalGoals > 0 ? Math.round((totalAchieved / totalGoals) * 100) : 0;
    setGoalProgress({ achieved: totalAchieved, total: totalGoals, percentage });
  }, [getCumulativeTodayData]);

  // Update daily goal progress based on study logs
  const updateDailyGoalProgress = React.useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const goalsData = await AsyncStorage.getItem('dailyGoals');
      
      if (!goalsData || !todayStudyLog) return;
      
      const allGoals: DailyGoal[] = JSON.parse(goalsData);
      let needsUpdate = false;
      
      // Update today's goals with actual progress from study logs
      const updatedGoals = allGoals.map(goal => {
        if (goal.date !== today) return goal;
        
        // Calculate actual progress from all today's logs
        const todayLogs = allStudyLogs.filter(log => log.date === today);
        
        let totalStudyTime = 0;
        let totalQuestions = 0;
        const completedTopics = new Set<string>();
        
        // Aggregate all today's study sessions
        todayLogs.forEach(log => {
          totalStudyTime += log.studyMinutes;
          totalQuestions += log.questionCount;
          log.studyTopics.forEach(topicId => completedTopics.add(topicId));
          // Also include custom questions
          log.customQuestions.forEach(cq => {
            totalQuestions += cq.count;
          });
        });
        
        // Check if goal topics are completed
        const goalCompletedTopics = goal.selectedTopics.filter(topicId => 
          completedTopics.has(topicId)
        );
        
        // Create updated progress
        const newProgress = {
          completedTopics: goalCompletedTopics,
          studyTimeSpent: totalStudyTime,
          questionsAnswered: totalQuestions
        };
        
        // Check if goal is completed
        const topicsCompleted = goalCompletedTopics.length >= goal.selectedTopics.length;
        const timeCompleted = totalStudyTime >= goal.studyTimeMinutes;
        const questionsCompleted = totalQuestions >= goal.questionCount;
        const isCompleted = topicsCompleted && timeCompleted && questionsCompleted;
        
        // Update if progress or completion status changed
        if (JSON.stringify(goal.progress) !== JSON.stringify(newProgress) || goal.completed !== isCompleted) {
          needsUpdate = true;
          return {
            ...goal,
            progress: newProgress,
            completed: isCompleted
          };
        }
        
        return goal;
      });
      
      // Save updated goals if there were changes
      if (needsUpdate) {
        await AsyncStorage.setItem('dailyGoals', JSON.stringify(updatedGoals));
        // Update today's goals directly to reflect changes
        const todayDate = new Date().toISOString().split('T')[0];
        const todayUpdatedGoals = updatedGoals.filter(goal => goal.date === todayDate);
        setTodayGoals(todayUpdatedGoals);
      }
    } catch (error) {
      console.log('Error updating daily goal progress:', error);
    }
  }, [todayStudyLog, allStudyLogs]);

  // Load today's goals
  const loadTodayGoals = React.useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const allGoals = await AsyncStorage.getItem('dailyGoals');
      
      if (allGoals) {
        const goals = JSON.parse(allGoals);
        const filtered = goals.filter((goal: DailyGoal) => goal.date === today);
        setTodayGoals(filtered);
        // Note: calculateGoalProgress will be called when todayStudyLog changes
      } else {
        setTodayGoals([]);
        setGoalProgress({ achieved: 0, total: 0, percentage: 0 });
      }
    } catch (error) {
      console.log('Error loading today goals:', error);
    }
  }, []);

  // Effect to recalculate goal progress when study log or goals change
  useEffect(() => {
    if (todayGoals.length > 0) {
      calculateGoalProgress(todayGoals);
    }
  }, [todayGoals, todayStudyLog, calculateGoalProgress]);

  // Effect to update daily goal progress when study logs change
  useEffect(() => {
    if (todayStudyLog || allStudyLogs.length > 0) {
      updateDailyGoalProgress();
    }
  }, [todayStudyLog, allStudyLogs, updateDailyGoalProgress]);

  // Get today's subject goal
  const getTodaySubjectGoal = () => {
    if (!todaySubject) return null;
    return todayGoals.find(goal => goal.subject === todaySubject.subject);
  };

  // Study Log functions
  const getCurrentCourse = React.useCallback(() => {
    const dayOfWeek = new Date().getDay();
    const schedule = defaultWeeklySchedule[dayOfWeek === 0 ? 6 : dayOfWeek - 1]; // Adjust for Sunday
    return courses.find(course => course.name === schedule.subject);
  }, [courses]);

  const calculateTodayCourseProgress = React.useCallback(() => {
    const todayCourse = getCurrentCourse();
    if (!todayCourse || todayGoals.length === 0) return 0;

    const todayGoal = todayGoals[0];
    const cumulativeData = getCumulativeTodayData();
    if (!cumulativeData) return 0;

    // Calculate progress based on daily goal vs cumulative study data
    let progressScore = 0;
    let totalScore = 0;

    // Study time progress
    if (todayGoal.studyTimeMinutes > 0) {
      const studyProgress = Math.min(cumulativeData.studyMinutes / todayGoal.studyTimeMinutes, 1);
      progressScore += studyProgress * 33.33; // 1/3 of total
      totalScore += 33.33;
    }

    // Questions progress
    if (todayGoal.questionCount > 0) {
      const questionProgress = Math.min(cumulativeData.questionCount / todayGoal.questionCount, 1);
      progressScore += questionProgress * 33.33; // 1/3 of total
      totalScore += 33.33;
    }

    // Topics progress (study topics)
    if (todayGoal.selectedTopics.length > 0) {
      const studiedTopicsFromGoal = cumulativeData.studyTopics.filter(topicId => 
        todayGoal.selectedTopics.includes(topicId)
      );
      const topicsProgress = Math.min(studiedTopicsFromGoal.length / todayGoal.selectedTopics.length, 1);
      progressScore += topicsProgress * 33.33; // 1/3 of total
      totalScore += 33.33;
    }

    return totalScore > 0 ? Math.round(progressScore) : 0;
  }, [todayGoals, getCumulativeTodayData, getCurrentCourse]);

  // Get today's subject course progress based on study logs
  const getTodaySubjectProgress = React.useCallback(() => {
    if (!todaySubject) return { percentage: 0, completed: 0, total: 0 };
    
    // Use the new function to calculate progress based on daily goals and cumulative study data
    const percentage = calculateTodayCourseProgress();
    
    // For display purposes, calculate completed vs total from daily goals and cumulative study data
    if (todayGoals.length > 0) {
      const todayGoal = todayGoals[0];
      const cumulativeData = getCumulativeTodayData();
      let completed = 0;
      let total = 0;

      // Count study time completion
      if (todayGoal.studyTimeMinutes > 0) {
        total++;
        if (cumulativeData && cumulativeData.studyMinutes >= todayGoal.studyTimeMinutes) completed++;
      }

      // Count questions completion
      if (todayGoal.questionCount > 0) {
        total++;
        if (cumulativeData && cumulativeData.questionCount >= todayGoal.questionCount) completed++;
      }

      // Count topics completion
      if (todayGoal.selectedTopics.length > 0) {
        total++;
        if (cumulativeData) {
          const studiedTopicsFromGoal = cumulativeData.studyTopics.filter(topicId => 
            todayGoal.selectedTopics.includes(topicId)
          );
          if (studiedTopicsFromGoal.length >= todayGoal.selectedTopics.length) completed++;
        }
      }

      return { percentage, completed, total };
    }
    
    return { percentage: 0, completed: 0, total: 0 };
  }, [todaySubject, todayGoals, getCumulativeTodayData, calculateTodayCourseProgress]);

  // Create goal for today's subject
  const createTodayGoal = () => {
    if (!todaySubject) return;
    
    // Reset modal state
    setSelectedTopics([]);
    setStudyTimeMinutes(60);
    setStudyTimeInput('60');
    setQuestionCount(10);
    setQuestionInput('10');
    setShowGoalModal(true);
  };

  // Save daily goal
  const saveDailyGoal = async () => {
    if (!todaySubject || selectedTopics.length === 0) {
      Alert.alert('Hata', 'Lütfen en az bir konu seçin.');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      const newGoal: DailyGoal = {
        id: `${todaySubject.subject}_${today}`,
        subject: todaySubject.subject,
        date: today,
        selectedTopics,
        studyTimeMinutes: studyTimeMinutes,
        questionCount,
        progress: {
          completedTopics: [],
          studyTimeSpent: 0,
          questionsAnswered: 0,
        },
        completed: false,
      };

      const goalsData = await AsyncStorage.getItem('dailyGoals');
      let allGoals: DailyGoal[] = goalsData ? JSON.parse(goalsData) : [];
      
      // Remove any existing goal for this subject and date
      allGoals = allGoals.filter(goal => !(goal.subject === todaySubject.subject && goal.date === today));
      
      // Add the new goal
      allGoals.push(newGoal);
      await AsyncStorage.setItem('dailyGoals', JSON.stringify(allGoals));
      
      // Reload today's goals
      await loadTodayGoals();
      setShowGoalModal(false);
      
      const hours = Math.floor(studyTimeMinutes / 60);
      const minutes = studyTimeMinutes % 60;
      const timeDisplay = hours > 0 ? `${hours}sa ${minutes}dk` : `${minutes}dk`;
      
      Alert.alert(
        'Hedef Oluşturuldu! 🎯',
        `${todaySubject.subject} için günlük hedef belirlendi:\n• ${selectedTopics.length} Konu\n• ${questionCount} Soru\n• ${timeDisplay} Çalışma`
      );
    } catch (error) {
      console.log('Daily goal oluşturulamadı:', error);
      Alert.alert('Hata', 'Günlük hedef oluşturulamadı.');
    }
  };

  // Toggle topic selection
  const toggleTopicSelection = (topicId: string) => {
    setSelectedTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };
  
  const loadTodayStudyLog = React.useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const logsData = await AsyncStorage.getItem('studyLogs');
      
      if (logsData) {
        const logs: StudyLog[] = JSON.parse(logsData);
        const todayLog = logs.find(log => log.date === today);
        setTodayStudyLog(todayLog || null);
      }
    } catch (error) {
      console.log('Error loading study log:', error);
    }
  }, []);

  const saveStudyLog = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const logsData = await AsyncStorage.getItem('studyLogs');
      let logs: StudyLog[] = logsData ? JSON.parse(logsData) : [];
      
      // Don't remove existing logs - allow multiple logs per day
      // logs = logs.filter(log => log.date !== today);
      
      // Create new log with timestamp
      const newLog: StudyLog = {
        id: Date.now().toString(),
        date: today,
        createdAt: now,
        studyMinutes: logStudyMinutes,
        videoMinutes: logVideoMinutes,
        questionCount: logQuestionCount,
        studyTopics: logStudyTopics,
        videoTopics: logVideoTopics,
        customStudyTopics,
        customVideoTopics,
        customQuestions,
      };
      
      logs.push(newLog);
      await AsyncStorage.setItem('studyLogs', JSON.stringify(logs));
      
      // Update today's log to show the latest one in the summary
      setTodayStudyLog(newLog);
      setAllStudyLogs(logs);
      setShowLogModal(false);
      
      // Reset form
      setLogStudyMinutes(0);
      setLogVideoMinutes(0);
      setLogQuestionCount(0);
      setLogStudyTopics([]);
      setLogVideoTopics([]);
      setCustomStudyTopics([]);
      setCustomVideoTopics([]);
      setCustomQuestions([]);
      
      // Reset input states
      setStudyMinutesInput('0');
      setVideoMinutesInput('0');
      setQuestionCountInput('0');
      
      // Refresh progress
      loadProgress();
      
      // Show encouragement message
      const encouragementMsg = getEncouragementMessage();
      Alert.alert('✅ Harika!', `${encouragementMsg.message}\n\nÇalışma kaydınız başarıyla eklendi!`);
    } catch (error) {
      console.log('Error saving study log:', error);
      Alert.alert('❌', 'Kayıt sırasında hata oluştu');
    }
  };

  // Load all study logs
  const loadAllStudyLogs = async () => {
    try {
      const logsData = await AsyncStorage.getItem('studyLogs');
      if (logsData) {
        const logs: StudyLog[] = JSON.parse(logsData);
        setAllStudyLogs(logs);
        return logs;
      }
      return [];
    } catch (error) {
      console.log('Error loading study logs:', error);
      return [];
    }
  };

  // Delete individual study log
  const deleteStudyLog = async (logId: string) => {
    try {
      const logsData = await AsyncStorage.getItem('studyLogs');
      if (logsData) {
        let logs: StudyLog[] = JSON.parse(logsData);
        logs = logs.filter(log => log.id !== logId);
        await AsyncStorage.setItem('studyLogs', JSON.stringify(logs));
        setAllStudyLogs(logs);
        
        // Update today's log if deleted
        const today = new Date().toISOString().split('T')[0];
        const todayLog = logs.find(log => log.date === today);
        setTodayStudyLog(todayLog || null);
        
        // Refresh progress
        loadProgress();
        
        Alert.alert('✅', 'Çalışma kaydı silindi!');
      }
    } catch (error) {
      console.log('Error deleting study log:', error);
      Alert.alert('❌', 'Silme işleminde hata oluştu');
    }
  };

  // View logs for specific date
  const viewDayLogs = (date: string) => {
    const logs = allStudyLogs.filter(log => log.date === date);
    // Sort by creation time (newest first)
    logs.sort((a, b) => new Date(b.createdAt || b.id).getTime() - new Date(a.createdAt || a.id).getTime());
    setSelectedDateLogs(logs);
    setShowLogViewerModal(true);
  };

  // Schedule editing functions
  const editScheduleDay = (day: CustomWeeklySchedule) => {
    setEditingDay(day);
    setEditDayName(day.day);
    setEditSubjectName(day.subject);
    
    const course = courses.find(c => c.name === day.subject) || courses[0];
    setEditSelectedCourse(course);
    setShowScheduleEditModal(true);
  };

  const saveScheduleChanges = async () => {
    if (!editingDay) return;
    
    try {
      const updatedSchedule = weeklySchedule.map(day => 
        day.day === editingDay.day 
          ? {
              ...day,
              day: editDayName.trim() || editingDay.day,
              subject: editSubjectName.trim() || editSelectedCourse.name,
              isCustom: true,
              originalSubject: day.originalSubject || day.subject
            }
          : day
      );
      
      await AsyncStorage.setItem('customWeeklySchedule', JSON.stringify(updatedSchedule));
      setWeeklySchedule(updatedSchedule);
      setShowScheduleEditModal(false);
      
      Alert.alert(
        '✅', 
        `${editDayName} günü güncellendi: ${editSubjectName || editSelectedCourse.name}`
      );
    } catch (error) {
      console.log('Error saving schedule changes:', error);
      Alert.alert('❌', 'Program güncellenirken hata oluştu');
    }
  };

  const resetScheduleToDefault = () => {
    Alert.alert(
      'Program Sıfırla',
      'Haftalık programı varsayılan haline sıfırlamak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('customWeeklySchedule');
            setWeeklySchedule(defaultWeeklySchedule);
            Alert.alert('✅', 'Haftalık program varsayılan haline sıfırlandı!');
          },
        },
      ]
    );
  };

  // Load progress data
  // Shared function to load study logs
  const loadStudyLogs = React.useCallback(async () => {
    try {
      const logsData = await AsyncStorage.getItem('studyLogs');
      if (logsData) {
        const logs: StudyLog[] = JSON.parse(logsData);
        setAllStudyLogs(logs);
        
        // Get today's logs
        const today = new Date().toISOString().split('T')[0];
        const todayLogs = logs.filter(log => log.date === today);
        if (todayLogs.length > 0) {
          // Sort by createdAt (newest first) and get the latest
          todayLogs.sort((a, b) => new Date(b.createdAt || b.id).getTime() - new Date(a.createdAt || a.id).getTime());
          setTodayStudyLog(todayLogs[0]);
        } else {
          setTodayStudyLog(null);
        }
        
        return logs;
      }
      return [];
    } catch (error) {
      console.log('Error loading study logs:', error);
      return [];
    }
  }, []);

  const loadProgress = React.useCallback(async () => {
    try {
      // Load course data
      const coursesData = await AsyncStorage.getItem('courses');
      if (coursesData) {
        const coursesArray: Course[] = JSON.parse(coursesData);
        setCourses(coursesArray);
      } else {
        setCourses(defaultCourses);
      }

      // Load study logs using shared function
      const logs = await loadStudyLogs();

      // Calculate stats from study logs instead of checkboxes
      if (logs.length > 0) {
        let totalStudyMinutes = 0;
        let totalVideoMinutes = 0;
        let totalQuestions = 0;

        logs.forEach(log => {
          totalStudyMinutes += log.studyMinutes;
          totalVideoMinutes += log.videoMinutes;
          totalQuestions += log.questionCount;
          // Add custom questions
          log.customQuestions.forEach(cq => {
            totalQuestions += cq.count;
          });
        });

        setStats({
          studiedTopics: Math.floor(totalStudyMinutes / 60), // Convert minutes to "topics studied"
          videosWatched: Math.floor(totalVideoMinutes / 30), // Convert to "videos watched"
          questionsSolved: totalQuestions,
        });
      } else {
        setStats({
          studiedTopics: 0,
          videosWatched: 0,
          questionsSolved: 0,
        });
      }
    } catch (error) {
      console.log('Progress yüklenemedi:', error);
    }
  }, [loadStudyLogs]);

  const onRefresh = async () => {
    setRefreshing(true);
    
    // Load custom weekly schedule first
    await loadWeeklySchedule();
    
    // Update today's subject based on loaded schedule
    const today = new Date().getDay();
    const dayIndex = today === 0 ? 6 : today - 1;
    const currentSchedule = await AsyncStorage.getItem('customWeeklySchedule');
    const schedule = currentSchedule ? JSON.parse(currentSchedule) : defaultWeeklySchedule;
    setTodaySubject(schedule[dayIndex]);
    
    // Reload progress data and goals
    await loadProgress();
    await loadTodayGoals();
    
    setRefreshing(false);
  };

  // Load initial data when component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      // Load weekly schedule first
      await loadWeeklySchedule();
      
      // Set today's subject based on loaded schedule
      const today = new Date().getDay();
      const dayIndex = today === 0 ? 6 : today - 1;
      const currentSchedule = await AsyncStorage.getItem('customWeeklySchedule');
      const schedule = currentSchedule ? JSON.parse(currentSchedule) : defaultWeeklySchedule;
      setTodaySubject(schedule[dayIndex]);
      
      // Load progress, goals, and study log
      await loadProgress();
      await loadTodayGoals();
      await loadTodayStudyLog();
      
      // Initialize push notification service
      try {
        await motivationalPushService.initialize();
        console.log('Push notification service initialized');
      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }

      // Initialize daily reminder service
      try {
        await dailyReminderService.initialize();
        console.log('Daily reminder service initialized');
      } catch (error) {
        console.error('Error initializing daily reminders:', error);
      }
      
      // Show welcome message only once after a delay
      if (!hasShownWelcomeMessage) {
        setTimeout(() => {
          showMotivationalMessage(() => {
            openMotivationModal();
          });
          setHasShownWelcomeMessage(true);
        }, 2000);
      }
    };

    loadInitialData();
  }, [loadProgress, loadTodayGoals, loadTodayStudyLog, loadWeeklySchedule, hasShownWelcomeMessage]);

  return (
    <View style={styles.container}>
      {/* Enhanced Header */}
      <View style={[styles.modernHeader, { backgroundColor: colors.primary }]}>
        <View style={styles.headerGradientOverlay}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.modernHeaderTitle}>
                KPSS Takip
              </Text>
            </View>
          </View>
        </View>
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
            <View style={[styles.modernTodayCard, { backgroundColor: colors.card }]}>
              <View style={styles.todayCardContent}>
                <View style={[styles.subjectIconContainer, { backgroundColor: todaySubject.color + '15' }]}>
                  <Icon name={todaySubject.icon} size={28} color={todaySubject.color} />
                </View>
                <View style={styles.todayCardInfo}>
                  <Text style={[styles.todayCardLabel, { color: colors.textLight }]}>Bugünün Dersi</Text>
                  <Text style={[styles.todayCardSubject, { color: colors.text }]}>{todaySubject.subject}</Text>
                  <View style={styles.progressRow}>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            backgroundColor: todaySubject.color,
                            width: `${getTodaySubjectProgress().percentage}%`
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.progressText, { color: todaySubject.color }]}>
                      {getTodaySubjectProgress().percentage}%
                    </Text>
                  </View>
                </View>
              </View>
              <View style={[styles.achievementBadge, { backgroundColor: todaySubject.color }]}>
                <Icon name="trophy" size={16} color="white" />
                <Text style={styles.achievementText}>{getTodaySubjectProgress().completed}/{getTodaySubjectProgress().total}</Text>
              </View>
            </View>
          )}

          {/* Daily Goal Card - Only show if there's a goal for today's subject */}
          {(() => {
            const todayGoal = getTodaySubjectGoal();
            
            // If no goal exists for today's subject, show create goal option
            if (!todayGoal && todaySubject) {
              return (
                <View style={[styles.dailyGoalCard, {borderLeftColor: colors.primary, backgroundColor: colors.card}]}>
                  <View style={styles.dailyGoalHeader}>
                    <Icon name="target-account" size={24} color={colors.primary} />
                    <View style={styles.dailyGoalInfo}>
                      <Text style={[styles.dailyGoalTitle, { color: colors.text }]}>Günlük Hedef Belirle</Text>
                      <Text style={[styles.dailyGoalSubtitle, { color: colors.textLight }]}>
                        {todaySubject.subject} için hedef oluştur
                      </Text>
                    </View>
                    <TouchableOpacity 
                      onPress={createTodayGoal}
                      style={[styles.goalActionButton, { backgroundColor: colors.primary }]}
                    >
                      <Icon name="plus" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            // If goal exists, show progress
            if (todayGoal) {
              // Calculate cumulative progress from all today's logs
              let studyProgress = 0;
              let questionProgress = 0;
              let topicsProgress = 0;

              // Get all today's logs for cumulative progress
              const today = new Date().toISOString().split('T')[0];
              const todayLogs = allStudyLogs.filter(log => log.date === today);
              
              if (todayLogs.length > 0) {
                // Calculate cumulative study time and questions
                let totalStudyTime = 0;
                let totalQuestions = 0;
                const studiedTopicsSet = new Set<string>();
                
                todayLogs.forEach(log => {
                  totalStudyTime += log.studyMinutes;
                  totalQuestions += log.questionCount;
                  log.studyTopics.forEach(topicId => studiedTopicsSet.add(topicId));
                  // Include custom questions
                  log.customQuestions.forEach(cq => {
                    totalQuestions += cq.count;
                  });
                });

                studyProgress = todayGoal.studyTimeMinutes > 0 ? 
                  Math.min(totalStudyTime / todayGoal.studyTimeMinutes, 1) : 0;
                
                questionProgress = todayGoal.questionCount > 0 ? 
                  Math.min(totalQuestions / todayGoal.questionCount, 1) : 0;
                
                if (todayGoal.selectedTopics.length > 0) {
                  const studiedTopicsFromGoal = todayGoal.selectedTopics.filter(topicId => 
                    studiedTopicsSet.has(topicId)
                  );
                  topicsProgress = Math.min(studiedTopicsFromGoal.length / todayGoal.selectedTopics.length, 1);
                }
              }

              return (
                <View style={[styles.dailyGoalCard, {borderLeftColor: colors.success, backgroundColor: colors.card}]}>
                  <View style={styles.dailyGoalHeader}>
                    <Icon name="target-account" size={24} color={colors.success} />
                    <View style={styles.dailyGoalInfo}>
                      <Text style={[styles.dailyGoalTitle, { color: colors.text }]}>Günlük Hedef</Text>
                      <Text style={[styles.dailyGoalSubtitle, { color: colors.textLight }]}>
                        {todayGoal.subject} - {goalProgress.achieved}/{goalProgress.total} tamamlandı
                      </Text>
                    </View>
                    <View style={styles.goalActions}>
                      <TouchableOpacity 
                        onPress={() => {
                          // Pre-fill modal with existing goal data
                          setSelectedTopics(todayGoal.selectedTopics);
                          setStudyTimeMinutes(todayGoal.studyTimeMinutes);
                          setStudyTimeInput(String(todayGoal.studyTimeMinutes));
                          setQuestionCount(todayGoal.questionCount);
                          setQuestionInput(String(todayGoal.questionCount));
                          setShowGoalModal(true);
                        }}
                        style={[styles.goalEditButton, { backgroundColor: colors.info }]}
                      >
                        <Icon name="pencil" size={16} color="white" />
                      </TouchableOpacity>
                      <View style={[styles.goalProgressBadge, { backgroundColor: colors.success }]}>
                        <Text style={styles.goalProgressText}>{goalProgress.percentage}%</Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* Selected Topics */}
                  <View style={styles.selectedTopicsSection}>
                    <Text style={[styles.selectedTopicsTitle, { color: colors.textLight }]}>Seçilen Konular:</Text>
                    <View style={styles.selectedTopicsContainer}>
                      {todayGoal.selectedTopics.map((topicId) => {
                        const topic = courses.flatMap(c => c.topics).find(t => t.id === topicId);
                        // Check if topic is studied in any of today's logs
                        const isStudied = todayLogs.some(log => log.studyTopics.includes(topicId));
                        return topic ? (
                          <View key={topicId} style={[
                            styles.selectedTopicChip, 
                            { 
                              backgroundColor: isStudied ? colors.success + '20' : colors.backgroundLight,
                              borderColor: isStudied ? colors.success : colors.border
                            }
                          ]}>
                            <Icon 
                              name={isStudied ? "check-circle" : "circle-outline"} 
                              size={14} 
                              color={isStudied ? colors.success : colors.textMuted} 
                            />
                            <Text style={[
                              styles.selectedTopicText, 
                              { color: isStudied ? colors.success : colors.text }
                            ]}>
                              {topic.name}
                            </Text>
                          </View>
                        ) : null;
                      })}
                    </View>
                  </View>
                  
                  <View style={styles.progressGrid}>
                    <View style={styles.progressItem}>
                      <Icon 
                        name="book-check" 
                        size={20} 
                        color={topicsProgress >= 1 ? colors.success : colors.textMuted} 
                        style={styles.progressIcon}
                      />
                      <Text style={styles.progressValue}>
                        {todayGoal.selectedTopics.filter(topicId => 
                          todayLogs.some(log => log.studyTopics.includes(topicId))
                        ).length}/{todayGoal.selectedTopics.length}
                      </Text>
                      <Text style={styles.progressTarget}>Konu</Text>
                    </View>
                    
                    <View style={styles.progressItem}>
                      <Icon 
                        name="help-circle" 
                        size={20} 
                        color={questionProgress >= 1 ? colors.success : colors.textMuted} 
                        style={styles.progressIcon}
                      />
                      <Text style={styles.progressValue}>
                        {todayLogs.reduce((total, log) => total + log.questionCount + log.customQuestions.reduce((cqTotal, cq) => cqTotal + cq.count, 0), 0)}/{todayGoal.questionCount}
                      </Text>
                      <Text style={styles.progressTarget}>Soru</Text>
                    </View>
                    
                    <View style={styles.progressItem}>
                      <Icon 
                        name="clock" 
                        size={20} 
                        color={studyProgress >= 1 ? colors.success : colors.textMuted} 
                        style={styles.progressIcon}
                      />
                      <Text style={styles.progressValue}>
                        {todayLogs.reduce((total, log) => total + log.studyMinutes, 0)}/{todayGoal.studyTimeMinutes}
                      </Text>
                      <Text style={styles.progressTarget}>Dakika</Text>
                    </View>
                  </View>
                </View>
              );
            }

            return null;
          })()}
        </View>

        {/* Study Log Section */}
        <View style={styles.studyLogSection}>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={[styles.logButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                // Initialize input states with current values
                setStudyMinutesInput(String(logStudyMinutes));
                setVideoMinutesInput(String(logVideoMinutes));
                setQuestionCountInput(String(logQuestionCount));
                setShowLogModal(true);
              }}
            >
              <Icon name="book-plus" size={18} color="white" />
              <Text style={styles.logButtonText}>Çalışma Kaydet</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.motivationButton, { backgroundColor: colors.warning }]}
              onPress={() => {
                showMotivationalMessage(() => {
                  // Open motivation settings modal when Ayarlar is pressed
                  openMotivationModal();
                });
              }}
              activeOpacity={0.8}
            >
              <Icon name="emoticon-happy" size={18} color="white" />
              <Text style={styles.motivationButtonText}>Motivasyon</Text>
            </TouchableOpacity>
          </View>
          
          {/* Today's Summary with cumulative data */}
          {(() => {
            const currentDate = new Date().toISOString().split('T')[0];
            const todayLogs = allStudyLogs.filter(log => log.date === currentDate);
            
            if (todayLogs.length === 0) return null;
            
            // Calculate cumulative data for today
            const cumulativeData = todayLogs.reduce((acc, log) => ({
              studyMinutes: acc.studyMinutes + log.studyMinutes,
              videoMinutes: acc.videoMinutes + log.videoMinutes,
              questionCount: acc.questionCount + log.questionCount,
              studyTopics: [...new Set([...acc.studyTopics, ...log.studyTopics])]
            }), {
              studyMinutes: 0,
              videoMinutes: 0,
              questionCount: 0,
              studyTopics: [] as string[]
            });
            
            return (
              <TouchableOpacity 
                style={[styles.todayLogSummary, { backgroundColor: colors.card }]}
                onPress={() => {
                  const today = new Date().toISOString().split('T')[0];
                  viewDayLogs(today);
                }}
              >
                <View style={styles.logSummaryHeader}>
                  <Text style={[styles.logSummaryTitle, { color: colors.text }]}>Bugünün Özeti</Text>
                  <View style={styles.sessionCountBadge}>
                    <Text style={[styles.sessionCountText, { color: colors.textMuted }]}>
                      {todayLogs.length} seans
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={16} color={colors.textMuted} />
                </View>
                <View style={styles.logSummaryStats}>
                  <View style={styles.logStat}>
                    <Icon name="clock" size={16} color={colors.primary} />
                    <Text style={[styles.logStatText, { color: colors.textLight }]}>
                      {cumulativeData.studyMinutes}dk Çalışma
                    </Text>
                  </View>
                  <View style={styles.logStat}>
                    <Icon name="video" size={16} color={colors.secondary} />
                    <Text style={[styles.logStatText, { color: colors.textLight }]}>
                      {cumulativeData.videoMinutes}dk Video
                    </Text>
                  </View>
                  <View style={styles.logStat}>
                    <Icon name="help-circle" size={16} color={colors.success} />
                    <Text style={[styles.logStatText, { color: colors.textLight }]}>
                      {cumulativeData.questionCount} Soru
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })()}
        </View>
      </ScrollView>

      {/* Daily Goal Creation Modal */}
      <Modal
        visible={showGoalModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGoalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                🎯 Günlük Hedef Belirle
              </Text>
              <TouchableOpacity 
                onPress={() => setShowGoalModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {todaySubject && (
                <>
                  <Text style={[styles.modalSubject, { color: colors.primary }]}>
                    {todaySubject.subject}
                  </Text>

                  {/* Topic Selection */}
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Konular Seçin:
                  </Text>
                  
                  {/* Current Course Topics */}
                  <Text style={[styles.sectionTitle, { color: colors.textLight, fontSize: 14, marginTop: 8 }]}>
                    {todaySubject.subject} Konuları:
                  </Text>
                  <View style={styles.topicsContainer}>
                    {courses
                      .find(c => c.name === todaySubject.subject)
                      ?.topics.map((topic) => (
                        <TouchableOpacity
                          key={topic.id}
                          style={[
                            styles.topicItem,
                            {
                              backgroundColor: selectedTopics.includes(topic.id)
                                ? colors.primary + '15'
                                : colors.background,
                              borderColor: selectedTopics.includes(topic.id)
                                ? colors.primary
                                : colors.border,
                            },
                          ]}
                          onPress={() => toggleTopicSelection(topic.id)}
                        >
                          <Text
                            style={[
                              styles.topicItemText,
                              {
                                color: selectedTopics.includes(topic.id)
                                  ? colors.primary
                                  : colors.text,
                              },
                            ]}
                          >
                            {topic.name}
                          </Text>
                          {selectedTopics.includes(topic.id) && (
                            <Icon name="check-circle" size={20} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                  </View>

                  {/* Add Topics from Other Courses Button */}
                  <TouchableOpacity
                    style={[styles.topicItem, { 
                      backgroundColor: colors.info + '10',
                      borderColor: colors.info,
                      borderStyle: 'dashed',
                      marginTop: 15,
                      justifyContent: 'center',
                      alignItems: 'center',
                      paddingVertical: 16,
                      flexDirection: 'row'
                    }]}
                    onPress={() => setShowCrossTopicPicker(true)}
                  >
                    <Icon name="school" size={18} color={colors.info} />
                    <Text style={[styles.topicItemText, { 
                      color: colors.info, 
                      marginLeft: 8,
                      fontWeight: '600'
                    }]}>
                      Diğer Derslerden Konu Ekle
                    </Text>
                    <Icon name="chevron-right" size={16} color={colors.info} style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>

                  {/* Study Time Selection */}
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Çalışma Süresi:
                  </Text>
                  <View style={styles.timeContainer}>
                    <Text style={[styles.timeLabel, { color: colors.textLight }]}>Dakika</Text>
                    <View style={styles.timeButtons}>
                      <TouchableOpacity
                        style={[styles.timeButton, { backgroundColor: colors.border }]}
                        onPress={() => {
                          const newValue = Math.max(15, studyTimeMinutes - 15);
                          setStudyTimeMinutes(newValue);
                          setStudyTimeInput(String(newValue));
                        }}
                      >
                        <Icon name="minus" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.timeValue, { 
                          backgroundColor: colors.backgroundLight, 
                          color: colors.text,
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: 8,
                          paddingHorizontal: 12,
                          textAlign: 'center',
                          minWidth: 80
                        }]}
                        value={studyTimeInput}
                        onChangeText={(text) => {
                          setStudyTimeInput(text);
                          const minutes = parseInt(text, 10) || 0;
                          setStudyTimeMinutes(Math.max(0, minutes));
                        }}
                        keyboardType="numeric"
                        placeholder="60"
                        placeholderTextColor={colors.textMuted}
                      />
                      <TouchableOpacity
                        style={[styles.timeButton, { backgroundColor: colors.border }]}
                        onPress={() => {
                          const newValue = studyTimeMinutes + 15;
                          setStudyTimeMinutes(newValue);
                          setStudyTimeInput(String(newValue));
                        }}
                      >
                        <Icon name="plus" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.timeLabel, { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 5 }]}>
                      {Math.floor(studyTimeMinutes / 60) > 0 
                        ? `${Math.floor(studyTimeMinutes / 60)} saat ${studyTimeMinutes % 60} dakika`
                        : `${studyTimeMinutes} dakika`
                      }
                    </Text>
                  </View>

                  {/* Question Count */}
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Soru Sayısı:
                  </Text>
                  <View style={styles.questionContainer}>
                    <TouchableOpacity
                      style={[styles.timeButton, { backgroundColor: colors.border }]}
                      onPress={() => {
                        const newValue = Math.max(0, questionCount - 5);
                        setQuestionCount(newValue);
                        setQuestionInput(String(newValue));
                      }}
                    >
                      <Icon name="minus" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.questionValue, { 
                        backgroundColor: colors.backgroundLight, 
                        color: colors.text,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        textAlign: 'center',
                        minWidth: 80
                      }]}
                      value={questionInput}
                      onChangeText={(text) => {
                        setQuestionInput(text);
                        const count = parseInt(text, 10) || 0;
                        setQuestionCount(Math.max(0, count));
                      }}
                      keyboardType="numeric"
                      placeholder="10"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TouchableOpacity
                      style={[styles.timeButton, { backgroundColor: colors.border }]}
                      onPress={() => {
                        const newValue = questionCount + 5;
                        setQuestionCount(newValue);
                        setQuestionInput(String(newValue));
                      }}
                    >
                      <Icon name="plus" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.border }]}
                onPress={() => setShowGoalModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textMuted }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={saveDailyGoal}
              >
                <Text style={styles.modalButtonText}>Hedef Oluştur</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Study Log Modal */}
      <Modal
        visible={showLogModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLogModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                📝 Çalışma Kaydet
              </Text>
              <TouchableOpacity onPress={() => setShowLogModal(false)}>
                <Icon name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Study Section */}
              <View style={styles.logSection}>
                <Text style={[styles.logSectionTitle, { color: colors.text }]}>📚 Çalışma</Text>
                
                {/* Study Time */}
                <View style={styles.logInputGroup}>
                  <Text style={[styles.logLabel, { color: colors.textLight }]}>Çalışma Süresi (dakika)</Text>
                  <View style={styles.inputWithButtons}>
                    <TouchableOpacity 
                      style={[styles.counterButton, { backgroundColor: colors.border }]}
                      onPress={() => {
                        const newValue = Math.max(0, logStudyMinutes - 15);
                        setLogStudyMinutes(newValue);
                        setStudyMinutesInput(String(newValue));
                      }}
                    >
                      <Icon name="minus" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.numberInput, { backgroundColor: colors.backgroundLight, color: colors.text }]}
                      value={studyMinutesInput}
                      onChangeText={(text) => {
                        setStudyMinutesInput(text);
                        const num = parseInt(text, 10) || 0;
                        setLogStudyMinutes(Math.max(0, num));
                      }}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TouchableOpacity 
                      style={[styles.counterButton, { backgroundColor: colors.border }]}
                      onPress={() => {
                        const newValue = logStudyMinutes + 15;
                        setLogStudyMinutes(newValue);
                        setStudyMinutesInput(String(newValue));
                      }}
                    >
                      <Icon name="plus" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Study Topics from Daily Goal */}
                {todayGoals.length > 0 && todayGoals[0]?.selectedTopics.length > 0 && (
                  <View style={styles.logInputGroup}>
                    <Text style={[styles.logLabel, { color: colors.textLight }]}>Günlük Hedef Konuları</Text>
                    <View style={styles.topicsContainer}>
                      {todayGoals[0].selectedTopics.map((topicId) => {
                        const topic = courses.flatMap(c => c.topics).find(t => t.id === topicId);
                        return topic ? (
                          <TouchableOpacity
                            key={topicId}
                            style={[
                              styles.topicItem,
                              { 
                                backgroundColor: logStudyTopics.includes(topicId) ? colors.primary + '20' : colors.backgroundLight,
                                borderColor: logStudyTopics.includes(topicId) ? colors.primary : colors.border
                              }
                            ]}
                            onPress={() => {
                              if (logStudyTopics.includes(topicId)) {
                                setLogStudyTopics(logStudyTopics.filter(id => id !== topicId));
                              } else {
                                setLogStudyTopics([...logStudyTopics, topicId]);
                              }
                            }}
                          >
                            <Icon 
                              name={logStudyTopics.includes(topicId) ? "checkbox-marked" : "checkbox-blank-outline"} 
                              size={20} 
                              color={logStudyTopics.includes(topicId) ? colors.primary : colors.textMuted} 
                            />
                            <Text style={[styles.topicItemText, { color: colors.text }]}>{topic.name}</Text>
                          </TouchableOpacity>
                        ) : null;
                      })}
                    </View>
                  </View>
                )}

                {/* Custom Study Topics */}
                <View style={styles.logInputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.logLabel, { color: colors.textLight }]}>Özel Konu Ekle</Text>
                    <TouchableOpacity 
                      style={[styles.addButton, { backgroundColor: colors.secondary }]}
                      onPress={() => setShowCustomStudyPicker(true)}
                    >
                      <Icon name="plus" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                  {customStudyTopics.map((item, index) => (
                    <View key={index} style={[styles.customTopicItem, { backgroundColor: colors.backgroundLight }]}>
                      <Text style={[styles.customTopicText, { color: colors.text }]}>{item.topicName}</Text>
                      <TouchableOpacity onPress={() => setCustomStudyTopics(customStudyTopics.filter((_, i) => i !== index))}>
                        <Icon name="close" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>

              {/* Video Section */}
              <View style={styles.logSection}>
                <Text style={[styles.logSectionTitle, { color: colors.text }]}>🎥 Video</Text>
                
                {/* Video Time */}
                <View style={styles.logInputGroup}>
                  <Text style={[styles.logLabel, { color: colors.textLight }]}>Video Süresi (dakika)</Text>
                  <View style={styles.inputWithButtons}>
                    <TouchableOpacity 
                      style={[styles.counterButton, { backgroundColor: colors.border }]}
                      onPress={() => {
                        const newValue = Math.max(0, logVideoMinutes - 5);
                        setLogVideoMinutes(newValue);
                        setVideoMinutesInput(String(newValue));
                      }}
                    >
                      <Icon name="minus" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.numberInput, { backgroundColor: colors.backgroundLight, color: colors.text }]}
                      value={videoMinutesInput}
                      onChangeText={(text) => {
                        setVideoMinutesInput(text);
                        const num = parseInt(text, 10) || 0;
                        setLogVideoMinutes(Math.max(0, num));
                      }}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TouchableOpacity 
                      style={[styles.counterButton, { backgroundColor: colors.border }]}
                      onPress={() => {
                        const newValue = logVideoMinutes + 5;
                        setLogVideoMinutes(newValue);
                        setVideoMinutesInput(String(newValue));
                      }}
                    >
                      <Icon name="plus" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Video Topics from Daily Goal */}
                {todayGoals.length > 0 && todayGoals[0]?.selectedTopics.length > 0 && (
                  <View style={styles.logInputGroup}>
                    <Text style={[styles.logLabel, { color: colors.textLight }]}>Günlük Hedef Konuları (Video)</Text>
                    <View style={styles.topicsContainer}>
                      {todayGoals[0].selectedTopics.map((topicId) => {
                        const topic = courses.flatMap(c => c.topics).find(t => t.id === topicId);
                        return topic ? (
                          <TouchableOpacity
                            key={topicId}
                            style={[
                              styles.topicItem,
                              { 
                                backgroundColor: logVideoTopics.includes(topicId) ? colors.secondary + '20' : colors.backgroundLight,
                                borderColor: logVideoTopics.includes(topicId) ? colors.secondary : colors.border
                              }
                            ]}
                            onPress={() => {
                              if (logVideoTopics.includes(topicId)) {
                                setLogVideoTopics(logVideoTopics.filter(id => id !== topicId));
                              } else {
                                setLogVideoTopics([...logVideoTopics, topicId]);
                              }
                            }}
                          >
                            <Icon 
                              name={logVideoTopics.includes(topicId) ? "checkbox-marked" : "checkbox-blank-outline"} 
                              size={20} 
                              color={logVideoTopics.includes(topicId) ? colors.secondary : colors.textMuted} 
                            />
                            <Text style={[styles.topicItemText, { color: colors.text }]}>{topic.name}</Text>
                          </TouchableOpacity>
                        ) : null;
                      })}
                    </View>
                  </View>
                )}

                {/* Custom Video Topics */}
                <View style={styles.logInputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.logLabel, { color: colors.textLight }]}>Özel Video Konusu</Text>
                    <TouchableOpacity 
                      style={[styles.addButton, { backgroundColor: colors.info }]}
                      onPress={() => setShowCustomVideoPicker(true)}
                    >
                      <Icon name="plus" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                  {customVideoTopics.map((item, index) => (
                    <View key={index} style={[styles.customTopicItem, { backgroundColor: colors.backgroundLight }]}>
                      <Text style={[styles.customTopicText, { color: colors.text }]}>{item.topicName}</Text>
                      <TouchableOpacity onPress={() => setCustomVideoTopics(customVideoTopics.filter((_, i) => i !== index))}>
                        <Icon name="close" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>

              {/* Questions Section */}
              <View style={styles.logSection}>
                <Text style={[styles.logSectionTitle, { color: colors.text }]}>❓ Sorular</Text>
                
                {/* Question Count */}
                <View style={styles.logInputGroup}>
                  <Text style={[styles.logLabel, { color: colors.textLight }]}>Çözülen Soru Sayısı</Text>
                  <View style={styles.inputWithButtons}>
                    <TouchableOpacity 
                      style={[styles.counterButton, { backgroundColor: colors.border }]}
                      onPress={() => {
                        const newValue = Math.max(0, logQuestionCount - 5);
                        setLogQuestionCount(newValue);
                        setQuestionCountInput(String(newValue));
                      }}
                    >
                      <Icon name="minus" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.numberInput, { backgroundColor: colors.backgroundLight, color: colors.text }]}
                      value={questionCountInput}
                      onChangeText={(text) => {
                        setQuestionCountInput(text);
                        const num = parseInt(text, 10) || 0;
                        setLogQuestionCount(Math.max(0, num));
                      }}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TouchableOpacity 
                      style={[styles.counterButton, { backgroundColor: colors.border }]}
                      onPress={() => {
                        const newValue = logQuestionCount + 5;
                        setLogQuestionCount(newValue);
                        setQuestionCountInput(String(newValue));
                      }}
                    >
                      <Icon name="plus" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Custom Questions from Other Courses */}
                <View style={styles.logInputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.logLabel, { color: colors.textLight }]}>Diğer Derslerden Sorular</Text>
                    <TouchableOpacity 
                      style={[styles.addButton, { backgroundColor: colors.success }]}
                      onPress={() => setShowCustomQuestionPicker(true)}
                    >
                      <Icon name="plus" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                  {customQuestions.map((item, index) => {
                    const course = courses.find(c => c.id === item.courseId);
                    return (
                      <View key={index} style={[styles.customTopicItem, { backgroundColor: colors.backgroundLight }]}>
                        <Text style={[styles.customTopicText, { color: colors.text }]}>
                          {course?.name}: {item.count} soru
                        </Text>
                        <TouchableOpacity onPress={() => setCustomQuestions(customQuestions.filter((_, i) => i !== index))}>
                          <Icon name="close" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.border }]}
                onPress={() => setShowLogModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textMuted }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={saveStudyLog}
              >
                <Text style={styles.modalButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Study Topic Picker Modal */}
      <Modal
        visible={showCustomStudyPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomStudyPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>📚 Özel Çalışma Konusu Seç</Text>
              <TouchableOpacity onPress={() => setShowCustomStudyPicker(false)}>
                <Icon name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {courses.map((course) => (
                <View key={course.id} style={styles.courseSection}>
                  <Text style={[styles.courseSectionTitle, { color: course.color }]}>{course.name}</Text>
                  {course.topics.map((topic) => (
                    <TouchableOpacity
                      key={topic.id}
                      style={[styles.topicSelectItem, { backgroundColor: colors.backgroundLight }]}
                      onPress={() => {
                        const newTopic = { topicName: topic.name, courseId: course.id };
                        if (!customStudyTopics.find(t => t.topicName === topic.name && t.courseId === course.id)) {
                          setCustomStudyTopics([...customStudyTopics, newTopic]);
                        }
                        setShowCustomStudyPicker(false);
                      }}
                    >
                      <Text style={[styles.topicSelectText, { color: colors.text }]}>{topic.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Video Topic Picker Modal */}
      <Modal
        visible={showCustomVideoPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomVideoPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>🎥 Özel Video Konusu Seç</Text>
              <TouchableOpacity onPress={() => setShowCustomVideoPicker(false)}>
                <Icon name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {courses.map((course) => (
                <View key={course.id} style={styles.courseSection}>
                  <Text style={[styles.courseSectionTitle, { color: course.color }]}>{course.name}</Text>
                  {course.topics.map((topic) => (
                    <TouchableOpacity
                      key={topic.id}
                      style={[styles.topicSelectItem, { backgroundColor: colors.backgroundLight }]}
                      onPress={() => {
                        const newTopic = { topicName: topic.name, courseId: course.id };
                        if (!customVideoTopics.find(t => t.topicName === topic.name && t.courseId === course.id)) {
                          setCustomVideoTopics([...customVideoTopics, newTopic]);
                        }
                        setShowCustomVideoPicker(false);
                      }}
                    >
                      <Text style={[styles.topicSelectText, { color: colors.text }]}>{topic.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Question Picker Modal */}
      <Modal
        visible={showCustomQuestionPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomQuestionPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>❓ Diğer Derslerden Soru Ekle</Text>
              <TouchableOpacity onPress={() => setShowCustomQuestionPicker(false)}>
                <Icon name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {courses.map((course) => (
                <TouchableOpacity
                  key={course.id}
                  style={[styles.courseSelectItem, { backgroundColor: colors.backgroundLight, borderLeftColor: course.color }]}
                  onPress={() => {
                    const existingQuestion = customQuestions.find(q => q.courseId === course.id);
                    if (existingQuestion) {
                      setCustomQuestions(customQuestions.map(q => 
                        q.courseId === course.id ? { ...q, count: q.count + 5 } : q
                      ));
                    } else {
                      setCustomQuestions([...customQuestions, { courseId: course.id, count: 5 }]);
                    }
                    setShowCustomQuestionPicker(false);
                  }}
                >
                  <Icon name={course.icon} size={24} color={course.color} />
                  <Text style={[styles.courseSelectText, { color: colors.text }]}>{course.name}</Text>
                  <Text style={[styles.courseSelectCount, { color: colors.textLight }]}>
                    +5 soru
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Study Logs Viewer Modal */}
      <Modal
        visible={showLogViewerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLogViewerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                📊 Günlük Çalışma Kayıtları
              </Text>
              <TouchableOpacity 
                onPress={() => setShowLogViewerModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedDateLogs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="calendar-remove" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                    Bu tarih için çalışma kaydı bulunamadı
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.logViewHeaderText, { color: colors.textLight }]}>
                    {selectedDateLogs.length} kayıt bulundu
                  </Text>
                  {selectedDateLogs.map((log, index) => (
                    <View key={log.id} style={[styles.logViewCard, { backgroundColor: colors.backgroundLight }]}>
                      <View style={[styles.logViewIndexContainer, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.logViewIndexText]}>
                          Kayıt #{selectedDateLogs.length - index}
                        </Text>
                      </View>
                      
                      <View style={styles.logViewHeader}>
                        <View>
                          <Text style={[styles.logViewDate, { color: colors.text }]}>
                            {log.date}
                          </Text>
                          <Text style={[styles.logViewTime, { color: colors.textMuted }]}>
                            {log.createdAt ? 
                              new Date(log.createdAt).toLocaleTimeString('tr-TR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }) : 
                              'Saat bilgisi yok'
                            }
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            Alert.alert(
                              'Kaydı Sil',
                              'Bu çalışma kaydını silmek istediğinizden emin misiniz?',
                              [
                                { text: 'İptal', style: 'cancel' },
                                { 
                                  text: 'Sil', 
                                  style: 'destructive',
                                  onPress: () => {
                                    deleteStudyLog(log.id);
                                    setShowLogViewerModal(false);
                                  }
                                }
                              ]
                            );
                          }}
                          style={styles.deleteLogButton}
                        >
                          <Icon name="delete" size={18} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    
                    <View style={[styles.logViewStats, { backgroundColor: colors.background }]}>
                      <View style={styles.logViewStat}>
                        <View style={[styles.logViewStatIcon, { backgroundColor: colors.primary + '20' }]}>
                          <Icon name="clock" size={16} color={colors.primary} />
                        </View>
                        <Text style={[styles.logViewStatText, { color: colors.text }]}>
                          {log.studyMinutes}
                        </Text>
                        <Text style={[styles.logViewStatLabel, { color: colors.textMuted }]}>
                          dk çalışma
                        </Text>
                      </View>
                      <View style={styles.logViewStat}>
                        <View style={[styles.logViewStatIcon, { backgroundColor: colors.secondary + '20' }]}>
                          <Icon name="video" size={16} color={colors.secondary} />
                        </View>
                        <Text style={[styles.logViewStatText, { color: colors.text }]}>
                          {log.videoMinutes}
                        </Text>
                        <Text style={[styles.logViewStatLabel, { color: colors.textMuted }]}>
                          dk video
                        </Text>
                      </View>
                      <View style={styles.logViewStat}>
                        <View style={[styles.logViewStatIcon, { backgroundColor: colors.success + '20' }]}>
                          <Icon name="help-circle" size={16} color={colors.success} />
                        </View>
                        <Text style={[styles.logViewStatText, { color: colors.text }]}>
                          {log.questionCount}
                        </Text>
                        <Text style={[styles.logViewStatLabel, { color: colors.textMuted }]}>
                          soru
                        </Text>
                      </View>
                    </View>

                    {(log.studyTopics.length > 0 || log.customStudyTopics.length > 0) && (
                      <View style={[styles.logViewTopics, { borderTopColor: colors.border }]}>
                        <Text style={[styles.logViewTopicsTitle, { color: colors.text }]}>
                          📚 Çalışılan Konular
                        </Text>
                        <View style={styles.logViewTopicsRow}>
                          {log.studyTopics.map((topicId, topicIndex) => {
                            const topic = courses.flatMap(c => c.topics).find(t => t.id === topicId);
                            return topic ? (
                              <Text key={topicIndex} style={[styles.logViewTopicText, { backgroundColor: colors.primary + '15', color: colors.primary }]}>
                                {topic.name}
                              </Text>
                            ) : null;
                          })}
                          {log.customStudyTopics.map((customTopic, customIndex) => (
                            <Text key={`custom-${customIndex}`} style={[styles.logViewTopicText, { backgroundColor: colors.secondary + '15', color: colors.secondary }]}>
                              {customTopic.topicName}
                            </Text>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* All Study Logs Modal */}
      <Modal
        visible={showAllLogsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAllLogsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                📈 Tüm Çalışma Kayıtları
              </Text>
              <TouchableOpacity 
                onPress={() => setShowAllLogsModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {allStudyLogs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="calendar-remove" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                    Henüz çalışma kaydı bulunamadı
                  </Text>
                </View>
              ) : (
                [...allStudyLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((log) => (
                  <View key={log.id} style={[styles.logViewCard, { backgroundColor: colors.backgroundLight }]}>
                    <View style={styles.logViewHeader}>
                      <Text style={[styles.logViewDate, { color: colors.text }]}>
                        {new Date(log.date).toLocaleDateString('tr-TR')}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            'Kaydı Sil',
                            'Bu çalışma kaydını silmek istediğinizden emin misiniz?',
                            [
                              { text: 'İptal', style: 'cancel' },
                              { 
                                text: 'Sil', 
                                style: 'destructive',
                                onPress: () => deleteStudyLog(log.id)
                              }
                            ]
                          );
                        }}
                        style={[styles.deleteLogButton, { backgroundColor: colors.danger }]}
                      >
                        <Icon name="delete" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.logViewStats}>
                      <View style={styles.logViewStat}>
                        <Icon name="clock" size={16} color={colors.primary} />
                        <Text style={[styles.logViewStatText, { color: colors.text }]}>
                          {log.studyMinutes} dk çalışma
                        </Text>
                      </View>
                      <View style={styles.logViewStat}>
                        <Icon name="video" size={16} color={colors.secondary} />
                        <Text style={[styles.logViewStatText, { color: colors.text }]}>
                          {log.videoMinutes} dk video
                        </Text>
                      </View>
                      <View style={styles.logViewStat}>
                        <Icon name="help-circle" size={16} color={colors.success} />
                        <Text style={[styles.logViewStatText, { color: colors.text }]}>
                          {log.questionCount} soru
                        </Text>
                      </View>
                    </View>

                    {(log.studyTopics.length > 0 || log.customStudyTopics.length > 0) && (
                      <View style={styles.logViewTopics}>
                        <Text style={[styles.logViewTopicsTitle, { color: colors.textLight }]}>
                          Çalışılan Konular:
                        </Text>
                        {log.studyTopics.map((topicId, index) => {
                          const topic = courses.flatMap(c => c.topics).find(t => t.id === topicId);
                          return topic ? (
                            <Text key={index} style={[styles.logViewTopicText, { color: colors.text }]}>
                              • {topic.name}
                            </Text>
                          ) : null;
                        })}
                        {log.customStudyTopics.map((customTopic, index) => (
                          <Text key={`custom-${index}`} style={[styles.logViewTopicText, { color: colors.text }]}>
                            • {customTopic.topicName}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Schedule Edit Modal */}
      <Modal
        visible={showScheduleEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowScheduleEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Günü Düzenle</Text>
              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: colors.danger }]}
                onPress={() => setShowScheduleEditModal(false)}
              >
                <Icon name="close" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {/* Day Selection Dropdown */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Hangi Günü Düzenlemek İstiyorsunuz?</Text>
                <View style={[styles.dropdownContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayDropdown}>
                    {defaultWeeklySchedule.map((dayOption) => (
                      <TouchableOpacity
                        key={dayOption.day}
                        style={[
                          styles.dayOption,
                          editDayName === dayOption.day ? styles.dayOptionSelected : styles.dayOptionUnselected,
                          { 
                            borderColor: editDayName === dayOption.day ? colors.primary : colors.border
                          }
                        ]}
                        onPress={() => setEditDayName(dayOption.day)}
                      >
                        <Icon name={dayOption.icon} size={20} color={editDayName === dayOption.day ? 'white' : colors.textLight} />
                        <Text style={[
                          styles.dayOptionText, 
                          editDayName === dayOption.day ? styles.dayTextSelected : styles.dayTextUnselected,
                          editDayName === dayOption.day ? styles.boldText : styles.normalText
                        ]}>
                          {dayOption.day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Subject Name Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Ders Adı</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: colors.background, 
                    color: colors.text,
                    borderColor: colors.border 
                  }]}
                  value={editSubjectName}
                  onChangeText={setEditSubjectName}
                  placeholder="Özel ders adı girin veya aşağıdan seçin"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              {/* Course Selection */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Veya Ders Seçin</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courseSelector}>
                  {courses.map((course) => (
                    <TouchableOpacity
                      key={course.id}
                      style={[
                        styles.courseOption,
                        { 
                          backgroundColor: editSelectedCourse.id === course.id ? course.color + '20' : colors.background,
                          borderColor: editSelectedCourse.id === course.id ? course.color : colors.border
                        }
                      ]}
                      onPress={() => {
                        setEditSelectedCourse(course);
                        setEditSubjectName(''); // Clear custom name when selecting a course
                      }}
                    >
                      <Icon name={course.icon} size={24} color={course.color} />
                      <Text style={[
                        styles.courseOptionText, 
                        { 
                          color: editSelectedCourse.id === course.id ? course.color : colors.text,
                        },
                        editSelectedCourse.id === course.id ? styles.boldText : styles.normalText
                      ]}>
                        {course.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.textMuted }]}
                onPress={() => setShowScheduleEditModal(false)}
              >
                <Text style={styles.modalButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.success }]}
                onPress={saveScheduleChanges}
              >
                <Text style={styles.modalButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cross-Course Topic Picker Modal */}
      <Modal
        visible={showCrossTopicPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCrossTopicPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>📚 Diğer Derslerden Konu Seç</Text>
              <TouchableOpacity onPress={() => setShowCrossTopicPicker(false)}>
                <Icon name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {courses.filter(course => course.name !== todaySubject?.subject).map((course) => (
                <View key={course.id} style={styles.courseSection}>
                  <Text style={[styles.courseSectionTitle, { color: course.color }]}>{course.name}</Text>
                  {course.topics.map((topic) => (
                    <TouchableOpacity
                      key={topic.id}
                      style={[
                        styles.topicSelectItem, 
                        { 
                          backgroundColor: selectedTopics.includes(topic.id) ? course.color + '20' : colors.backgroundLight,
                          borderColor: selectedTopics.includes(topic.id) ? course.color : colors.border
                        }
                      ]}
                      onPress={() => toggleTopicSelection(topic.id)}
                    >
                      <Icon 
                        name={selectedTopics.includes(topic.id) ? "checkbox-marked" : "checkbox-blank-outline"} 
                        size={20} 
                        color={selectedTopics.includes(topic.id) ? course.color : colors.textMuted} 
                      />
                      <Text style={[styles.topicSelectText, { color: colors.text }]}>{topic.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.border }]}
                onPress={() => setShowCrossTopicPicker(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textMuted }]}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Weekly Schedule
const defaultWeeklySchedule = [
  { day: 'Pazartesi', subject: 'Matematik', icon: 'calculator', color: '#FF6B35' },
  { day: 'Salı', subject: 'Türkçe', icon: 'book-open', color: '#2E8B57' },
  { day: 'Çarşamba', subject: 'Tarih', icon: 'history', color: '#8B4513' },
  { day: 'Perşembe', subject: 'Coğrafya', icon: 'earth', color: '#4682B4' },
  { day: 'Cuma', subject: 'Vatandaşlık', icon: 'account-group', color: '#9932CC' },
  { day: 'Cumartesi', subject: 'Genel Kültür', icon: 'lightbulb', color: '#FF1493' },
  { day: 'Pazar', subject: 'Deneme Sınavı', icon: 'clipboard-text', color: '#FF4500' },
];

// Default Courses Data
const defaultCourses: Course[] = [
  {
    id: '1',
    name: 'Türkçe',
    icon: 'book-open',
    color: '#2E8B57',
    topics: [
      { id: '1-1', name: 'Sözcükte Anlam', courseId: '1', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '1-2', name: 'Cümlede Anlam', courseId: '1', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '1-3', name: 'Paragrafta Anlam', courseId: '1', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '1-4', name: 'Ses Bilgisi', courseId: '1', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '1-5', name: 'Yapı Bilgisi', courseId: '1', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '1-6', name: 'Sözcük Türleri', courseId: '1', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '1-7', name: 'Cümle Bilgisi', courseId: '1', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '1-8', name: 'Yazım Kuralları', courseId: '1', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '1-9', name: 'Noktalama İşaretleri', courseId: '1', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '1-10', name: 'Anlatım Bozuklukları', courseId: '1', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
    ],
    totalTopics: 10,
    completedTopics: 0,
  },
  {
    id: '2',
    name: 'Matematik',
    icon: 'calculator',
    color: '#FF6B35',
    topics: [
      { id: '2-1', name: 'Temel Kavramlar', courseId: '2', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '2-2', name: 'Sayılar', courseId: '2', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '2-3', name: 'Ebob - Ekok', courseId: '2', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '2-4', name: 'Asal Çarpanlara Ayırma', courseId: '2', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '2-5', name: 'Denklemler', courseId: '2', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '2-6', name: 'Rasyonel Sayılar', courseId: '2', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '2-7', name: 'Eşitsizlik - Mutlak Değer', courseId: '2', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '2-8', name: 'Üslü Sayılar', courseId: '2', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '2-9', name: 'Köklü Sayılar', courseId: '2', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '2-10', name: 'Çarpanlara Ayırma', courseId: '2', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '2-11', name: 'Oran - Orantı', courseId: '2', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '2-12', name: 'Problemler', courseId: '2', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '2-13', name: 'Kümeler', courseId: '2', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '2-14', name: 'İşlem - Modüler Aritmetik', courseId: '2', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '2-15', name: 'Permütasyon - Kombinasyon - Olasılık', courseId: '2', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '2-16', name: 'Tablo ve Grafikler', courseId: '2', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '2-17', name: 'Sayısal Mantık', courseId: '2', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
    ],
    totalTopics: 17,
    completedTopics: 0,
  },
  {
    id: '3',
    name: 'Geometri',
    icon: 'shape',
    color: '#9932CC',
    topics: [
      { id: '3-1', name: 'Geometrik Kavramlar Ve Doğruda Açılar', courseId: '3', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '3-2', name: 'Çokgenler Ve Dörtgenler', courseId: '3', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '3-3', name: 'Çember Ve Daire', courseId: '3', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '3-4', name: 'Analitik Geometri', courseId: '3', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '3-5', name: 'Katı Cisimler', courseId: '3', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
    ],
    totalTopics: 5,
    completedTopics: 0,
  },
  {
    id: '4',
    name: 'Tarih',
    icon: 'history',
    color: '#8B4513',
    topics: [
      { id: '4-1', name: 'İslamiyet Öncesi Türk Tarihi', courseId: '4', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '4-2', name: 'İlk Türk - İslam Devletleri ve Beylikleri', courseId: '4', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '4-3', name: 'Osmanlı Devleti Kuruluş ve Yükselme Dönemleri', courseId: '4', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '4-4', name: 'Osmanlı Devleti\'nde Kültür ve Uygarlık', courseId: '4', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '4-5', name: 'XVII. Yüzyılda Osmanlı Devleti (Duraklama Dönemi)', courseId: '4', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '4-6', name: 'XVIII. Yüzyılda Osmanlı Devleti (Gerileme Dönemi)', courseId: '4', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '4-7', name: 'XIX. Yüzyılda Osmanlı Devleti (Dağılma Dönemi)', courseId: '4', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '4-8', name: 'XX. Yüzyılda Osmanlı Devleti', courseId: '4', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '4-9', name: 'Kurtuluş Savaşı Hazırlık Dönemi', courseId: '4', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '4-10', name: 'I. TBMM Dönemi', courseId: '4', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '4-11', name: 'Kurtuluş Savaşı Muharebeler Dönemi', courseId: '4', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '4-12', name: 'Atatürk İnkılapları', courseId: '4', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '4-13', name: 'Atatürk İlkeleri', courseId: '4', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '4-14', name: 'Partiler ve Partileşme Dönemi (İç Politika)', courseId: '4', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '4-15', name: 'Atatürk Dönemi Türk Dış Politikası', courseId: '4', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '4-16', name: 'Atatürk Sonrası Dönem', courseId: '4', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '4-17', name: 'Atatürk\'ün Hayatı ve Kişiliği', courseId: '4', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
    ],
    totalTopics: 17,
    completedTopics: 0,
  },
  {
    id: '5',
    name: 'Coğrafya',
    icon: 'earth',
    color: '#4682B4',
    topics: [
      { id: '5-1', name: 'Türkiye\'nin Coğrafi Konumu', courseId: '5', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '5-2', name: 'Türkiye\'nin Yerşekilleri ve Özellikleri', courseId: '5', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '5-3', name: 'Türkiye\'nin İklimi ve Bitki Örtüsü', courseId: '5', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '5-4', name: 'Türkiye\'de Nüfus ve Yerleşme', courseId: '5', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '5-5', name: 'Türkiye\'de Tarım, Hayvancılık ve Ormancılık', courseId: '5', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '5-6', name: 'Türkiye\'de Madenler, Enerji Kaynakları ve Sanayi', courseId: '5', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '5-7', name: 'Türkiye\'de Ulaşım, Ticaret ve Turizm', courseId: '5', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '5-8', name: 'Türkiye\'nin Coğrafi Bölgeleri', courseId: '5', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
    ],
    totalTopics: 8,
    completedTopics: 0,
  },
  {
    id: '6',
    name: 'Vatandaşlık',
    icon: 'account-group',
    color: '#DC3545',
    topics: [
      { id: '6-1', name: 'Hukukun Temel Kavramları', courseId: '6', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '6-2', name: 'Devlet Biçimleri Demokrasi Ve Kuvvetler Ayrılığı', courseId: '6', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '6-3', name: 'Anayasa Hukukuna Giriş Temel Kavramlar Ve Türk Anayasa Tarihi', courseId: '6', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '6-4', name: '1982 Anayasasının Temel İlkeleri', courseId: '6', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '6-5', name: 'Yasama', courseId: '6', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '6-6', name: 'Yürütme', courseId: '6', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '6-7', name: 'Yargı', courseId: '6', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '6-8', name: 'Temel Hak Ve Hürriyetler', courseId: '6', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '6-9', name: 'İdare Hukuku', courseId: '6', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '6-10', name: 'Uluslararası Kuruluşlar Ve Güncel Olaylar', courseId: '6', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
      { id: '6-11', name: '1982 Anayasası Tam Metni', courseId: '6', completion: { konu: false, video: false, soru: false, tamamlandi: false }, notes: '' },
    ],
    totalTopics: 11,
    completedTopics: 0,
  },
];

// Courses Screen Component (formerly Progress Screen)
function CoursesScreen() {
  const [courses, setCourses] = useState<Course[]>(defaultCourses);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [topicManagementModal, setTopicManagementModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [isEditingTopic, setIsEditingTopic] = useState(false);

  // Load courses data
  const loadCoursesData = async () => {
    try {
      const coursesData = await AsyncStorage.getItem('courses');
      if (coursesData) {
        setCourses(JSON.parse(coursesData));
      } else {
        // Initialize with default courses
        await AsyncStorage.setItem('courses', JSON.stringify(defaultCourses));
        setCourses(defaultCourses);
      }
    } catch (error) {
      console.log('Error loading courses:', error);
      setCourses(defaultCourses);
    }
  };

  // Save courses data
  const saveCoursesData = async (updatedCourses: Course[]) => {
    try {
      await AsyncStorage.setItem('courses', JSON.stringify(updatedCourses));
      setCourses(updatedCourses);
      
      // Update selectedCourse if it exists
      if (selectedCourse) {
        const updatedSelectedCourse = updatedCourses.find(course => course.id === selectedCourse.id);
        if (updatedSelectedCourse) {
          setSelectedCourse(updatedSelectedCourse);
        }
      }
    } catch (error) {
      console.log('Error saving courses:', error);
    }
  };

  // Toggle completion state
  const toggleCompletion = async (courseId: string, topicId: string, type: 'konu' | 'video' | 'soru' | 'tamamlandi') => {
    const updatedCourses = courses.map(course => {
      if (course.id === courseId) {
        const updatedTopics = course.topics.map(topic => {
          if (topic.id === topicId) {
            const newCompletion = {
              ...topic.completion,
              [type]: !topic.completion[type]
            };
            
            // Auto-check "tamamlandi" if all others are checked
            if (type !== 'tamamlandi' && newCompletion.konu && newCompletion.video && newCompletion.soru) {
              newCompletion.tamamlandi = true;
            }
            
            // Auto-uncheck "tamamlandi" if any other is unchecked
            if (type !== 'tamamlandi' && !newCompletion[type]) {
              newCompletion.tamamlandi = false;
            }

            return {
              ...topic,
              completion: newCompletion,
              lastStudied: new Date().toISOString(),
            };
          }
          return topic;
        });

        const completedTopics = updatedTopics.filter(t => t.completion.tamamlandi).length;

        return {
          ...course,
          topics: updatedTopics,
          completedTopics,
        };
      }
      return course;
    });

    await saveCoursesData(updatedCourses);
  };

  // Topic Management Functions
  const renameTopic = async (courseId: string, topicId: string, newName: string) => {
    if (!newName.trim()) return;
    
    const updatedCourses = courses.map(course => {
      if (course.id === courseId) {
        const updatedTopics = course.topics.map(topic => {
          if (topic.id === topicId) {
            return { ...topic, name: newName.trim() };
          }
          return topic;
        });
        return { ...course, topics: updatedTopics };
      }
      return course;
    });

    await saveCoursesData(updatedCourses);
  };

  const addTopic = async (courseId: string, topicName: string) => {
    if (!topicName.trim()) return;
    
    const updatedCourses = courses.map(course => {
      if (course.id === courseId) {
        const newTopicId = `${courseId}-${course.topics.length + 1}`;
        const newTopic: Topic = {
          id: newTopicId,
          name: topicName.trim(),
          courseId: courseId,
          completion: { konu: false, video: false, soru: false, tamamlandi: false },
          notes: ''
        };
        
        const updatedTopics = [...course.topics, newTopic];
        return {
          ...course,
          topics: updatedTopics,
          totalTopics: updatedTopics.length
        };
      }
      return course;
    });

    await saveCoursesData(updatedCourses);
  };

  const removeTopic = async (courseId: string, topicId: string) => {
    const updatedCourses = courses.map(course => {
      if (course.id === courseId) {
        const updatedTopics = course.topics.filter(topic => topic.id !== topicId);
        const completedTopics = updatedTopics.filter(t => t.completion.tamamlandi).length;
        
        return {
          ...course,
          topics: updatedTopics,
          totalTopics: updatedTopics.length,
          completedTopics: completedTopics
        };
      }
      return course;
    });

    await saveCoursesData(updatedCourses);
  };

  // Helper functions for topic management modal
  const openTopicManagementModal = (topic: Topic | null, isEditing = false) => {
    setSelectedTopic(topic);
    setNewTopicName(isEditing && topic ? topic.name : '');
    setIsEditingTopic(isEditing);
    setTopicManagementModal(true);
  };

  const handleTopicManagement = async () => {
    if (!selectedCourse) return;

    if (isEditingTopic && selectedTopic) {
      // Rename topic
      await renameTopic(selectedCourse.id, selectedTopic.id, newTopicName);
    } else {
      // Add new topic
      await addTopic(selectedCourse.id, newTopicName);
    }

    setTopicManagementModal(false);
    setSelectedTopic(null);
    setNewTopicName('');
    setIsEditingTopic(false);
  };

  const handleRemoveTopic = async () => {
    if (!selectedTopic || !selectedCourse) return;

    await removeTopic(selectedCourse.id, selectedTopic.id);
    setTopicManagementModal(false);
    setSelectedTopic(null);
    setNewTopicName('');
    setIsEditingTopic(false);
  };

  useEffect(() => {
    loadCoursesData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCoursesData();
    setRefreshing(false);
  };

  const getTotalProgress = () => {
    const totalTopics = courses.reduce((sum, course) => sum + course.totalTopics, 0);
    const completedTopics = courses.reduce((sum, course) => sum + course.completedTopics, 0);
    return totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
  };

  if (selectedCourse) {
    // Topic Detail View with Table Layout
    return (
      <View style={styles.container}>
        <View style={[styles.modernHeader, { backgroundColor: selectedCourse.color }]}>
          <View style={styles.headerGradientOverlay}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => setSelectedCourse(null)} style={styles.backButton}>
                <Icon name="arrow-left" size={24} color="white" />
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={styles.modernHeaderTitle}>{selectedCourse.name}</Text>
                <Text style={styles.modernHeaderSubtitle}>
                  {selectedCourse.completedTopics}/{selectedCourse.totalTopics} Konu Tamamlandı
                </Text>
              </View>
              <View style={styles.headerStats}>
                <View style={styles.headerStatItem}>
                  <Text style={styles.headerStatNumber}>
                    {Math.round((selectedCourse.completedTopics / selectedCourse.totalTopics) * 100)}%
                  </Text>
                  <Text style={styles.headerStatLabel}>Tamamlandı</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.homeContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={selectedCourse.color}
              colors={[selectedCourse.color]}
            />
          }
        >
          {/* Table Header */}
          <View style={[styles.tableHeader, { backgroundColor: colors.cardSecondary }]}>
            <Text style={[styles.tableHeaderText, styles.topicNameColumn, { color: colors.text }]}>Konu Adı</Text>
            <Text style={[styles.tableHeaderText, styles.checkboxColumn, { color: colors.text }]}>Konu</Text>
            <Text style={[styles.tableHeaderText, styles.checkboxColumn, { color: colors.text }]}>Video</Text>
            <Text style={[styles.tableHeaderText, styles.checkboxColumn, { color: colors.text }]}>Soru</Text>
            <Text style={[styles.tableHeaderText, styles.checkboxColumn, { color: colors.text }]}>Bitir</Text>
          </View>

          {/* Topic Rows */}
          {selectedCourse.topics.map((topic, index) => (
            <View key={topic.id} style={[
              styles.tableRow, 
              { backgroundColor: index % 2 === 0 ? colors.card : colors.backgroundLight }
            ]}>
              <View style={[styles.topicNameColumn, styles.topicNameRow]}>
                <Text style={[styles.topicNameTextFlex, { color: colors.text }]} numberOfLines={2}>
                  {topic.name}
                </Text>
                <TouchableOpacity
                  style={styles.topicMenuButton}
                  onPress={() => openTopicManagementModal(topic, true)}
                >
                  <Icon name="dots-vertical" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              {/* Konu Checkbox */}
              <View style={styles.checkboxColumn}>
                <TouchableOpacity
                  style={styles.checkboxTouchArea}
                  onPress={() => toggleCompletion(selectedCourse.id, topic.id, 'konu')}
                >
                  <View style={[
                    styles.checkbox,
                    { backgroundColor: topic.completion.konu ? colors.primary : colors.border }
                  ]}>
                    {topic.completion.konu && (
                      <Icon name="check" size={12} color="white" />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Video Checkbox */}
              <View style={styles.checkboxColumn}>
                <TouchableOpacity
                  style={styles.checkboxTouchArea}
                  onPress={() => toggleCompletion(selectedCourse.id, topic.id, 'video')}
                >
                  <View style={[
                    styles.checkbox,
                    { backgroundColor: topic.completion.video ? colors.secondary : colors.border }
                  ]}>
                    {topic.completion.video && (
                      <Icon name="check" size={12} color="white" />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Soru Checkbox */}
              <View style={styles.checkboxColumn}>
                <TouchableOpacity
                  style={styles.checkboxTouchArea}
                  onPress={() => toggleCompletion(selectedCourse.id, topic.id, 'soru')}
                >
                  <View style={[
                    styles.checkbox,
                    { backgroundColor: topic.completion.soru ? colors.warning : colors.border }
                  ]}>
                    {topic.completion.soru && (
                      <Icon name="check" size={12} color="white" />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Tamamlandı Checkbox */}
              <View style={styles.checkboxColumn}>
                <TouchableOpacity
                  style={styles.checkboxTouchArea}
                  onPress={() => toggleCompletion(selectedCourse.id, topic.id, 'tamamlandi')}
                >
                  <View style={[
                    styles.checkbox,
                    { backgroundColor: topic.completion.tamamlandi ? colors.success : colors.border }
                  ]}>
                    {topic.completion.tamamlandi && (
                      <Icon name="check" size={12} color="white" />
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Add New Topic Button - Moved to end */}
          <TouchableOpacity
            style={[styles.addTopicButtonSmall, { backgroundColor: selectedCourse.color }]}
            onPress={() => openTopicManagementModal(null, false)}
          >
            <Icon name="plus" size={14} color="white" />
            <Text style={styles.addTopicButtonSmallText}>Yeni Konu Ekle</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Topic Management Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={topicManagementModal}
          onRequestClose={() => setTopicManagementModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.topicManagementModal, { backgroundColor: colors.card }]}>
              <View style={styles.topicModalHeader}>
                <View style={styles.topicModalTitleContainer}>
                  <Icon 
                    name={isEditingTopic ? "pencil" : "plus-circle"} 
                    size={24} 
                    color={selectedCourse?.color || colors.primary} 
                  />
                  <Text style={[styles.topicModalTitle, { color: colors.text }]}>
                    {isEditingTopic ? 'Konu Düzenle' : 'Yeni Konu Ekle'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.topicModalCloseButton, { backgroundColor: colors.border }]}
                  onPress={() => setTopicManagementModal(false)}
                >
                  <Icon name="close" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {selectedCourse && (
                <View style={[styles.topicModalCourseInfo, { backgroundColor: selectedCourse.color + '10' }]}>
                  <Icon name={selectedCourse.icon} size={20} color={selectedCourse.color} />
                  <Text style={[styles.topicModalCourseName, { color: selectedCourse.color }]}>
                    {selectedCourse.name}
                  </Text>
                </View>
              )}

              <View style={styles.topicModalBody}>
                <Text style={[styles.topicModalLabel, { color: colors.textLight }]}>
                  {isEditingTopic ? 'Konu Adını Düzenle' : 'Yeni Konu Adı'}
                </Text>
                <TextInput
                  style={[styles.topicModalTextInput, { 
                    backgroundColor: colors.backgroundLight, 
                    borderColor: colors.border,
                    color: colors.text
                  }]}
                  placeholder={isEditingTopic ? "Konu adını düzenle" : "Yeni konu adı girin"}
                  placeholderTextColor={colors.textMuted}
                  value={newTopicName}
                  onChangeText={setNewTopicName}
                  autoFocus={true}
                  multiline={false}
                  returnKeyType="done"
                  onSubmitEditing={handleTopicManagement}
                />

                <View style={styles.topicModalButtonContainer}>
                  <TouchableOpacity
                    style={[styles.topicModalButton, styles.topicModalCancelButton, { 
                      backgroundColor: colors.backgroundLight,
                      borderColor: colors.border 
                    }]}
                    onPress={() => setTopicManagementModal(false)}
                  >
                    <Icon name="close-circle" size={18} color={colors.textMuted} />
                    <Text style={[styles.topicModalButtonText, { color: colors.textMuted }]}>İptal</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.topicModalButton, styles.topicModalSaveButton, { 
                      backgroundColor: selectedCourse?.color || colors.primary 
                    }]}
                    onPress={handleTopicManagement}
                    disabled={!newTopicName.trim()}
                  >
                    <Icon 
                      name={isEditingTopic ? "check-circle" : "plus-circle"} 
                      size={18} 
                      color="white" 
                    />
                    <Text style={[styles.topicModalButtonText, { color: 'white' }]}>
                      {isEditingTopic ? 'Güncelle' : 'Ekle'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isEditingTopic && (
                  <TouchableOpacity
                    style={[styles.topicModalDeleteButton, { backgroundColor: colors.danger }]}
                    onPress={handleRemoveTopic}
                  >
                    <Icon name="delete" size={18} color="white" />
                    <Text style={[styles.topicModalButtonText, { color: 'white' }]}>Konu Sil</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Courses Overview
  return (
    <View style={styles.container}>
      <View style={[styles.modernHeader, { backgroundColor: colors.primary }]}>
        <View style={styles.headerGradientOverlay}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.modernHeaderTitle}>Dersler</Text>
              <Text style={styles.modernHeaderSubtitle}>
                Konularınızı takip edin 📚
              </Text>
            </View>
            <View style={styles.headerStats}>
              <View style={styles.headerStatItem}>
                <Text style={styles.headerStatNumber}>{getTotalProgress()}%</Text>
                <Text style={styles.headerStatLabel}>Tamamlandı</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.homeContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {courses.map((course) => (
          <TouchableOpacity
            key={course.id}
            onPress={() => setSelectedCourse(course)}
            style={[styles.courseCard, { backgroundColor: colors.card }]}
          >
            <View style={styles.courseHeader}>
              <View style={[styles.courseIcon, { backgroundColor: course.color + '15' }]}>
                <Icon name={course.icon} size={32} color={course.color} />
              </View>
              <View style={styles.courseInfo}>
                <Text style={[styles.courseName, { color: colors.text }]}>{course.name}</Text>
                <Text style={[styles.courseStats, { color: colors.textLight }]}>
                  {course.completedTopics}/{course.totalTopics} Konu Tamamlandı
                </Text>
                <Text style={[styles.courseTime, { color: colors.textSecondary }]}>
                  Toplam {course.totalTopics} konu
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textMuted} />
            </View>

            <View style={styles.courseProgress}>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      backgroundColor: course.color,
                      width: `${(course.completedTopics / course.totalTopics) * 100}%`
                    }
                  ]}
                />
              </View>
              <Text style={[styles.progressPercentage, { color: course.color }]}>
                {Math.round((course.completedTopics / course.totalTopics) * 100)}%
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// Reports Screen Component
function ReportsScreen() {
  const [reportData, setReportData] = useState({
    thisWeek: { topics: 0, videos: 0, questions: 0, studyTime: 0, completedTopics: 0, totalTopics: 0 },
    lastWeek: { topics: 0, videos: 0, questions: 0, studyTime: 0, completedTopics: 0, totalTopics: 0 },
    thisMonth: { topics: 0, videos: 0, questions: 0, studyTime: 0, completedTopics: 0, totalTopics: 0 },
  });
  const [refreshing, setRefreshing] = useState(false);
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([]);
  const [_courses, setCourses] = useState<Course[]>(defaultCourses);
  const [showAllLogsModal, setShowAllLogsModal] = useState(false);

  // Refresh logs when screen comes into focus to sync with home screen
  useFocusEffect(
    React.useCallback(() => {
      loadReportData();
    }, [])
  );

  const loadReportData = async () => {
    try {
      // Load courses data to get topic completion
      const coursesData = await AsyncStorage.getItem('courses');
      let loadedCourses = defaultCourses;
      if (coursesData) {
        loadedCourses = JSON.parse(coursesData);
        setCourses(loadedCourses);
      }

      // Load study logs
      const logsData = await AsyncStorage.getItem('studyLogs');
      let logs: StudyLog[] = [];
      
      if (logsData) {
        logs = JSON.parse(logsData);
        setStudyLogs(logs);
        
        // Calculate time periods
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        
        const thisWeekLogs = logs.filter(log => new Date(log.date) >= weekAgo);
        const lastWeekLogs = logs.filter(log => {
          const logDate = new Date(log.date);
          return logDate >= twoWeeksAgo && logDate < weekAgo;
        });
        const thisMonthLogs = logs.filter(log => new Date(log.date) >= monthAgo);
        
        // Calculate enhanced statistics
        const calculateEnhancedStats = (logsList: StudyLog[], coursesList: Course[]) => {
          let totalStudyTime = 0;
          let totalVideoTime = 0;
          let totalQuestions = 0;
          let uniqueTopics = new Set<string>();
          let completedTopics = 0;
          let totalTopics = 0;
          
          logsList.forEach(log => {
            totalStudyTime += log.studyMinutes;
            totalVideoTime += log.videoMinutes;
            totalQuestions += log.questionCount;
            
            // Add studied topics
            log.studyTopics.forEach(topicId => uniqueTopics.add(topicId));
            
            // Add custom study topics
            log.customStudyTopics.forEach(customTopic => 
              uniqueTopics.add(`${customTopic.courseId}-${customTopic.topicName}`)
            );
            
            // Add custom questions count
            log.customQuestions.forEach(cq => {
              totalQuestions += cq.count;
            });
          });

          // Calculate topic completion from courses data
          coursesList.forEach(course => {
            totalTopics += course.topics.length;
            course.topics.forEach(topic => {
              if (topic.completion.tamamlandi) {
                completedTopics++;
              }
            });
          });
          
          return {
            topics: uniqueTopics.size,
            videos: Math.floor(totalVideoTime / 30),
            questions: totalQuestions,
            studyTime: totalStudyTime,
            completedTopics,
            totalTopics,
          };
        };

        // Generate weekly data for graphs (last 7 days)
        const weeklyGraphData = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];
          const dayLog = logs.find(log => log.date === dateStr);
          
          weeklyGraphData.push({
            date: date.toLocaleDateString('tr-TR', { weekday: 'short' }),
            studyTime: dayLog ? dayLog.studyMinutes : 0,
            questions: dayLog ? dayLog.questionCount + dayLog.customQuestions.reduce((sum, cq) => sum + cq.count, 0) : 0
          });
        }

        // Generate monthly data for graphs (last 30 days)
        const monthlyGraphData = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = date.toISOString().split('T')[0];
          const dayLog = logs.find(log => log.date === dateStr);
          
          monthlyGraphData.push({
            date: date.getDate().toString(),
            studyTime: dayLog ? dayLog.studyMinutes : 0,
            questions: dayLog ? dayLog.questionCount + dayLog.customQuestions.reduce((sum, cq) => sum + cq.count, 0) : 0
          });
        }
        
        setReportData({
          thisWeek: calculateEnhancedStats(thisWeekLogs, loadedCourses),
          lastWeek: calculateEnhancedStats(lastWeekLogs, loadedCourses),
          thisMonth: calculateEnhancedStats(thisMonthLogs, loadedCourses),
        });
      } else {
        // No study logs yet, but still calculate topic completion
        let completedTopics = 0;
        let totalTopics = 0;
        
        loadedCourses.forEach(course => {
          totalTopics += course.topics.length;
          course.topics.forEach(topic => {
            if (topic.completion.tamamlandi) {
              completedTopics++;
            }
          });
        });

        setReportData({
          thisWeek: { topics: 0, videos: 0, questions: 0, studyTime: 0, completedTopics, totalTopics },
          lastWeek: { topics: 0, videos: 0, questions: 0, studyTime: 0, completedTopics, totalTopics },
          thisMonth: { topics: 0, videos: 0, questions: 0, studyTime: 0, completedTopics, totalTopics },
        });
      }
    } catch (error) {
      console.log('Error loading report data:', error);
    }
  };

  // Delete study log function for reports screen
  const deleteStudyLogInReports = async (logId: string) => {
    try {
      const logsData = await AsyncStorage.getItem('studyLogs');
      if (logsData) {
        let logs: StudyLog[] = JSON.parse(logsData);
        logs = logs.filter(log => log.id !== logId);
        await AsyncStorage.setItem('studyLogs', JSON.stringify(logs));
        setStudyLogs(logs);
        loadReportData(); // Refresh report data
        Alert.alert('✅', 'Çalışma kaydı silindi!');
      }
    } catch (error) {
      console.log('Error deleting study log:', error);
      Alert.alert('❌', 'Silme işleminde hata oluştu');
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  // Refresh data whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadReportData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.modernHeader, { backgroundColor: colors.info }]}>
        <View style={styles.headerGradientOverlay}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.modernHeaderTitle}>Raporlar</Text>
              <Text style={styles.modernHeaderSubtitle}>
                İlerlemeni gözden geçir 📈
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.homeContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.info}
            colors={[colors.info]}
            title="Yenileniyor..."
            titleColor={colors.textSecondary}
          />
        }
      >
        {/* Overall Progress Card */}
        <View style={[styles.modernStatsSection, { backgroundColor: colors.background }]}>
          <Text style={[styles.homeSectionTitle, { color: colors.text }]}>Genel İlerleme</Text>
          <View style={[styles.modernStatCard, { backgroundColor: colors.card }]}>
            <View style={styles.reportRow}>
              <Icon name="book-check" size={20} color={colors.success} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Tamamlanan Konu</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>{reportData.thisMonth.completedTopics}</Text>
            </View>
            <View style={styles.reportRow}>
              <Icon name="book-multiple" size={20} color={colors.primary} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Toplam Konu</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>{reportData.thisMonth.totalTopics}</Text>
            </View>
            <View style={styles.reportRow}>
              <Icon name="percent" size={20} color={colors.warning} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Tamamlama Oranı</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>
                {Math.round((reportData.thisMonth.completedTopics / reportData.thisMonth.totalTopics) * 100) || 0}%
              </Text>
            </View>
          </View>
        </View>

        {/* This Week Report */}
        <View style={[styles.modernStatsSection, { backgroundColor: colors.background }]}>
          <Text style={[styles.homeSectionTitle, { color: colors.text }]}>Bu Hafta</Text>
          <View style={[styles.modernStatCard, { backgroundColor: colors.card }]}>
            <View style={styles.reportRow}>
              <Icon name="book-check" size={20} color={colors.success} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Çalışılan Farklı Konu</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>{reportData.thisWeek.topics}</Text>
            </View>
            <View style={styles.reportRow}>
              <Icon name="video" size={20} color={colors.primary} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Video Dakikası</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>{reportData.thisWeek.videos * 30}dk</Text>
            </View>
            <View style={styles.reportRow}>
              <Icon name="checkbox-marked-circle" size={20} color={colors.warning} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Çözülen Soru</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>{reportData.thisWeek.questions}</Text>
            </View>
            <View style={styles.reportRow}>
              <Icon name="clock" size={20} color={colors.secondary} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Toplam Çalışma</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>{reportData.thisWeek.studyTime}dk</Text>
            </View>
          </View>
        </View>

        {/* Last Week Comparison */}
        {reportData.lastWeek.topics > 0 && (
          <View style={[styles.modernStatsSection, { backgroundColor: colors.background }]}>
            <Text style={[styles.homeSectionTitle, { color: colors.text }]}>Geçen Hafta ile Karşılaştırma</Text>
            <View style={[styles.modernStatCard, { backgroundColor: colors.card }]}>
              <View style={styles.reportRow}>
                <Icon name="trending-up" size={20} color={colors.info} />
                <Text style={[styles.reportLabel, { color: colors.textLight }]}>Konu Artışı</Text>
                <Text style={[styles.reportValue, { color: colors.text }]}>
                  {reportData.thisWeek.topics - reportData.lastWeek.topics >= 0 ? '+' : ''}
                  {reportData.thisWeek.topics - reportData.lastWeek.topics}
                </Text>
              </View>
              <View style={styles.reportRow}>
                <Icon name="chart-line" size={20} color={colors.primary} />
                <Text style={[styles.reportLabel, { color: colors.textLight }]}>Çalışma Süresi Değişimi</Text>
                <Text style={[styles.reportValue, { color: colors.text }]}>
                  {reportData.thisWeek.studyTime - reportData.lastWeek.studyTime >= 0 ? '+' : ''}
                  {reportData.thisWeek.studyTime - reportData.lastWeek.studyTime}dk
                </Text>
              </View>
              <View style={styles.reportRow}>
                <Icon name="help-circle" size={20} color={colors.warning} />
                <Text style={[styles.reportLabel, { color: colors.textLight }]}>Soru Artışı</Text>
                <Text style={[styles.reportValue, { color: colors.text }]}>
                  {reportData.thisWeek.questions - reportData.lastWeek.questions >= 0 ? '+' : ''}
                  {reportData.thisWeek.questions - reportData.lastWeek.questions}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* This Month Summary */}
        <View style={[styles.modernStatsSection, { backgroundColor: colors.background }]}>
          <Text style={[styles.homeSectionTitle, { color: colors.text }]}>Bu Ay Özeti</Text>
          <View style={[styles.modernStatCard, { backgroundColor: colors.card }]}>
            <View style={styles.reportRow}>
              <Icon name="calendar-month" size={20} color={colors.info} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Toplam Çalışma Günü</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>
                {new Set(studyLogs.map(log => log.date)).size}
              </Text>
            </View>
            <View style={styles.reportRow}>
              <Icon name="book-multiple" size={20} color={colors.success} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Farklı Konu</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>{reportData.thisMonth.topics}</Text>
            </View>
            <View style={styles.reportRow}>
              <Icon name="clock-outline" size={20} color={colors.primary} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Toplam Çalışma Saati</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>{Math.round(reportData.thisMonth.studyTime / 60)}sa</Text>
            </View>
            <View style={styles.reportRow}>
              <Icon name="help-circle-outline" size={20} color={colors.warning} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Toplam Soru</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>{reportData.thisMonth.questions}</Text>
            </View>
          </View>
        </View>

        {/* Performance Analysis */}
        <View style={[styles.modernStatsSection, { backgroundColor: colors.background }]}>
          <Text style={[styles.homeSectionTitle, { color: colors.text }]}>Performans Analizi</Text>
          <View style={[styles.modernStatCard, { backgroundColor: colors.card }]}>
            <View style={styles.reportRow}>
              <Icon name="trending-up" size={20} color={colors.success} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Günlük Ortalama Çalışma</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>{Math.round(reportData.thisWeek.studyTime / 7)}dk</Text>
            </View>
            <View style={styles.reportRow}>
              <Icon name="target" size={20} color={colors.primary} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Çalışma Tutarlılığı</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>
                {studyLogs.length > 0 ? 
                  Math.round((studyLogs.filter(log => log.studyMinutes > 0).length / studyLogs.length) * 100) : 0}%
              </Text>
            </View>
            <View style={styles.reportRow}>
              <Icon name="speedometer" size={20} color={colors.warning} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Çalışma Yoğunluğu</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>
                {reportData.thisWeek.studyTime > 300 ? 'Yüksek' : 
                 reportData.thisWeek.studyTime > 120 ? 'Orta' : 'Düşük'}
              </Text>
            </View>
            <View style={styles.reportRow}>
              <Icon name="book-open-variant" size={20} color={colors.info} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Konu Çeşitliliği</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>
                {reportData.thisWeek.topics > 10 ? 'Çok İyi' : 
                 reportData.thisWeek.topics > 5 ? 'İyi' : 'Artırılabilir'}
              </Text>
            </View>
          </View>
        </View>

        {/* Study Logs Access */}
        <View style={[styles.modernStatsSection, { backgroundColor: colors.background }]}>
          <Text style={[styles.homeSectionTitle, { color: colors.text }]}>Çalışma Kayıtları</Text>
          <View style={[styles.modernStatCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.reportRow}
              onPress={() => setShowAllLogsModal(true)}
            >
              <Icon name="database" size={20} color={colors.info} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Tüm Kayıtları Görüntüle</Text>
              <Icon name="chevron-right" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            
            <View style={styles.reportRow}>
              <Icon name="calendar-check" size={20} color={colors.success} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Toplam Çalışma Günü</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>
                {new Set(studyLogs.map(log => log.date)).size}
              </Text>
            </View>
            
            <View style={styles.reportRow}>
              <Icon name="file-document-multiple" size={20} color={colors.secondary} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Toplam Çalışma Seansı</Text>
              <Text style={[styles.reportValue, { color: colors.text }]}>{studyLogs.length}</Text>
            </View>
            
            <TouchableOpacity
              style={styles.reportRow}
              onPress={() => {
                Alert.alert(
                  'Kayıt Sıfırlama',
                  'Tüm çalışma kayıtlarını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
                  [
                    { text: 'İptal', style: 'cancel' },
                    {
                      text: 'Tüm Kayıtları Sil',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await AsyncStorage.removeItem('studyLogs');
                          setStudyLogs([]);
                          loadReportData();
                          Alert.alert('✅', 'Tüm çalışma kayıtları silindi!');
                        } catch (error) {
                          Alert.alert('❌', 'Silme işleminde hata oluştu');
                        }
                      }
                    }
                  ]
                );
              }}
            >
              <Icon name="trash-can" size={20} color={colors.danger} />
              <Text style={[styles.reportLabel, { color: colors.textLight }]}>Kayıt Sıfırlama</Text>
              <Icon name="chevron-right" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* All Logs Modal */}
      <Modal
        visible={showAllLogsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAllLogsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Tüm Çalışma Kayıtları
              </Text>
              <TouchableOpacity
                onPress={() => setShowAllLogsModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {studyLogs.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="book-open-variant" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                    Henüz hiç çalışma kaydınız yok
                  </Text>
                  <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                    Ana sayfadan çalışma kaydı eklemeye başlayın
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.logViewHeaderText, { color: colors.textLight }]}>
                    {studyLogs.length} kayıt bulundu
                  </Text>
                  {studyLogs.map((log, index) => (
                    <View key={log.id} style={[styles.logViewCard, { backgroundColor: colors.backgroundLight }]}>
                      <View style={[styles.logViewIndexContainer, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.logViewIndexText]}>
                          Kayıt #{studyLogs.length - index}
                        </Text>
                      </View>
                      
                      <View style={styles.logViewHeader}>
                        <View>
                          <Text style={[styles.logViewDate, { color: colors.text }]}>
                            {log.date}
                          </Text>
                          {log.createdAt && (
                            <Text style={[styles.logViewTime, { color: colors.textMuted }]}>
                              {new Date(log.createdAt).toLocaleTimeString('tr-TR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() => deleteStudyLogInReports(log.id)}
                          style={styles.deleteLogButton}
                        >
                          <Icon name="delete" size={18} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                      
                      <View style={[styles.logViewStats, { backgroundColor: colors.background }]}>
                        <View style={styles.logViewStat}>
                          <View style={[styles.logViewStatIcon, { backgroundColor: colors.primary + '20' }]}>
                            <Icon name="clock" size={16} color={colors.primary} />
                          </View>
                          <Text style={[styles.logViewStatText, { color: colors.text }]}>
                            {log.studyMinutes + log.videoMinutes}
                          </Text>
                          <Text style={[styles.logViewStatLabel, { color: colors.textMuted }]}>
                            dk toplam
                          </Text>
                        </View>
                        <View style={styles.logViewStat}>
                          <View style={[styles.logViewStatIcon, { backgroundColor: colors.success + '20' }]}>
                            <Icon name="help-circle" size={16} color={colors.success} />
                          </View>
                          <Text style={[styles.logViewStatText, { color: colors.text }]}>
                            {log.questionCount}
                          </Text>
                          <Text style={[styles.logViewStatLabel, { color: colors.textMuted }]}>
                            soru
                          </Text>
                        </View>
                        <View style={styles.logViewStat}>
                          <View style={[styles.logViewStatIcon, { backgroundColor: colors.secondary + '20' }]}>
                            <Icon name="video" size={16} color={colors.secondary} />
                          </View>
                          <Text style={[styles.logViewStatText, { color: colors.text }]}>
                            {log.videoMinutes}
                          </Text>
                          <Text style={[styles.logViewStatLabel, { color: colors.textMuted }]}>
                            dk video
                          </Text>
                        </View>
                      </View>
                      
                      {(log.studyTopics && log.studyTopics.length > 0) && (
                        <View style={[styles.logViewTopics, { borderTopColor: colors.border }]}>
                          <Text style={[styles.logViewTopicsTitle, { color: colors.text }]}>
                            📚 Çalışılan Konular
                          </Text>
                          <View style={styles.logViewTopicsRow}>
                            {log.studyTopics.map((topic: string, topicIndex: number) => (
                              <Text key={topicIndex} style={[styles.logViewTopicText, { backgroundColor: colors.primary + '15', color: colors.primary }]}>
                                {topic}
                              </Text>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Agenda Screen Component
function AgendaScreen() {
  const [weeklyAgenda, setWeeklyAgenda] = useState<DayAgenda[]>([]);
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('list');
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState<Course[]>(defaultCourses);
  
  // Modal states
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showCustomActivityModal, setShowCustomActivityModal] = useState(false);
  const [showCourseGoalModal, setShowCourseGoalModal] = useState(false);
  const [showDayDetailsModal, setShowDayDetailsModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayAgenda | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<DayCourse | null>(null);
  
  // Custom activity states
  const [customActivityName, setCustomActivityName] = useState('');
  const [customActivityIcon, setCustomActivityIcon] = useState('book-outline');
  const [customActivityColor, setCustomActivityColor] = useState(colors.primary);
  
  // Goal modal states
  const [goalTopics, setGoalTopics] = useState<string[]>([]);
  const [goalStudyTime, setGoalStudyTime] = useState(60);
  const [goalQuestions, setGoalQuestions] = useState(10);
  const [goalStudyTimeInput, setGoalStudyTimeInput] = useState('60');
  const [goalQuestionsInput, setGoalQuestionsInput] = useState('10');

  // Initialize default agenda
  const createDefaultAgenda = (): DayAgenda[] => {
    const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    const defaultSchedule = [
      { course: 'Matematik', courseId: '2' },
      { course: 'Türkçe', courseId: '1' },
      { course: 'Tarih', courseId: '4' },
      { course: 'Coğrafya', courseId: '5' },
      { course: 'Vatandaşlık', courseId: '6' },
      { course: 'Matematik', courseId: '2' },
      { course: 'Türkçe', courseId: '1' }
    ];

    return dayNames.map((dayName, index) => {
      const defaultCourse = defaultSchedule[index];
      const course = defaultCourses.find(c => c.id === defaultCourse.courseId) || defaultCourses[0];
      
      return {
        id: `day-${index}`,
        dayName,
        dayIndex: index,
        courses: [{
          id: `${index}-${defaultCourse.courseId}`,
          courseId: defaultCourse.courseId,
          courseName: course.name,
          icon: course.icon,
          color: course.color,
          order: 0,
          isActive: true
        }],
        isToday: index === ((new Date().getDay() + 6) % 7) // Monday = 0
      };
    });
  };

  // Load agenda data
  const loadAgenda = React.useCallback(async () => {
    try {
      const agendaData = await AsyncStorage.getItem('weeklyAgenda');
      if (agendaData) {
        const agenda: DayAgenda[] = JSON.parse(agendaData);
        // Update isToday for each day
        const updatedAgenda = agenda.map((day, index) => ({
          ...day,
          isToday: index === ((new Date().getDay() + 6) % 7)
        }));
        setWeeklyAgenda(updatedAgenda);
      } else {
        const defaultAgenda = createDefaultAgenda();
        setWeeklyAgenda(defaultAgenda);
        await AsyncStorage.setItem('weeklyAgenda', JSON.stringify(defaultAgenda));
      }
    } catch (error) {
      console.log('Error loading agenda:', error);
      setWeeklyAgenda(createDefaultAgenda());
    }
  }, []);

  // Save agenda data
  const saveAgenda = async (agenda: DayAgenda[]) => {
    try {
      await AsyncStorage.setItem('weeklyAgenda', JSON.stringify(agenda));
      setWeeklyAgenda(agenda);
    } catch (error) {
      console.log('Error saving agenda:', error);
      Alert.alert('Hata', 'Ajanda kaydedilemedi.');
    }
  };

  // Load courses data
  const loadCoursesData = async () => {
    try {
      const coursesData = await AsyncStorage.getItem('courses');
      if (coursesData) {
        setCourses(JSON.parse(coursesData));
      } else {
        setCourses(defaultCourses);
      }
    } catch (error) {
      console.log('Error loading courses:', error);
      setCourses(defaultCourses);
    }
  };

  // Add course to day
  const addCourseToDay = (dayId: string, course: Course) => {
    const updatedAgenda = weeklyAgenda.map(day => {
      if (day.id === dayId) {
        const newCourse: DayCourse = {
          id: `${dayId}-${course.id}-${Date.now()}`,
          courseId: course.id,
          courseName: course.name,
          icon: course.icon,
          color: course.color,
          order: day.courses.length,
          isActive: true
        };
        return {
          ...day,
          courses: [...day.courses, newCourse]
        };
      }
      return day;
    });
    saveAgenda(updatedAgenda);
  };

  // Add custom activity to day
  const addCustomActivityToDay = (dayId: string, activityName: string, icon: string, color: string) => {
    const updatedAgenda = weeklyAgenda.map(day => {
      if (day.id === dayId) {
        const newActivity: DayCourse = {
          id: `${dayId}-custom-${Date.now()}`,
          courseId: 'custom',
          courseName: activityName,
          icon: icon,
          color: color,
          order: day.courses.length,
          isActive: true,
          isCustomActivity: true
        };
        return {
          ...day,
          courses: [...day.courses, newActivity]
        };
      }
      return day;
    });
    saveAgenda(updatedAgenda);
  };

  // Remove course from day
  const removeCourseFromDay = (dayId: string, courseId: string) => {
    Alert.alert(
      'Dersi Kaldır',
      'Bu dersi günden kaldırmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: () => {
            const updatedAgenda = weeklyAgenda.map(day => {
              if (day.id === dayId) {
                const filteredCourses = day.courses.filter(c => c.id !== courseId);
                // Reorder remaining courses
                const reorderedCourses = filteredCourses.map((course, index) => ({
                  ...course,
                  order: index
                }));
                return {
                  ...day,
                  courses: reorderedCourses
                };
              }
              return day;
            });
            saveAgenda(updatedAgenda);
          }
        }
      ]
    );
  };

  // Reset day to single default course
  const resetDay = (dayId: string) => {
    Alert.alert(
      'Günü Sıfırla',
      'Bu günü varsayılan haline sıfırlamak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: () => {
            const dayIndex = weeklyAgenda.findIndex(d => d.id === dayId);
            if (dayIndex !== -1) {
              const defaultAgenda = createDefaultAgenda();
              const updatedAgenda = [...weeklyAgenda];
              updatedAgenda[dayIndex] = {
                ...defaultAgenda[dayIndex],
                id: dayId,
                isToday: updatedAgenda[dayIndex].isToday
              };
              saveAgenda(updatedAgenda);
            }
          }
        }
      ]
    );
  };

  // Reset entire agenda
  const resetEntireAgenda = () => {
    Alert.alert(
      'Tüm Ajandayı Sıfırla',
      'Tüm haftalık ajandayı varsayılan haline sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz!',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: async () => {
            const defaultAgenda = createDefaultAgenda();
            await saveAgenda(defaultAgenda);
            Alert.alert('✅', 'Ajanda varsayılan haline sıfırlandı!');
          }
        }
      ]
    );
  };

  // Create goal for course
  const createGoalForCourse = async (course: DayCourse) => {
    // Allow empty topic selection, but require either study time or questions
    if (goalStudyTime === 0 && goalQuestions === 0) {
      Alert.alert('Hata', 'Lütfen çalışma süresi veya soru sayısı belirleyin.');
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      const newGoal: DailyGoal = {
        id: `${course.courseName}_${today}_${Date.now()}`,
        subject: course.courseName,
        date: today,
        selectedTopics: course.isCustomActivity ? [] : goalTopics,
        studyTimeMinutes: goalStudyTime,
        questionCount: goalQuestions,
        progress: {
          completedTopics: [],
          studyTimeSpent: 0,
          questionsAnswered: 0,
        },
        completed: false,
      };

      const goalsData = await AsyncStorage.getItem('dailyGoals');
      let allGoals: DailyGoal[] = goalsData ? JSON.parse(goalsData) : [];
      allGoals.push(newGoal);
      await AsyncStorage.setItem('dailyGoals', JSON.stringify(allGoals));
      
      setShowGoalModal(false);
      setGoalTopics([]);
      setGoalStudyTime(60);
      setGoalQuestions(10);
      
      const topicsText = course.isCustomActivity ? 'Özel Aktivite' : `${goalTopics.length} Konu`;
      Alert.alert(
        'Hedef Oluşturuldu! 🎯',
        `${course.courseName} için günlük hedef oluşturuldu:\n• ${topicsText}\n• ${goalQuestions} Soru\n• ${Math.floor(goalStudyTime / 60)}sa ${goalStudyTime % 60}dk`
      );
    } catch (error) {
      console.log('Goal oluşturulamadı:', error);
      Alert.alert('Hata', 'Günlük hedef oluşturulamadı.');
    }
  };

  // Toggle topic selection for goal
  const toggleGoalTopic = (topicId: string) => {
    setGoalTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId]
    );
  };

  // Show course goal information with improved modal
  const showCourseGoal = async (course: DayCourse) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const goalsData = await AsyncStorage.getItem('dailyGoals');
      
      if (goalsData) {
        const goals: DailyGoal[] = JSON.parse(goalsData);
        const courseGoals = goals.filter(goal => 
          goal.subject === course.courseName && goal.date === today
        );
        
        if (courseGoals.length > 0) {
          // Show goals in a better formatted way
          setSelectedCourse(course);
          setShowCourseGoalModal(true);
        } else {
          // No goals found - show create goal option
          Alert.alert(
            `📝 ${course.courseName}`,
            'Bu ders için henüz hedef belirlenmemiş.',
            [
              { text: 'Kapat', style: 'cancel' },
              { 
                text: 'Hedef Oluştur', 
                onPress: () => {
                  setSelectedCourse(course);
                  setGoalTopics([]);
                  setGoalStudyTime(60);
                  setGoalQuestions(10);
                  setGoalStudyTimeInput('60');
                  setGoalQuestionsInput('10');
                  setShowGoalModal(true);
                }
              }
            ]
          );
        }
      } else {
        // No goals data - show create goal option
        Alert.alert(
          `📝 ${course.courseName}`,
          'Bu ders için henüz hedef belirlenmemiş.',
          [
            { text: 'Kapat', style: 'cancel' },
            { 
              text: 'Hedef Oluştur', 
              onPress: () => {
                setSelectedCourse(course);
                setGoalTopics([]);
                setGoalStudyTime(60);
                setGoalQuestions(10);
                setGoalStudyTimeInput('60');
                setGoalQuestionsInput('10');
                setShowGoalModal(true);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.log('Error loading course goals:', error);
      Alert.alert('Hata', 'Hedef bilgileri yüklenemedi.');
    }
  };

  // Render course item without move buttons, with click functionality
  const renderCourseItem = (course: DayCourse, dayId: string) => {
    return (
      <TouchableOpacity
        key={course.id}
        style={[
          styles.agendaCourseItem,
          {
            backgroundColor: colors.card,
            borderLeftColor: course.color,
          }
        ]}
        onPress={() => showCourseGoal(course)}
        activeOpacity={0.7}
      >
        <View style={styles.agendaCourseContent}>
          <View style={[styles.agendaCourseIcon, { backgroundColor: course.color + '15' }]}>
            <Icon name={course.icon} size={20} color={course.color} />
          </View>
          <View style={styles.agendaCourseInfo}>
            <Text style={[styles.agendaCourseText, { color: colors.text }]}>
              {course.courseName}
              {course.isCustomActivity && (
                <Text style={[styles.customActivityBadge, { color: colors.textLight }]}> (Özel Aktivite)</Text>
              )}
            </Text>
            <Text style={[styles.agendaCourseGoal, { color: colors.textLight }]}>
              Hedef belirlenmemiş - Tıkla ve oluştur
            </Text>
          </View>
          <View style={styles.agendaCourseActions}>
            <TouchableOpacity
              style={[styles.agendaCourseButton, { backgroundColor: colors.primary }]}
              onPress={(e) => {
                e.stopPropagation();
                setSelectedCourse(course);
                setGoalTopics([]);
                setGoalStudyTime(60);
                setGoalQuestions(10);
                setGoalStudyTimeInput('60');
                setGoalQuestionsInput('10');
                setShowGoalModal(true);
              }}
            >
              <Icon name="target" size={14} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.agendaCourseButton, { backgroundColor: colors.danger }]}
              onPress={(e) => {
                e.stopPropagation();
                removeCourseFromDay(dayId, course.id);
              }}
            >
              <Icon name="close" size={14} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Initialize data
  useEffect(() => {
    loadAgenda();
    loadCoursesData();
  }, [loadAgenda]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAgenda();
    await loadCoursesData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.modernHeader, { backgroundColor: colors.secondary }]}>
        <View style={styles.headerGradientOverlay}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.modernHeaderTitle}>Haftalık Program</Text>
              <Text style={styles.modernHeaderSubtitle}>
                Programınızı özelleştirin 📅
              </Text>
            </View>
            <View style={styles.headerStats}>
              <TouchableOpacity
                style={[styles.headerActionButton, { backgroundColor: colors.info }]}
                onPress={() => setCalendarViewMode(calendarViewMode === 'list' ? 'calendar' : 'list')}
              >
                <Icon 
                  name={calendarViewMode === 'list' ? 'calendar-month' : 'view-list'} 
                  size={18} 
                  color="white" 
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerActionButton, { backgroundColor: colors.danger }]}
                onPress={resetEntireAgenda}
              >
                <Icon name="refresh" size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.homeContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondary}
            colors={[colors.secondary]}
          />
        }
      >
        {/* Weekly Agenda - List or Calendar View */}
        {calendarViewMode === 'list' ? (
          // List View
          weeklyAgenda.map((day) => (
            <View key={day.id} style={[
              styles.newAgendaDayContainer,
              { backgroundColor: colors.card },
              day.isToday && styles.todayHighlight
            ]}>
              <View style={styles.newAgendaDayHeader}>
                <View style={styles.agendaDayTitleSection}>
                  <Text style={[
                    styles.agendaDayTitle, 
                    { color: colors.text },
                    day.isToday && styles.todayText
                  ]}>
                    {day.dayName}
                    {day.isToday && (
                      <View style={[styles.todayBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.todayBadgeText}>BUGÜN</Text>
                      </View>
                    )}
                  </Text>
                  <Text style={[styles.agendaCourseCount, { color: colors.textLight }]}>
                    {day.courses.length} ders planlandı
                  </Text>
                </View>
                <View style={styles.newAgendaDayActions}>
                  <TouchableOpacity
                    style={[styles.agendaDayButton, { backgroundColor: colors.success }]}
                    onPress={() => {
                      setSelectedDay(day);
                      setShowCourseModal(true);
                    }}
                  >
                    <Icon name="plus" size={16} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.agendaDayButton, { backgroundColor: colors.warning }]}
                    onPress={() => resetDay(day.id)}
                  >
                    <Icon name="refresh" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Courses List */}
              <View style={styles.agendaCoursesContainer}>
                {day.courses
                  .sort((a, b) => a.order - b.order)
                  .map((course) => 
                    renderCourseItem(course, day.id)
                  )}
              </View>
            </View>
          ))
        ) : (
          // Calendar Grid View - Improved Layout
          <View style={[styles.calendarContainer, { backgroundColor: colors.card }]}>
            <View style={styles.calendarHeader}>
              <Text style={[styles.calendarTitle, { color: colors.text }]}>Haftalık Takvim Görünümü</Text>
            </View>
            
            {/* Weekdays Row */}
            <View style={styles.calendarWeekRow}>
              <Text style={[styles.calendarRowTitle, { color: colors.primary }]}>Hafta İçi</Text>
              <View style={styles.calendarDaysRow}>
                {weeklyAgenda.slice(0, 5).map((day) => (
                  <TouchableOpacity
                    key={day.id}
                    style={[
                      styles.calendarDayCard,
                      { backgroundColor: colors.backgroundLight },
                      day.isToday && [styles.todayHighlight, { backgroundColor: colors.primary + '10' }]
                    ]}
                    onPress={() => {
                      setSelectedDay(day);
                      setShowDayDetailsModal(true);
                    }}
                  >
                    <Text style={[
                      styles.calendarDayName, 
                      { color: colors.text },
                      day.isToday && { color: colors.primary, fontWeight: '700' }
                    ]}>
                      {day.dayName.slice(0, 3)}
                    </Text>
                    {day.isToday && (
                      <View style={[styles.todayIndicator, { backgroundColor: colors.primary }]} />
                    )}
                    <View style={styles.calendarCourses}>
                      {day.courses.slice(0, 2).map((course, index) => (
                        <Text 
                          key={course.id} 
                          style={[styles.calendarCourseText, { 
                            color: course.color,
                            fontSize: 9,
                            fontWeight: '600'
                          }]}
                          numberOfLines={1}
                        >
                          {course.courseName}
                        </Text>
                      ))}
                      {day.courses.length > 2 && (
                        <Text style={[styles.calendarMoreText, { color: colors.textMuted }]}>
                          +{day.courses.length - 2}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Weekend Row */}
            <View style={styles.calendarWeekRow}>
              <Text style={[styles.calendarRowTitle, { color: colors.secondary }]}>Hafta Sonu</Text>
              <View style={styles.calendarDaysRow}>
                {weeklyAgenda.slice(5, 7).map((day) => (
                  <TouchableOpacity
                    key={day.id}
                    style={[
                      styles.calendarDayCard,
                      styles.calendarWeekendCard,
                      { backgroundColor: colors.backgroundLight },
                      day.isToday && [styles.todayHighlight, { backgroundColor: colors.primary + '10' }]
                    ]}
                    onPress={() => {
                      setSelectedDay(day);
                      setShowDayDetailsModal(true);
                    }}
                  >
                    <Text style={[
                      styles.calendarDayName, 
                      { color: colors.text },
                      day.isToday && { color: colors.primary, fontWeight: '700' }
                    ]}>
                      {day.dayName.slice(0, 3)}
                    </Text>
                    {day.isToday && (
                      <View style={[styles.todayIndicator, { backgroundColor: colors.primary }]} />
                    )}
                    <View style={styles.calendarCourses}>
                      {day.courses.slice(0, 2).map((course, index) => (
                        <Text 
                          key={course.id} 
                          style={[styles.calendarCourseText, { 
                            color: course.color,
                            fontSize: 9,
                            fontWeight: '600'
                          }]}
                          numberOfLines={1}
                        >
                          {course.courseName}
                        </Text>
                      ))}
                      {day.courses.length > 2 && (
                        <Text style={[styles.calendarMoreText, { color: colors.textMuted }]}>
                          +{day.courses.length - 2}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
                {/* Add empty space for visual balance */}
                <View style={[styles.calendarDayCard, { opacity: 0 }]} />
                <View style={[styles.calendarDayCard, { opacity: 0 }]} />
                <View style={[styles.calendarDayCard, { opacity: 0 }]} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Course Modal */}
      <Modal
        visible={showCourseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCourseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                📚 Ders Ekle - {selectedDay?.dayName}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowCourseModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Eklemek istediğiniz dersi seçin:
              </Text>
              
              {courses.map((course) => {
                const isAlreadyAdded = selectedDay?.courses.some(c => c.courseId === course.id) || false;
                
                return (
                  <TouchableOpacity
                    key={course.id}
                    style={[styles.newCourseSelectItem, { 
                      backgroundColor: isAlreadyAdded ? colors.backgroundLight + '80' : colors.backgroundLight,
                      borderLeftColor: course.color,
                      opacity: isAlreadyAdded ? 0.5 : 1
                    }]}
                    onPress={() => {
                      if (!isAlreadyAdded && selectedDay) {
                        addCourseToDay(selectedDay.id, course);
                        setShowCourseModal(false);
                      } else if (isAlreadyAdded) {
                        Alert.alert(
                          'Ders Zaten Ekli',
                          `${course.name} dersi bu güne zaten eklenmiş. Aynı dersi bir günde birden fazla kez ekleyemezsiniz.`,
                          [{ text: 'Tamam', style: 'default' }]
                        );
                      }
                    }}
                    disabled={isAlreadyAdded}
                  >
                    <View style={[styles.courseSelectIcon, { backgroundColor: course.color + '15' }]}>
                      <Icon name={course.icon} size={24} color={course.color} />
                    </View>
                    <View style={styles.courseSelectInfo}>
                      <Text style={[styles.courseSelectName, { 
                        color: isAlreadyAdded ? colors.textMuted : colors.text 
                      }]}>
                        {course.name}
                        {isAlreadyAdded && (
                          <Text style={[styles.alreadyAddedBadge, { color: colors.textMuted }]}> (Zaten Ekli)</Text>
                        )}
                      </Text>
                      <Text style={[styles.courseSelectTopics, { color: colors.textLight }]}>
                        {course.totalTopics} konu
                      </Text>
                    </View>
                    <Icon 
                      name={isAlreadyAdded ? "check-circle" : "plus-circle"} 
                      size={24} 
                      color={isAlreadyAdded ? colors.textMuted : course.color} 
                    />
                  </TouchableOpacity>
                );
              })}

              {/* Custom Activity Option */}
              <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />
              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
                Veya özel aktivite ekleyin:
              </Text>
              
              <TouchableOpacity
                style={[styles.newCourseSelectItem, { 
                  backgroundColor: colors.backgroundLight,
                  borderLeftColor: colors.primary,
                  borderStyle: 'dashed'
                }]}
                onPress={() => {
                  setShowCourseModal(false);
                  setCustomActivityName('');
                  setCustomActivityIcon('book-outline');
                  setCustomActivityColor(colors.primary);
                  setShowCustomActivityModal(true);
                }}
              >
                <View style={[styles.courseSelectIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Icon name="plus-circle-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.courseSelectInfo}>
                  <Text style={[styles.courseSelectName, { color: colors.text }]}>
                    Özel Aktivite Oluştur
                  </Text>
                  <Text style={[styles.courseSelectTopics, { color: colors.textLight }]}>
                    Kişisel çalışma, tekrar, vs.
                  </Text>
                </View>
                <Icon name="chevron-right" size={24} color={colors.primary} />
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.border }]}
                onPress={() => setShowCourseModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textMuted }]}>İptal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Study Goal Modal */}
      <Modal
        visible={showGoalModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGoalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                🎯 Çalışma Hedefi - {selectedCourse?.courseName}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowGoalModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedCourse && (
                <>
                  {/* Topic Selection - only for regular courses */}
                  {!selectedCourse.isCustomActivity && (
                    <>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>
                        Konular Seçin:
                      </Text>
                      <View style={styles.topicsContainer}>
                        {courses
                          .find(c => c.id === selectedCourse.courseId)
                          ?.topics.map((topic) => (
                            <TouchableOpacity
                              key={topic.id}
                              style={[
                                styles.topicItem,
                                {
                                  backgroundColor: goalTopics.includes(topic.id)
                                    ? colors.primary + '15'
                                    : colors.background,
                                  borderColor: goalTopics.includes(topic.id)
                                    ? colors.primary
                                    : colors.border,
                                },
                              ]}
                              onPress={() => toggleGoalTopic(topic.id)}
                            >
                              <Text
                                style={[
                                  styles.topicItemText,
                                  {
                                    color: goalTopics.includes(topic.id)
                                      ? colors.primary
                                      : colors.text,
                                  },
                                ]}
                              >
                                {topic.name}
                              </Text>
                              {goalTopics.includes(topic.id) && (
                                <Icon name="check-circle" size={20} color={colors.primary} />
                              )}
                            </TouchableOpacity>
                          ))}
                      </View>
                    </>
                  )}

                  {/* Custom Activity Note */}
                  {selectedCourse.isCustomActivity && (
                    <View style={[styles.instructionsCard, { backgroundColor: colors.backgroundLight, marginBottom: 20 }]}>
                      <Icon name="information" size={20} color={colors.info} />
                      <Text style={[styles.instructionsText, { color: colors.textLight }]}>
                        Özel aktiviteler için sadece süre ve soru hedefi belirleyebilirsiniz.
                      </Text>
                    </View>
                  )}

                  {/* Study Time */}
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Çalışma Süresi (Dakika):
                  </Text>
                  <View style={styles.questionContainer}>
                    <TouchableOpacity
                      style={[styles.timeButton, { backgroundColor: colors.border }]}
                      onPress={() => {
                        const newTime = Math.max(15, goalStudyTime - 15);
                        setGoalStudyTime(newTime);
                        setGoalStudyTimeInput(newTime.toString());
                      }}
                    >
                      <Icon name="minus" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.questionValue, { color: colors.text }]}>{goalStudyTime}</Text>
                    <TouchableOpacity
                      style={[styles.timeButton, { backgroundColor: colors.border }]}
                      onPress={() => {
                        const newTime = goalStudyTime + 15;
                        setGoalStudyTime(newTime);
                        setGoalStudyTimeInput(newTime.toString());
                      }}
                    >
                      <Icon name="plus" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Manual Input for Study Time */}
                  <Text style={[styles.sectionTitle, { color: colors.textMuted, fontSize: 14, marginTop: 8 }]}>
                    veya tam sayı girin:
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: colors.backgroundLight, 
                      color: colors.text,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 16,
                      textAlign: 'center',
                      marginBottom: 15
                    }]}
                    value={goalStudyTimeInput}
                    onChangeText={(text) => {
                      setGoalStudyTimeInput(text);
                      const num = parseInt(text, 10);
                      if (!isNaN(num) && num >= 0) {
                        setGoalStudyTime(num);
                      }
                    }}
                    placeholder="Dakika"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />

                  {/* Question Count */}
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Soru Sayısı:
                  </Text>
                  <View style={styles.questionContainer}>
                    <TouchableOpacity
                      style={[styles.timeButton, { backgroundColor: colors.border }]}
                      onPress={() => {
                        const newQuestions = Math.max(0, goalQuestions - 5);
                        setGoalQuestions(newQuestions);
                        setGoalQuestionsInput(newQuestions.toString());
                      }}
                    >
                      <Icon name="minus" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.questionValue, { color: colors.text }]}>{goalQuestions}</Text>
                    <TouchableOpacity
                      style={[styles.timeButton, { backgroundColor: colors.border }]}
                      onPress={() => {
                        const newQuestions = goalQuestions + 5;
                        setGoalQuestions(newQuestions);
                        setGoalQuestionsInput(newQuestions.toString());
                      }}
                    >
                      <Icon name="plus" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Manual Input for Questions */}
                  <Text style={[styles.sectionTitle, { color: colors.textMuted, fontSize: 14, marginTop: 8 }]}>
                    veya tam sayı girin:
                  </Text>
                  <TextInput
                    style={[styles.textInput, { 
                      backgroundColor: colors.backgroundLight, 
                      color: colors.text,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      fontSize: 16,
                      textAlign: 'center',
                      marginBottom: 15
                    }]}
                    value={goalQuestionsInput}
                    onChangeText={(text) => {
                      setGoalQuestionsInput(text);
                      const num = parseInt(text, 10);
                      if (!isNaN(num) && num >= 0) {
                        setGoalQuestions(num);
                      }
                    }}
                    placeholder="Soru Sayısı"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.border }]}
                onPress={() => setShowGoalModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textMuted }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={() => selectedCourse && createGoalForCourse(selectedCourse)}
              >
                <Text style={styles.modalButtonText}>Hedef Oluştur</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Activity Modal */}
      <Modal
        visible={showCustomActivityModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomActivityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                ✨ Özel Aktivite Oluştur - {selectedDay?.dayName}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowCustomActivityModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Activity Name */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Aktivite Adı:
              </Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.backgroundLight, 
                  color: colors.text,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  marginBottom: 20
                }]}
                value={customActivityName}
                onChangeText={setCustomActivityName}
                placeholder="Örn: Kişisel Tekrar, Yazma Çalışması"
                placeholderTextColor={colors.textMuted}
              />

              {/* Icon Selection */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                İkon Seçin:
              </Text>
              <View style={styles.iconSelectionContainer}>
                {[
                  'book-outline', 'pencil-outline', 'note-text-outline', 'clipboard-text-outline',
                  'brain', 'lightbulb-outline', 'star-outline', 'target',
                  'clock-outline', 'calendar-outline', 'bookmark-outline', 'trophy-outline'
                ].map((iconName) => (
                  <TouchableOpacity
                    key={iconName}
                    style={[
                      styles.iconSelectButton, 
                      { 
                        backgroundColor: customActivityIcon === iconName ? colors.primary + '20' : colors.backgroundLight,
                        borderColor: customActivityIcon === iconName ? colors.primary : colors.border
                      }
                    ]}
                    onPress={() => setCustomActivityIcon(iconName)}
                  >
                    <Icon name={iconName} size={24} color={customActivityIcon === iconName ? colors.primary : colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color Selection */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Renk Seçin:
              </Text>
              <View style={styles.colorSelectionContainer}>
                {[
                  colors.primary, colors.secondary, colors.success, colors.warning, 
                  colors.danger, colors.info, '#9333EA', '#EC4899', '#F97316', '#84CC16'
                ].map((colorOption) => (
                  <TouchableOpacity
                    key={colorOption}
                    style={[
                      styles.colorSelectButton,
                      { 
                        backgroundColor: colorOption,
                        borderColor: customActivityColor === colorOption ? colors.text : 'transparent',
                        borderWidth: customActivityColor === colorOption ? 3 : 0
                      }
                    ]}
                    onPress={() => setCustomActivityColor(colorOption)}
                  >
                    {customActivityColor === colorOption && (
                      <Icon name="check" size={16} color="white" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Preview */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Önizleme:
              </Text>
              <View style={[styles.activityPreview, { backgroundColor: colors.backgroundLight, borderLeftColor: customActivityColor }]}>
                <View style={[styles.courseSelectIcon, { backgroundColor: customActivityColor + '15' }]}>
                  <Icon name={customActivityIcon} size={24} color={customActivityColor} />
                </View>
                <View style={styles.courseSelectInfo}>
                  <Text style={[styles.courseSelectName, { color: colors.text }]}>
                    {customActivityName || 'Aktivite Adı'}
                  </Text>
                  <Text style={[styles.courseSelectTopics, { color: colors.textLight }]}>
                    Özel Aktivite
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.border }]}
                onPress={() => setShowCustomActivityModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textMuted }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { 
                  backgroundColor: customActivityName.trim() ? colors.primary : colors.border 
                }]}
                onPress={() => {
                  if (selectedDay && customActivityName.trim()) {
                    addCustomActivityToDay(selectedDay.id, customActivityName.trim(), customActivityIcon, customActivityColor);
                    setShowCustomActivityModal(false);
                    setCustomActivityName('');
                  }
                }}
                disabled={!customActivityName.trim()}
              >
                <Text style={[styles.modalButtonText, { 
                  color: customActivityName.trim() ? 'white' : colors.textMuted 
                }]}>Aktivite Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Course Goal Details Modal */}
      <Modal
        visible={showCourseGoalModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCourseGoalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                🎯 {selectedCourse?.courseName} Hedefleri
              </Text>
              <TouchableOpacity 
                onPress={() => setShowCourseGoalModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedCourse && (
                <View style={styles.goalDetailsContainer}>
                  <View style={[styles.goalSummaryCard, { backgroundColor: colors.backgroundLight }]}>
                    <View style={styles.goalSummaryHeader}>
                      <Icon name="target" size={24} color={colors.primary} />
                      <Text style={[styles.goalSummaryTitle, { color: colors.text }]}>Bugünün Hedefleri</Text>
                    </View>
                    
                    <Text style={[styles.goalSummarySubtext, { color: colors.textLight }]}>
                      Bu dersin günlük hedeflerini buradan takip edebilirsiniz
                    </Text>
                    
                    {/* Goal Stats Row */}
                    <View style={styles.goalStatsRow}>
                      <View style={styles.goalStatItem}>
                        <Text style={[styles.goalStatNumber, { color: colors.primary }]}>0</Text>
                        <Text style={[styles.goalStatLabel, { color: colors.textMuted }]}>Konu</Text>
                      </View>
                      <View style={styles.goalStatItem}>
                        <Text style={[styles.goalStatNumber, { color: colors.secondary }]}>0</Text>
                        <Text style={[styles.goalStatLabel, { color: colors.textMuted }]}>Dakika</Text>
                      </View>
                      <View style={styles.goalStatItem}>
                        <Text style={[styles.goalStatNumber, { color: colors.success }]}>0</Text>
                        <Text style={[styles.goalStatLabel, { color: colors.textMuted }]}>Soru</Text>
                      </View>
                    </View>
                  </View>

                  {/* No Goals Message */}
                  <View style={[styles.noGoalsCard, { backgroundColor: colors.backgroundLight }]}>
                    <Icon name="information-outline" size={48} color={colors.textMuted} />
                    <Text style={[styles.noGoalsTitle, { color: colors.text }]}>
                      Henüz Hedef Belirlenmemiş
                    </Text>
                    <Text style={[styles.noGoalsSubtext, { color: colors.textLight }]}>
                      Bu ders için günlük çalışma hedefi oluşturmak ister misiniz?
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.border }]}
                onPress={() => setShowCourseGoalModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textMuted }]}>Kapat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setShowCourseGoalModal(false);
                  if (selectedCourse) {
                    setGoalTopics([]);
                    setGoalStudyTime(60);
                    setGoalQuestions(10);
                    setGoalStudyTimeInput('60');
                    setGoalQuestionsInput('10');
                    setShowGoalModal(true);
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Hedef Oluştur</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Day Details Modal */}
      <Modal
        visible={showDayDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDayDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                📅 {selectedDay?.dayName} Detayları
              </Text>
              <TouchableOpacity 
                onPress={() => setShowDayDetailsModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedDay && (
                <View>
                  {/* Day Overview */}
                  <View style={[styles.dayOverviewCard, { backgroundColor: colors.backgroundLight }]}>
                    <View style={styles.dayOverviewHeader}>
                      <View style={styles.dayOverviewInfo}>
                        <Text style={[styles.dayOverviewTitle, { color: colors.text }]}>
                          {selectedDay.dayName}
                          {selectedDay.isToday && (
                            <View style={[styles.todayBadge, { backgroundColor: colors.primary, marginLeft: 8 }]}>
                              <Text style={styles.todayBadgeText}>BUGÜN</Text>
                            </View>
                          )}
                        </Text>
                        <Text style={[styles.dayOverviewSubtitle, { color: colors.textLight }]}>
                          {selectedDay.courses.length} ders planlandı
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.addCourseButton, { backgroundColor: colors.primary }]}
                        onPress={() => {
                          setShowDayDetailsModal(false);
                          setShowCourseModal(true);
                        }}
                      >
                        <Icon name="plus" size={20} color="white" />
                        <Text style={styles.addCourseButtonText}>Ders Ekle</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Courses Section */}
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    📚 Planlanan Dersler
                  </Text>
                  
                  {selectedDay.courses.length > 0 ? (
                    selectedDay.courses
                      .sort((a, b) => a.order - b.order)
                      .map((course) => (
                        <TouchableOpacity
                          key={course.id}
                          style={[styles.dayDetailsCourseItem, { 
                            backgroundColor: colors.backgroundLight,
                            borderLeftColor: course.color
                          }]}
                          onPress={() => {
                            setSelectedCourse(course);
                            setShowDayDetailsModal(false);
                            showCourseGoal(course);
                          }}
                        >
                          <View style={[styles.dayDetailsCourseIcon, { backgroundColor: course.color + '15' }]}>
                            <Icon name={course.icon} size={20} color={course.color} />
                          </View>
                          <View style={styles.dayDetailsCourseInfo}>
                            <Text style={[styles.dayDetailsCourseName, { color: colors.text }]}>
                              {course.courseName}
                              {course.isCustomActivity && (
                                <Text style={[styles.customBadge, { color: colors.textMuted }]}> (Özel)</Text>
                              )}
                            </Text>
                            <Text style={[styles.courseGoalText, { color: colors.textLight }]}>
                              Hedef için tıklayın
                            </Text>
                          </View>
                          <Icon name="chevron-right" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                      ))
                  ) : (
                    <View style={[styles.emptyCoursesCard, { backgroundColor: colors.backgroundLight }]}>
                      <Icon name="book-outline" size={48} color={colors.textMuted} />
                      <Text style={[styles.emptyCoursesTitle, { color: colors.text }]}>
                        Henüz Ders Eklenmemiş
                      </Text>
                      <Text style={[styles.emptyCoursesSubtext, { color: colors.textLight }]}>
                        Bu güne ders eklemek için yukarıdaki "Ders Ekle" butonunu kullanın.
                      </Text>
                    </View>
                  )}

                  {/* Goals Section */}
                  <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>
                    🎯 Günlük Hedefler
                  </Text>
                  
                  <View style={[styles.goalsOverviewCard, { backgroundColor: colors.backgroundLight }]}>
                    <View style={styles.goalsOverviewHeader}>
                      <Icon name="target" size={24} color={colors.primary} />
                      <Text style={[styles.goalsOverviewTitle, { color: colors.text }]}>Bugünün Hedefleri</Text>
                    </View>
                    <Text style={[styles.goalsOverviewSubtext, { color: colors.textLight }]}>
                      Her ders için ayrı hedefler belirleyebilir ve ilerlemelerinizi takip edebilirsiniz.
                    </Text>
                    
                    <View style={styles.goalStatsContainer}>
                      <View style={styles.goalStatItem}>
                        <Text style={[styles.goalStatNumber, { color: colors.primary }]}>
                          {selectedDay.courses.length}
                        </Text>
                        <Text style={[styles.goalStatLabel, { color: colors.textMuted }]}>Ders</Text>
                      </View>
                      <View style={styles.goalStatItem}>
                        <Text style={[styles.goalStatNumber, { color: colors.success }]}>0</Text>
                        <Text style={[styles.goalStatLabel, { color: colors.textMuted }]}>Hedef</Text>
                      </View>
                      <View style={styles.goalStatItem}>
                        <Text style={[styles.goalStatNumber, { color: colors.secondary }]}>0%</Text>
                        <Text style={[styles.goalStatLabel, { color: colors.textMuted }]}>Tamamlandı</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.border }]}
                onPress={() => setShowDayDetailsModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textMuted }]}>Kapat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.warning }]}
                onPress={() => {
                  setShowDayDetailsModal(false);
                  if (selectedDay) {
                    resetDay(selectedDay.id);
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Günü Sıfırla</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Settings Screen Component
function SettingsScreen() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPushNotificationModal, setShowPushNotificationModal] = useState(false);
  const [showDailyReminderModal, setShowDailyReminderModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState('suggestion'); // suggestion, bug, compliment
  const [feedbackText, setFeedbackText] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  
  const { openMotivationModal } = useModal();

  const clearAllData = () => {
    Alert.alert(
      '⚠️ Uyarı',
      'Tüm verileriniz silinecek. Bu işlem geri alınamaz!',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['progress', 'studySessions', 'dailyGoals', 'studyLogs', 'courses', 'customWeeklySchedule']);
              Alert.alert('✅', 'Tüm veriler temizlendi!');
            } catch (error) {
              Alert.alert('❌', 'Veri temizleme sırasında hata oluştu');
            }
          }
        }
      ]
    );
  };

  const handleThemeToggle = () => {
    // TODO: Implement theme toggle functionality
    Alert.alert('Tema Değişikliği', 'Bu özellik yakında eklenecek!');
  };

  const handleNotificationToggle = () => {
    // TODO: Implement notification toggle functionality
    Alert.alert('Bildirim Ayarları', 'Bu özellik yakında eklenecek!');
  };

  const openFeedbackModal = () => {
    setShowFeedbackModal(true);
  };

  const closeFeedbackModal = () => {
    setShowFeedbackModal(false);
    setFeedbackText('');
    setUserEmail('');
    setFeedbackType('suggestion');
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Hata', 'Lütfen geri bildiriminizi yazın.');
      return;
    }

    setIsSubmittingFeedback(true);

    try {
      // Prepare feedback data
      const feedbackData: FeedbackData = {
        feedbackType: feedbackType as 'suggestion' | 'bug' | 'general',
        feedbackText: feedbackText.trim(),
        userEmail: userEmail.trim() || undefined,
        deviceInfo: Platform.OS + ' ' + Platform.Version,
        appVersion: '1.0.0',
      };

      // Try Formspree first
      let success = await FeedbackService.sendFeedback(feedbackData);
      let method = 'Formspree';

      // If Formspree fails, try webhook method
      if (!success) {
        success = await FeedbackService.sendFeedbackViaWebhook(feedbackData);
        method = 'Webhook';
      }

      if (success) {
        closeFeedbackModal();
        Alert.alert(
          'Teşekkürler!', 
          'Geri bildiriminiz başarıyla gönderildi. En kısa sürede değerlendireceğiz.'
        );
      } else {
        // Final fallback to email client
        const subject = `KPSS Takip - ${feedbackType === 'suggestion' ? 'Öneri' : feedbackType === 'bug' ? 'Hata Bildirimi' : 'İletişim'}`;
        const body = `Geri Bildirim Türü: ${feedbackType === 'suggestion' ? 'Öneri' : feedbackType === 'bug' ? 'Hata Bildirimi' : 'Genel'}\n\nGeri Bildirim:\n${feedbackText}\n\nCihaz Bilgisi: ${Platform.OS} ${Platform.Version}\nUygulama Sürümü: 1.0.0\nZaman: ${new Date().toLocaleString('tr-TR')}\n\n${userEmail ? `İletişim: ${userEmail}` : ''}`;
        
        const emailUrl = `mailto:ozcann.talha@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        const canOpen = await Linking.canOpenURL(emailUrl);
        if (canOpen) {
          await Linking.openURL(emailUrl);
          closeFeedbackModal();
          Alert.alert('E-posta Açıldı', 'Geri bildiriminizi e-posta uygulamanızdan gönderebilirsiniz.');
        } else {
          Alert.alert(
            'Gönderim Başarısız',
            'Geri bildirim gönderilemedi. Lütfen daha sonra tekrar deneyin veya ozcann.talha@gmail.com adresine e-posta gönderin.',
            [{ text: 'Tamam', onPress: closeFeedbackModal }]
          );
        }
      }
    } catch (error) {
      console.log('Feedback submission error:', error);
      Alert.alert('Hata', 'Geri bildirim gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const getFeedbackTypeColor = (type: string) => {
    switch (type) {
      case 'suggestion':
        return colors.warning;
      case 'bug':
        return colors.danger;
      case 'compliment':
        return colors.success;
      default:
        return colors.primary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.modernHeader, { backgroundColor: colors.primary }]}>
        <View style={styles.headerGradientOverlay}>
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.modernHeaderTitle}>Ayarlar</Text>
              <Text style={styles.modernHeaderSubtitle}>
                Tercihlerini yönetin 
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.settingsContent}>
        {/* Theme Settings */}
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.text }]}>🎨 Görünüm</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={handleThemeToggle} style={styles.settingsItem}>
              <View style={styles.settingsItemLeft}>
                <View style={[styles.settingsIconContainer, { backgroundColor: colors.primary + '15' }]}>
                  <Icon name="palette" size={24} color={colors.primary} />
                </View>
                <View style={styles.settingsItemInfo}>
                  <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Tema</Text>
                  <Text style={[styles.settingsItemDesc, { color: colors.textLight }]}>
                    Açık veya koyu tema seçin
                  </Text>
                </View>
              </View>
              <View style={styles.settingsItemRight}>
                <Text style={[styles.settingsValue, { color: colors.primary }]}>
                  {isDarkMode ? 'Koyu' : 'Açık'}
                </Text>
                <Icon name="chevron-right" size={20} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.text }]}>🔔 Bildirimler</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity 
              onPress={() => setShowPushNotificationModal(true)} 
              style={styles.settingsItem}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.settingsIconContainer, { backgroundColor: colors.secondary + '15' }]}>
                  <Icon name="bell" size={24} color={colors.secondary} />
                </View>
                <View style={styles.settingsItemInfo}>
                  <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Push Bildirimleri</Text>
                  <Text style={[styles.settingsItemDesc, { color: colors.textLight }]}>
                    Motivasyon mesajları ve hatırlatmalar
                  </Text>
                </View>
              </View>
              <View style={styles.settingsItemRight}>
                <Text style={[styles.settingsValue, { color: colors.secondary }]}>Ayarla</Text>
                <Icon name="chevron-right" size={20} color={colors.textMuted} />
              </View>
            </TouchableOpacity>

            <View style={styles.settingsDivider} />

            <TouchableOpacity 
              onPress={() => setShowDailyReminderModal(true)} 
              style={styles.settingsItem}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.settingsIconContainer, { backgroundColor: colors.info + '15' }]}>
                  <Icon name="clock-alert" size={24} color={colors.info} />
                </View>
                <View style={styles.settingsItemInfo}>
                  <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Günlük Hatırlatmalar</Text>
                  <Text style={[styles.settingsItemDesc, { color: colors.textLight }]}>
                    Çalışma saatleri ve hedef kontrolü hatırlatmaları
                  </Text>
                </View>
              </View>
              <View style={styles.settingsItemRight}>
                <Text style={[styles.settingsValue, { color: colors.info }]}>Ayarla</Text>
                <Icon name="chevron-right" size={20} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Motivation Settings */}
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.text }]}>💪 Motivasyon</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity 
              onPress={() => {
                // Show a motivational message now
                showMotivationalMessage();
              }} 
              style={styles.settingsItem}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.settingsIconContainer, { backgroundColor: colors.warning + '15' }]}>
                  <Icon name="emoticon-happy" size={24} color={colors.warning} />
                </View>
                <View style={styles.settingsItemInfo}>
                  <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Motivasyon Mesajı Göster</Text>
                  <Text style={[styles.settingsItemDesc, { color: colors.textLight }]}>
                    Hemen bir motivasyon mesajı görmek için dokunun
                  </Text>
                </View>
              </View>
              <View style={styles.settingsItemRight}>
                <Icon name="lightning-bolt" size={20} color={colors.warning} />
              </View>
            </TouchableOpacity>

            <View style={styles.settingsDivider} />

            <TouchableOpacity 
              onPress={() => {
                openMotivationModal();
              }}
              style={styles.settingsItem}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.settingsIconContainer, { backgroundColor: colors.primary + '15' }]}>
                  <Icon name="cog" size={24} color={colors.primary} />
                </View>
                <View style={styles.settingsItemInfo}>
                  <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Motivasyon Ayarları</Text>
                  <Text style={[styles.settingsItemDesc, { color: colors.textLight }]}>
                    Mesaj sıklığı, kategoriler ve zamanlama
                  </Text>
                </View>
              </View>
              <View style={styles.settingsItemRight}>
                <Text style={[styles.settingsValue, { color: colors.primary }]}>Günlük</Text>
                <Icon name="chevron-right" size={20} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Information */}
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.text }]}>ℹ️ Uygulama Bilgileri</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <View style={styles.settingsItem}>
              <View style={styles.settingsItemLeft}>
                <View style={[styles.settingsIconContainer, { backgroundColor: colors.info + '15' }]}>
                  <Icon name="information" size={24} color={colors.info} />
                </View>
                <View style={styles.settingsItemInfo}>
                  <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Sürüm</Text>
                  <Text style={[styles.settingsItemDesc, { color: colors.textLight }]}>
                    Uygulama sürüm bilgisi
                  </Text>
                </View>
              </View>
              <View style={styles.settingsItemRight}>
                <Text style={[styles.settingsValue, { color: colors.text }]}>1.0.0</Text>
              </View>
            </View>

            <View style={styles.settingsDivider} />

            <View style={styles.settingsItem}>
              <View style={styles.settingsItemLeft}>
                <View style={[styles.settingsIconContainer, { backgroundColor: colors.success + '15' }]}>
                  <Icon name="account-group" size={24} color={colors.success} />
                </View>
                <View style={styles.settingsItemInfo}>
                  <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Geliştirici</Text>
                  <Text style={[styles.settingsItemDesc, { color: colors.textLight }]}>
                    nevzattalhaozcan
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.settingsDivider} />

            <View style={styles.settingsItem}>
              <View style={styles.settingsItemLeft}>
                <View style={[styles.settingsIconContainer, { backgroundColor: colors.warning + '15' }]}>
                  <Icon name="calendar-today" size={24} color={colors.warning} />
                </View>
                <View style={styles.settingsItemInfo}>
                  <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Son Güncelleme</Text>
                  <Text style={[styles.settingsItemDesc, { color: colors.textLight }]}>
                    Ekim 2025
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Feedback Section */}
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.text }]}>💬 Geri Bildirim</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={openFeedbackModal} style={styles.settingsItem}>
              <View style={styles.settingsItemLeft}>
                <View style={[styles.settingsIconContainer, { backgroundColor: colors.success + '15' }]}>
                  <Icon name="message-text" size={24} color={colors.success} />
                </View>
                <View style={styles.settingsItemInfo}>
                  <Text style={[styles.settingsItemTitle, { color: colors.text }]}>Görüş ve Önerileriniz</Text>
                  <Text style={[styles.settingsItemDesc, { color: colors.textLight }]}>
                    Uygulamayı geliştirmeme yardımcı olun
                  </Text>
                </View>
              </View>
              <View style={styles.settingsItemRight}>
                <Icon name="chevron-right" size={20} color={colors.textMuted} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.settingsSection}>
          <Text style={[styles.settingsSectionTitle, { color: colors.text }]}>🗂️ Veri Yönetimi</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={clearAllData} style={styles.settingsItem}>
              <View style={styles.settingsItemLeft}>
                <View style={[styles.settingsIconContainer, { backgroundColor: colors.danger + '15' }]}>
                  <Icon name="delete-forever" size={24} color={colors.danger} />
                </View>
                <View style={styles.settingsItemInfo}>
                  <Text style={[styles.settingsItemTitle, { color: colors.danger }]}>Tüm Verileri Temizle</Text>
                  <Text style={[styles.settingsItemDesc, { color: colors.textLight }]}>
                    Bu işlem geri alınamaz! Dikkatli olun.
                  </Text>
                </View>
              </View>
              <View style={styles.settingsItemRight}>
                <Icon name="chevron-right" size={20} color={colors.danger} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Feedback Modal */}
      <Modal
        visible={showFeedbackModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeFeedbackModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                💬 Geri Bildirim
              </Text>
              <TouchableOpacity onPress={closeFeedbackModal}>
                <Icon name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Feedback Type Selection */}
              <Text style={[styles.inputLabel, { color: colors.textLight }]}>
                Geri bildirim türü seçin:
              </Text>
              <View style={styles.feedbackTypeContainer}>
                {[
                  { key: 'suggestion', label: 'Öneri', icon: 'lightbulb-on' },
                  { key: 'bug', label: 'Hata', icon: 'bug' },
                  { key: 'compliment', label: 'Genel', icon: 'heart' }
                ].map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.feedbackTypeButton,
                      { 
                        backgroundColor: feedbackType === type.key ? `${getFeedbackTypeColor(type.key)}15` : colors.backgroundLight,
                        borderColor: feedbackType === type.key ? getFeedbackTypeColor(type.key) : colors.border 
                      }
                    ]}
                    onPress={() => setFeedbackType(type.key)}>
                    <Icon 
                      name={type.icon} 
                      size={20} 
                      color={feedbackType === type.key ? getFeedbackTypeColor(type.key) : colors.textLight} 
                    />
                    <Text style={[
                      styles.feedbackTypeText,
                      { 
                        color: feedbackType === type.key ? getFeedbackTypeColor(type.key) : colors.textLight,
                        fontWeight: feedbackType === type.key ? '600' : '500'
                      }
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Feedback Text */}
              <Text style={[styles.inputLabel, { color: colors.textLight }]}>
                Geri bildiriminiz:
              </Text>
              <TextInput
                style={[styles.feedbackInput, { 
                  backgroundColor: colors.backgroundLight, 
                  color: colors.text,
                  borderColor: colors.border
                }]}
                multiline
                numberOfLines={6}
                placeholder="Düşüncelerinizi, önerilerinizi veya karşılaştığınız sorunları detaylı bir şekilde açıklayın..."
                placeholderTextColor={colors.textMuted}
                value={feedbackText}
                onChangeText={setFeedbackText}
                textAlignVertical="top"
              />

              {/* Email (Optional) */}
              <Text style={[styles.inputLabel, { color: colors.textLight }]}>
                E-posta adresiniz (isteğe bağlı):
              </Text>
              <TextInput
                style={[styles.emailInput, { 
                  backgroundColor: colors.backgroundLight, 
                  color: colors.text,
                  borderColor: colors.border
                }]}
                placeholder="ornek@email.com"
                placeholderTextColor={colors.textMuted}
                value={userEmail}
                onChangeText={setUserEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.backgroundLight }]}
                onPress={closeFeedbackModal}>
                <Text style={[styles.modalButtonText, { color: colors.textLight }]}>İptal</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.submitButton, 
                  { 
                    backgroundColor: isSubmittingFeedback ? colors.textMuted : colors.success,
                    opacity: isSubmittingFeedback ? 0.7 : 1
                  }
                ]}
                onPress={submitFeedback}
                disabled={isSubmittingFeedback}>
                {isSubmittingFeedback ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={[styles.modalButtonText, { color: 'white', marginLeft: 8 }]}>Gönderiliyor...</Text>
                  </>
                ) : (
                  <>
                    <Icon name="send" size={18} color="white" />
                    <Text style={[styles.modalButtonText, { color: 'white', marginLeft: 8 }]}>Gönder</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Push Notification Settings Modal */}
      <PushNotificationSettingsModal
        visible={showPushNotificationModal}
        onClose={() => setShowPushNotificationModal(false)}
      />

      {/* Daily Reminder Settings Modal */}
      <DailyReminderSettingsModal
        visible={showDailyReminderModal}
        onClose={() => setShowDailyReminderModal(false)}
      />
    </View>
  );
}

const Tab = createBottomTabNavigator();

const getTabBarIcon = (route: any, color: string, size: number) => {
  let iconName = '';

  if (route.name === 'Ana Sayfa') {
    iconName = 'home';
  } else if (route.name === 'Dersler') {
    iconName = 'book-multiple';
  } else if (route.name === 'Ajanda') {
    iconName = 'calendar-week';
  } else if (route.name === 'Raporlar') {
    iconName = 'file-chart';
  } else if (route.name === 'Ayarlar') {
    iconName = 'cog';
  }

  return <Icon name={iconName} size={size} color={color} />;
};

function AppContent() {
  const [_weeklySchedule, _setWeeklySchedule] = useState(defaultWeeklySchedule);
  const navigationRef = useRef<any>(null);
  
  // Global modal states
  const [showMotivationModal, setShowMotivationModal] = useState(false);
  
  // Animation states for smooth swipe feedback
  const swipeAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const [isGesturing, setIsGesturing] = useState(false);

  useEffect(() => {
    // Configure notifications on app start (fallback mode)
    console.log('Notifications configured in fallback mode');
    
    // In a real implementation with proper notification library:
    // configureNotifications();
    
    // Show motivational message when app starts
    const showWelcomeMessage = async () => {
      try {
        // Add a small delay to let the app fully load
        setTimeout(async () => {
          await showMotivationalMessage(() => {
            setShowMotivationModal(true);
          });
        }, 2000);
      } catch (error) {
        console.log('Error showing motivational message:', error);
      }
    };
    
    showWelcomeMessage();
  }, []);

  // Create enhanced pan responder for swipe gestures with smooth animations
  const screenWidth = Dimensions.get('window').width;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal swipes with minimum movement
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
        const hasMinMovement = Math.abs(gestureState.dx) > 15;
        return isHorizontal && hasMinMovement;
      },
      onPanResponderGrant: () => {
        // Start gesture - add visual feedback
        setIsGesturing(true);
        Animated.parallel([
          Animated.timing(scaleAnimation, {
            toValue: 0.98,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(swipeAnimation, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]).start();
      },
      onPanResponderMove: (evt, gestureState) => {
        // Provide real-time visual feedback during swipe
        if (isGesturing) {
          const maxSwipe = screenWidth * 0.3;
          const normalizedDx = Math.max(-maxSwipe, Math.min(maxSwipe, gestureState.dx));
          const opacity = Math.abs(normalizedDx) / maxSwipe;
          
          swipeAnimation.setValue(normalizedDx * 0.3);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const swipeThreshold = screenWidth * 0.25;
        setIsGesturing(false);
        
        // Smooth return animation
        Animated.parallel([
          Animated.spring(scaleAnimation, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.spring(swipeAnimation, {
            toValue: 0,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();

        if (navigationRef.current) {
          try {
            const state = navigationRef.current.getState();
            
            // Check if state exists and has the required properties
            if (state && typeof state.index === 'number' && state.routes && Array.isArray(state.routes)) {
              const currentIndex = state.index;
              const routes = state.routes;
              
              if (gestureState.dx > swipeThreshold && currentIndex > 0) {
                // Swipe right - go to previous tab with haptic feedback
                if (Platform.OS === 'android') {
                  // Add subtle vibration feedback for Android
                  // HapticFeedback.impact(HapticFeedback.ImpactFeedbackStyle.Light);
                }
                navigationRef.current.navigate(routes[currentIndex - 1].name);
              } else if (gestureState.dx < -swipeThreshold && currentIndex < routes.length - 1) {
                // Swipe left - go to next tab with haptic feedback  
                if (Platform.OS === 'android') {
                  // Add subtle vibration feedback for Android
                  // HapticFeedback.impact(HapticFeedback.ImpactFeedbackStyle.Light);
                }
                navigationRef.current.navigate(routes[currentIndex + 1].name);
              }
            }
          } catch (error) {
            console.log('Navigation state error:', error);
          }
        }
      },
      onPanResponderTerminate: () => {
        // Reset animations if gesture is interrupted
        setIsGesturing(false);
        Animated.parallel([
          Animated.spring(scaleAnimation, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.spring(swipeAnimation, {
            toValue: 0,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      },
    })
  ).current;

  return (
    <Animated.View 
      style={[
        styles.swipeContainer,
        {
          transform: [
            { translateX: swipeAnimation },
            { scale: scaleAnimation }
          ]
        }
      ]} 
      {...panResponder.panHandlers}
    >
      {/* Swipe Visual Feedback */}
      {isGesturing && (
        <View style={styles.swipeIndicatorContainer} pointerEvents="none">
          <Animated.View 
            style={[
              styles.swipeIndicator,
              {
                opacity: swipeAnimation.interpolate({
                  inputRange: [-100, 0, 100],
                  outputRange: [0.3, 0, 0.3],
                  extrapolate: 'clamp'
                })
              }
            ]}
          />
        </View>
      )}
      
      <NavigationContainer ref={navigationRef}>
        <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
        <ModalContext.Provider value={{ openMotivationModal: () => setShowMotivationModal(true) }}>
      <Tab.Navigator
        id={undefined}
        screenOptions={({route}) => ({
          headerShown: false,
          tabBarIcon: ({color, size}) => getTabBarIcon(route, color, size),
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 90 : 70,
            paddingBottom: Platform.OS === 'ios' ? 25 : 15,
            paddingTop: 10,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        })}
      >
        <Tab.Screen name="Ana Sayfa" component={HomeScreen} />
        <Tab.Screen name="Dersler" component={CoursesScreen} />
        <Tab.Screen name="Ajanda" component={AgendaScreen} />
        <Tab.Screen name="Raporlar" component={ReportsScreen} />
        <Tab.Screen name="Ayarlar" component={SettingsScreen} />
      </Tab.Navigator>
      </ModalContext.Provider>
      
      {/* Global Motivation Settings Modal */}
      <MotivationSettingsModal
        visible={showMotivationModal}
        onClose={() => setShowMotivationModal(false)}
      />
    </NavigationContainer>
    </Animated.View>
  );
}

export default function App() {
  return <AppContent />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  swipeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  swipeIndicatorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  centerText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 18,
    color: colors.text,
  },
  homeContent: {
    paddingTop: 25,
    paddingBottom: 100,
  },
  topSection: {
    marginBottom: 20,
  },
  modernHeader: {
    paddingTop: 35,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
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
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: 'white',
  },
  modernHeaderSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
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
  dailyGoalCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontWeight: 'bold',
  },
  dailyGoalSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  goalActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalProgressBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  goalProgressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  progressItem: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: colors.cardSecondary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  progressIcon: {
    marginBottom: 8,
  },
  progressValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  progressTarget: {
    fontSize: 12,
    color: colors.textLight,
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
  compactTimerSection: {
    marginTop: 16,
    marginHorizontal: 20,
  },
  timerCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  timerDisplay: {
    fontSize: 42,
    fontWeight: 'bold',
    marginVertical: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  timerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  timerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sessionInputs: {
    width: '100%',
    marginTop: 16,
    gap: 8,
  },
  inputRow: {
    width: '100%',
  },
  sessionInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  // Progress Screen Styles
  weeklyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingHorizontal: 10,
  },
  chartDay: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: 20,
    borderRadius: 10,
    marginBottom: 8,
  },
  chartDayLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  chartDayValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  summaryLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Reports Screen Styles
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  reportLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  reportValue: {
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'right',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  // Settings Screen Styles
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  settingsInfo: {
    flex: 1,
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingsDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  dangerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButtonDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  chartCardPadding: {
    padding: 20,
  },
  // Courses and Topics Styles
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: 16,
  },
  courseCard: {
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  courseIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  courseStats: {
    fontSize: 14,
    marginBottom: 2,
  },
  courseTime: {
    fontSize: 12,
  },
  courseProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 40,
  },
  topicCard: {
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  topicInfo: {
    flex: 1,
  },
  topicName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  topicStats: {
    fontSize: 14,
    marginBottom: 2,
  },
  topicTime: {
    fontSize: 12,
  },
  topicCompleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  completedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  // Table styles for checkbox layout
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginTop: 16,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  topicNameColumn: {
    flex: 3,
    paddingRight: 8,
  },
  topicNameText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  topicNameTextFlex: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    flex: 1,
  },
  topicNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topicMenuButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  addTopicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    gap: 8,
  },
  addTopicButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  addTopicButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    borderRadius: 6,
    gap: 6,
  },
  addTopicButtonSmallText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  checkboxColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerAlign: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxTouchArea: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  // Modal styles for daily goal creation
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  scheduleModal: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    padding: 0,
  },
  modalTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#DC3545',
    width: '100%',
    marginTop: 12,
  },
  modalButtonTextWhite: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  modalBody: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  modalSubject: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: '48%',
    marginBottom: 8,
  },
  topicItemText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  timeInput: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  timeButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  questionValue: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: 6,
  },
  saveButton: {
    marginLeft: 6,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Study Log Styles
  studyLogSection: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  logButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E5BFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#2E5BFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    minHeight: 48,
  },
  logButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  motivationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    minHeight: 48,
  },
  motivationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  motivationButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  motivationButtonTextContainer: {
    flex: 1,
  },
  motivationButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  motivationButtonSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '500',
  },
  todayLogSummary: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  logSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sessionCountBadge: {
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  sessionCountText: {
    fontSize: 10,
    fontWeight: '500',
  },
  logSummaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  logStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logStatText: {
    fontSize: 12,
    marginLeft: 4,
  },
  
  // Study Log Modal Styles
  logSection: {
    marginBottom: 24,
  },
  logSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  logInputGroup: {
    marginBottom: 16,
  },
  logLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  inputWithButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  numberInput: {
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 12,
    minWidth: 80,
    maxWidth: 120,
  },
  counterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
    minWidth: 50,
    textAlign: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTopicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  customTopicText: {
    flex: 1,
    fontSize: 14,
  },
  
  // Custom Picker Modal Styles
  courseSection: {
    marginBottom: 20,
  },
  courseSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  topicSelectItem: {
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  topicSelectText: {
    fontSize: 14,
    fontWeight: '500',
  },
  courseSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  courseSelectText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  courseSelectCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Selected Topics Styles
  selectedTopicsSection: {
    marginBottom: 16,
  },
  selectedTopicsTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedTopicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedTopicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  selectedTopicText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Goal Actions Styles
  goalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalEditButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Agenda Screen Styles
  agendaDayCard: {
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  agendaDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  agendaDayIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  agendaDayInfo: {
    flex: 1,
  },
  agendaDayName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  agendaSubject: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  agendaTemplateInfo: {
    fontSize: 12,
    lineHeight: 16,
  },
  agendaDayActions: {
    flexDirection: 'row',
    gap: 8,
  },
  agendaActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agendaTemplateTopics: {
    marginTop: 8,
  },
  agendaTemplateTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  agendaTopicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  agendaTopicChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  agendaTopicText: {
    fontSize: 11,
    fontWeight: '500',
  },
  agendaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  agendaHeaderButton: {
    padding: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalScrollView: {
    maxHeight: 400,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  courseSelector: {
    paddingVertical: 8,
  },
  courseOption: {
    marginRight: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  courseOptionText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  boldText: {
    fontWeight: 'bold',
  },
  normalText: {
    fontWeight: 'normal',
  },
  opacityFull: {
    opacity: 1,
  },
  opacityReduced: {
    opacity: 0.85,
  },
  dropdownContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    marginTop: 4,
  },
  dayDropdown: {
    paddingVertical: 4,
  },
  dayOption: {
    marginRight: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    minWidth: 75,
  },
  dayOptionText: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  dayOptionSelected: {
    backgroundColor: colors.primary,
  },
  dayOptionUnselected: {
    backgroundColor: 'transparent',
  },
  dayTextSelected: {
    color: 'white',
  },
  dayTextUnselected: {
    color: colors.text,
  },
  // Topic Management Modal Styles
  topicManagementModal: {
    width: '92%',
    maxHeight: '85%',
    borderRadius: 20,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    padding: 0,
  },
  topicModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topicModalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  topicModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
    flex: 1,
  },
  topicModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicModalCourseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  topicModalCourseName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  topicModalBody: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 32,
  },
  topicModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  topicModalTextInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 24,
    minHeight: 50,
  },
  topicModalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  topicModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  topicModalCancelButton: {
    borderWidth: 1.5,
  },
  topicModalSaveButton: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  topicModalDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  topicModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // New Agenda Styles
  instructionsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  instructionsText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  headerActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newAgendaDayContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  todayHighlight: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  newAgendaDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  agendaDayTitleSection: {
    flex: 1,
  },
  agendaDayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayText: {
    color: '#4CAF50',
  },
  todayBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  todayBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  agendaCourseCount: {
    fontSize: 14,
  },
  newAgendaDayActions: {
    flexDirection: 'row',
    gap: 8,
  },
  agendaDayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agendaCoursesContainer: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  agendaCourseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  agendaCourseContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  agendaCourseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  agendaCourseInfo: {
    flex: 1,
  },
  agendaCourseText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  agendaCourseGoal: {
    fontSize: 12,
  },
  agendaCourseActions: {
    flexDirection: 'row',
    gap: 8,
    marginRight: 8,
  },
  agendaCourseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newCourseSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  courseSelectIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  courseSelectInfo: {
    flex: 1,
  },
  courseSelectName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  courseSelectTopics: {
    fontSize: 14,
  },
  agendaCourseItemActive: {
    elevation: 8,
    shadowOpacity: 0.3,
  },
  agendaCourseItemInactive: {
    elevation: 2,
    shadowOpacity: 0.1,
  },
  customActivityBadge: {
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  sectionDivider: {
    height: 1,
    marginVertical: 16,
    marginHorizontal: 20,
  },
  iconSelectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  iconSelectButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  colorSelectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 20,
  },
  calendarContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  calendarHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'column',
    gap: 16,
  },
  calendarDayCard: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 80,
  },
  calendarDayName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  todayIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  calendarCourses: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 2,
  },
  calendarCourseItem: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMoreText: {
    fontSize: 10,
    fontWeight: '500',
  },
  calendarWeekRow: {
    marginBottom: 20,
  },
  calendarRowTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  calendarDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  calendarWeekendCard: {
    borderWidth: 2,
    borderColor: '#F3E8FF',
  },
  calendarCourseText: {
    textAlign: 'center',
    marginVertical: 1,
  },
  goalDetailsContainer: {
    padding: 8,
  },
  goalSummaryCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  goalSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  goalSummarySubtext: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  goalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  goalStatItem: {
    alignItems: 'center',
  },
  goalStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  goalStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  noGoalsCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noGoalsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  noGoalsSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Day Details Modal Styles
  dayOverviewCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dayOverviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayOverviewInfo: {
    flex: 1,
  },
  dayOverviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayOverviewSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  addCourseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addCourseButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  dayDetailsCourseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  dayDetailsCourseIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dayDetailsCourseInfo: {
    flex: 1,
  },
  dayDetailsCourseName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  customBadge: {
    fontSize: 12,
    fontWeight: '500',
  },
  courseGoalText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyCoursesCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyCoursesTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyCoursesSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  goalsOverviewCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  goalsOverviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalsOverviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  goalsOverviewSubtext: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  goalStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  alreadyAddedBadge: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  // Chart styles
  chartsModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  chartsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  chartsModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  chartsModalContent: {
    flex: 1,
    padding: 16,
  },
  chartSection: {
    marginBottom: 25,
    padding: 25,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 4.65,
    elevation: 6,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  chartSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.7,
    fontWeight: '500',
  },
  chartContainer: {
    height: 200,
    justifyContent: 'flex-end',
    paddingVertical: 10,
  },
  // Line chart styles
  lineChartContainer: {
    height: 220,
    position: 'relative',
    marginVertical: 15,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  lineChartGrid: {
    position: 'absolute',
    top: 24,
    left: 32,
    right: 32,
    bottom: 60,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
    opacity: 0.2,
  },
  lineChartPath: {
    position: 'absolute',
    top: 24,
    left: 32,
    right: 32,
    bottom: 60,
  },
  lineChartPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
    marginTop: -4,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    zIndex: 1,
    borderRadius: 1,
  },
  lineChartLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    opacity: 0.6,
  },
  lineChartLabels: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    height: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  lineChartLabelContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 3,
    maxWidth: 40,
  },
  chartBarWrapper: {
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 4,
  },
  chartBarGraph: {
    width: '100%',
    borderRadius: 6,
    minHeight: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  chartLabel: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  chartValue: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '700',
    opacity: 0.9,
  },
  // Summary stats styles
  summaryStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  summaryStatLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  
  // Settings Screen Styles
  headerIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsContent: {
    padding: 16,
    paddingBottom: 100,
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 4,
  },
  settingsCard: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingVertical: 18,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingsItemInfo: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingsItemDesc: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 18,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  settingsValue: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 80,
    opacity: 0.5,
  },
  switchContainer: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    position: 'relative',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },

  // Log Viewer Modal Styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  logViewCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  logViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  logViewDate: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  logViewTime: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
  },
  logViewHeaderText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
    opacity: 0.8,
  },
  deleteLogButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,59,59,0.1)',
  },
  logViewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 16,
    borderRadius: 12,
  },
  logViewStat: {
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  logViewStatIcon: {
    marginBottom: 8,
    backgroundColor: 'rgba(0,123,255,0.1)',
    padding: 8,
    borderRadius: 20,
  },
  logViewStatText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  logViewStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 4,
  },
  logViewTopics: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  logViewTopicsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    color: '#666',
  },
  logViewTopicText: {
    fontSize: 13,
    marginLeft: 12,
    marginBottom: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,123,255,0.1)',
    borderRadius: 6,
    color: '#007AFF',
    fontWeight: '500',
  },
  logViewNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    marginRight: 12,
    minWidth: 30,
  },
  logViewIndexContainer: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  logViewIndexText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  logViewTopicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  // Feedback Specific Styles
  feedbackTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feedbackTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackTypeText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  emailInput: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    height: 50,
  },
  submitButton: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});