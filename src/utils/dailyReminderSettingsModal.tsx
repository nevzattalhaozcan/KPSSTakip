import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  Alert,
  StyleSheet,
  Platform,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  dailyReminderService,
  DailyReminderConfig,
} from './dailyReminderService';

// Color definitions (matching your app's colors)
const colors = {
  primary: '#2E5BFF',
  secondary: '#FF6B35',
  success: '#28a745',
  warning: '#FFC107',
  danger: '#DC3545',
  info: '#17a2b8',
  background: '#FFFFFF',
  backgroundLight: '#F8F9FA',
  card: '#FFFFFF',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  textMuted: '#BDC3C7',
  border: '#E9ECEF',
};

interface DailyReminderSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DailyReminderSettingsModal: React.FC<DailyReminderSettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const [config, setConfig] = useState<DailyReminderConfig>({
    enabled: true,
    studyReminder: {
      enabled: true,
      time: '09:00',
      title: '📚 Çalışma Zamanı!',
      message: 'Bugünkü KPSS çalışmana başlama zamanı geldi. Hedeflerine ulaşmak için şimdi başla!',
    },
    goalReminder: {
      enabled: true,
      time: '18:00',
      title: '🎯 Günlük Hedef Kontrolü',
      message: 'Bugünkü hedeflerini kontrol et. Tamamladıkların için kendini tebrik et!',
    },
    progressReminder: {
      enabled: true,
      time: '21:00',
      title: '📈 Günlük İlerleme',
      message: 'Bugün ne kadar ilerleme kaydettin? Çalışmalarını kaydetmeyi unutma!',
    },
    weeklyReview: {
      enabled: true,
      day: 0,
      time: '19:00',
      title: '📊 Haftalık Değerlendirme',
      message: 'Bu hafta nasıl geçti? İlerlemeni gözden geçir ve gelecek hafta için plan yap!',
    },
    soundName: 'default',
    importance: 'high',
    vibrate: true,
  });

  const [loading, setLoading] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<string | null>(null);
  const [reminderStats, setReminderStats] = useState({
    totalScheduled: 0,
    nextReminder: null as Date | null,
    activeReminders: [] as string[],
  });

  // Load configuration when modal opens
  useEffect(() => {
    if (visible) {
      loadConfig();
      loadReminderStats();
    }
  }, [visible]);

  const loadConfig = async () => {
    try {
      const loadedConfig = await dailyReminderService.getConfig();
      setConfig(loadedConfig);
    } catch (error) {
      console.error('Error loading daily reminder config:', error);
    }
  };

  const loadReminderStats = async () => {
    try {
      const stats = await dailyReminderService.getReminderStats();
      setReminderStats(stats);
    } catch (error) {
      console.error('Error loading reminder stats:', error);
    }
  };

  const saveConfig = async () => {
    try {
      setLoading(true);
      await dailyReminderService.saveConfig(config);
      await loadReminderStats(); // Reload stats after saving
      Alert.alert('✅ Başarılı', 'Günlük hatırlatma ayarları kaydedildi ve zamanlandı!');
      onClose();
    } catch (error) {
      console.error('Error saving daily reminder config:', error);
      Alert.alert('❌ Hata', 'Ayarlar kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date, reminderType?: string) => {
    setShowTimePicker(null);
    
    if (selectedTime && reminderType) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      if (reminderType === 'studyReminder') {
        setConfig(prev => ({
          ...prev,
          studyReminder: { ...prev.studyReminder, time: timeString },
        }));
      } else if (reminderType === 'goalReminder') {
        setConfig(prev => ({
          ...prev,
          goalReminder: { ...prev.goalReminder, time: timeString },
        }));
      } else if (reminderType === 'progressReminder') {
        setConfig(prev => ({
          ...prev,
          progressReminder: { ...prev.progressReminder, time: timeString },
        }));
      } else if (reminderType === 'weeklyReview') {
        setConfig(prev => ({
          ...prev,
          weeklyReview: { ...prev.weeklyReview, time: timeString },
        }));
      }
    }
  };

  const sendTestReminder = async (type: 'study' | 'goal' | 'progress' | 'weekly') => {
    try {
      await dailyReminderService.sendTestReminder(type);
      Alert.alert('🧪 Test Gönderildi', 'Test hatırlatması gönderildi. Cihazınızda görmelisiniz.');
    } catch (error) {
      Alert.alert('❌ Hata', 'Test hatırlatması gönderilemedi.');
    }
  };

  const getTimeFromString = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const dayNames = [
    'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
  ];

  const importanceOptions = [
    { id: 'high', name: 'Yüksek', description: 'Çok önemli hatırlatmalar' },
    { id: 'default', name: 'Normal', description: 'Standart hatırlatmalar' },
    { id: 'low', name: 'Düşük', description: 'Sessiz hatırlatmalar' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              ⏰ Günlük Hatırlatmalar
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Enable/Disable Daily Reminders */}
            <View style={[styles.section, { backgroundColor: colors.backgroundLight }]}>
              <View style={styles.sectionHeader}>
                <Icon name="bell-ring" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Günlük Hatırlatmalar
                </Text>
                <Switch
                  value={config.enabled}
                  onValueChange={(value) =>
                    setConfig(prev => ({ ...prev, enabled: value }))
                  }
                  trackColor={{ false: colors.border, true: colors.primary + '30' }}
                  thumbColor={config.enabled ? colors.primary : colors.textMuted}
                />
              </View>
              <Text style={[styles.sectionDescription, { color: colors.textLight }]}>
                Çalışma, hedef ve ilerleme hatırlatmaları alın
              </Text>
            </View>

            {config.enabled && (
              <>
                {/* Reminder Statistics */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Icon name="chart-line" size={20} color={colors.info} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      İstatistikler
                    </Text>
                  </View>
                  
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: colors.primary }]}>
                        {reminderStats.totalScheduled}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textLight }]}>
                        Zamanlanmış
                      </Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: colors.success }]}>
                        {reminderStats.activeReminders.length}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textLight }]}>
                        Aktif Tür
                      </Text>
                    </View>

                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: colors.warning }]}>
                        {reminderStats.nextReminder 
                          ? reminderStats.nextReminder.toLocaleTimeString('tr-TR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })
                          : 'Yok'
                        }
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textLight }]}>
                        Sonraki
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Study Reminder */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Icon name="book-open" size={20} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Çalışma Hatırlatması
                    </Text>
                    <Switch
                      value={config.studyReminder.enabled}
                      onValueChange={(value) =>
                        setConfig(prev => ({
                          ...prev,
                          studyReminder: { ...prev.studyReminder, enabled: value }
                        }))
                      }
                      trackColor={{ false: colors.border, true: colors.primary + '30' }}
                      thumbColor={config.studyReminder.enabled ? colors.primary : colors.textMuted}
                    />
                  </View>
                  
                  {config.studyReminder.enabled && (
                    <>
                      <TouchableOpacity
                        style={[styles.timeButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                        onPress={() => setShowTimePicker('studyReminder')}
                      >
                        <Icon name="clock-outline" size={20} color={colors.primary} />
                        <Text style={[styles.timeButtonText, { color: colors.primary }]}>
                          {config.studyReminder.time}
                        </Text>
                        <Icon name="chevron-right" size={16} color={colors.primary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.testButton, { backgroundColor: colors.primary }]}
                        onPress={() => sendTestReminder('study')}
                      >
                        <Icon name="test-tube" size={16} color="white" />
                        <Text style={styles.testButtonText}>Test Et</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Goal Reminder */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Icon name="target" size={20} color={colors.warning} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Hedef Kontrolü
                    </Text>
                    <Switch
                      value={config.goalReminder.enabled}
                      onValueChange={(value) =>
                        setConfig(prev => ({
                          ...prev,
                          goalReminder: { ...prev.goalReminder, enabled: value }
                        }))
                      }
                      trackColor={{ false: colors.border, true: colors.warning + '30' }}
                      thumbColor={config.goalReminder.enabled ? colors.warning : colors.textMuted}
                    />
                  </View>
                  
                  {config.goalReminder.enabled && (
                    <>
                      <TouchableOpacity
                        style={[styles.timeButton, { backgroundColor: colors.warning + '15', borderColor: colors.warning }]}
                        onPress={() => setShowTimePicker('goalReminder')}
                      >
                        <Icon name="clock-outline" size={20} color={colors.warning} />
                        <Text style={[styles.timeButtonText, { color: colors.warning }]}>
                          {config.goalReminder.time}
                        </Text>
                        <Icon name="chevron-right" size={16} color={colors.warning} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.testButton, { backgroundColor: colors.warning }]}
                        onPress={() => sendTestReminder('goal')}
                      >
                        <Icon name="test-tube" size={16} color="white" />
                        <Text style={styles.testButtonText}>Test Et</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Progress Reminder */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Icon name="chart-line" size={20} color={colors.success} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      İlerleme Bildirimi
                    </Text>
                    <Switch
                      value={config.progressReminder.enabled}
                      onValueChange={(value) =>
                        setConfig(prev => ({
                          ...prev,
                          progressReminder: { ...prev.progressReminder, enabled: value }
                        }))
                      }
                      trackColor={{ false: colors.border, true: colors.success + '30' }}
                      thumbColor={config.progressReminder.enabled ? colors.success : colors.textMuted}
                    />
                  </View>
                  
                  {config.progressReminder.enabled && (
                    <>
                      <TouchableOpacity
                        style={[styles.timeButton, { backgroundColor: colors.success + '15', borderColor: colors.success }]}
                        onPress={() => setShowTimePicker('progressReminder')}
                      >
                        <Icon name="clock-outline" size={20} color={colors.success} />
                        <Text style={[styles.timeButtonText, { color: colors.success }]}>
                          {config.progressReminder.time}
                        </Text>
                        <Icon name="chevron-right" size={16} color={colors.success} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.testButton, { backgroundColor: colors.success }]}
                        onPress={() => sendTestReminder('progress')}
                      >
                        <Icon name="test-tube" size={16} color="white" />
                        <Text style={styles.testButtonText}>Test Et</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Weekly Review */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Icon name="calendar-week" size={20} color={colors.info} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Haftalık Değerlendirme
                    </Text>
                    <Switch
                      value={config.weeklyReview.enabled}
                      onValueChange={(value) =>
                        setConfig(prev => ({
                          ...prev,
                          weeklyReview: { ...prev.weeklyReview, enabled: value }
                        }))
                      }
                      trackColor={{ false: colors.border, true: colors.info + '30' }}
                      thumbColor={config.weeklyReview.enabled ? colors.info : colors.textMuted}
                    />
                  </View>
                  
                  {config.weeklyReview.enabled && (
                    <>
                      <View style={styles.weeklySettings}>
                        <TouchableOpacity
                          style={[styles.timeButton, { backgroundColor: colors.info + '15', borderColor: colors.info }]}
                          onPress={() => setShowTimePicker('weeklyReview')}
                        >
                          <Icon name="clock-outline" size={20} color={colors.info} />
                          <Text style={[styles.timeButtonText, { color: colors.info }]}>
                            {dayNames[config.weeklyReview.day]} {config.weeklyReview.time}
                          </Text>
                          <Icon name="chevron-right" size={16} color={colors.info} />
                        </TouchableOpacity>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
                          {dayNames.map((day, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.dayOption,
                                {
                                  backgroundColor: config.weeklyReview.day === index 
                                    ? colors.info 
                                    : colors.backgroundLight,
                                  borderColor: config.weeklyReview.day === index 
                                    ? colors.info 
                                    : colors.border,
                                }
                              ]}
                              onPress={() =>
                                setConfig(prev => ({
                                  ...prev,
                                  weeklyReview: { ...prev.weeklyReview, day: index }
                                }))
                              }
                            >
                              <Text style={[
                                styles.dayOptionText,
                                { color: config.weeklyReview.day === index ? 'white' : colors.text }
                              ]}>
                                {day.substring(0, 3)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>

                      <TouchableOpacity
                        style={[styles.testButton, { backgroundColor: colors.info }]}
                        onPress={() => sendTestReminder('weekly')}
                      >
                        <Icon name="test-tube" size={16} color="white" />
                        <Text style={styles.testButtonText}>Test Et</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Sound and Vibration Settings */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Icon name="volume-high" size={20} color={colors.secondary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Ses ve Titreşim
                    </Text>
                  </View>
                  
                  <View style={styles.settingRow}>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>Titreşim</Text>
                    <Switch
                      value={config.vibrate}
                      onValueChange={(value) =>
                        setConfig(prev => ({ ...prev, vibrate: value }))
                      }
                      trackColor={{ false: colors.border, true: colors.secondary + '30' }}
                      thumbColor={config.vibrate ? colors.secondary : colors.textMuted}
                    />
                  </View>
                  
                  {/* Importance Level */}
                  <Text style={[styles.subsectionTitle, { color: colors.textLight }]}>
                    Önem Seviyesi
                  </Text>
                  {importanceOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.optionItem,
                        {
                          backgroundColor: config.importance === option.id 
                            ? colors.secondary + '15' 
                            : colors.background,
                          borderColor: config.importance === option.id 
                            ? colors.secondary 
                            : colors.border,
                        },
                      ]}
                      onPress={() =>
                        setConfig(prev => ({ ...prev, importance: option.id as any }))
                      }
                    >
                      <View style={styles.optionContent}>
                        <Text style={[styles.optionName, { color: colors.text }]}>
                          {option.name}
                        </Text>
                        <Text style={[styles.optionDescription, { color: colors.textLight }]}>
                          {option.description}
                        </Text>
                      </View>
                      <Icon
                        name={config.importance === option.id ? 'radiobox-marked' : 'radiobox-blank'}
                        size={20}
                        color={config.importance === option.id ? colors.secondary : colors.textMuted}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.modalButtonText, { color: colors.textMuted }]}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.saveButton,
                { 
                  backgroundColor: loading ? colors.textMuted : colors.primary,
                  opacity: loading ? 0.7 : 1 
                }
              ]}
              onPress={saveConfig}
              disabled={loading}
            >
              <Text style={[styles.modalButtonText, { color: 'white' }]}>
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Time Picker */}
          {showTimePicker && (
            <DateTimePicker
              value={getTimeFromString(
                showTimePicker === 'studyReminder' ? config.studyReminder.time :
                showTimePicker === 'goalReminder' ? config.goalReminder.time :
                showTimePicker === 'progressReminder' ? config.progressReminder.time :
                config.weeklyReview.time
              )}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={(event, selectedTime) => handleTimeChange(event, selectedTime, showTimePicker)}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 16,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundLight,
  },
  modalBody: {
    maxHeight: '70%',
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  weeklySettings: {
    marginBottom: 12,
  },
  daySelector: {
    marginTop: 12,
  },
  dayOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  dayOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionContent: {
    flex: 1,
  },
  optionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {},
  saveButton: {},
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DailyReminderSettingsModal;