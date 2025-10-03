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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  motivationalPushService,
  PushNotificationConfig,
  sendMotivationalPush,
} from './pushNotificationService';

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

interface PushNotificationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PushNotificationSettingsModal: React.FC<PushNotificationSettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const [config, setConfig] = useState<PushNotificationConfig>({
    enabled: true,
    dailyTime: '09:00',
    weeklyDay: 1,
    categories: ['motivation', 'success', 'persistence', 'wisdom', 'encouragement'],
    title: '💪 KPSS Motivasyonu',
    soundName: 'default',
    importance: 'high',
  });

  const [loading, setLoading] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notificationStats, setNotificationStats] = useState({
    scheduled: 0,
    lastScheduled: null as string | null,
    nextNotification: null as Date | null,
  });

  // Load configuration when modal opens
  useEffect(() => {
    if (visible) {
      loadConfig();
      loadNotificationStats();
    }
  }, [visible]);

  const loadConfig = async () => {
    try {
      const loadedConfig = await motivationalPushService.getConfig();
      setConfig(loadedConfig);
    } catch (error) {
      console.error('Error loading push config:', error);
    }
  };

  const loadNotificationStats = async () => {
    try {
      const stats = await motivationalPushService.getNotificationStats();
      setNotificationStats(stats);
    } catch (error) {
      console.error('Error loading notification stats:', error);
    }
  };

  const saveConfig = async () => {
    try {
      setLoading(true);
      await motivationalPushService.saveConfig(config);
      await loadNotificationStats(); // Reload stats after saving
      Alert.alert('✅ Başarılı', 'Bildirim ayarları kaydedildi ve zamanlandı!');
      onClose();
    } catch (error) {
      console.error('Error saving push config:', error);
      Alert.alert('❌ Hata', 'Ayarlar kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setConfig(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setConfig(prev => ({
        ...prev,
        dailyTime: `${hours}:${minutes}`,
      }));
    }
  };

  const sendTestNotification = async () => {
    try {
      await motivationalPushService.sendTestNotification();
      Alert.alert('🧪 Test Gönderildi', 'Test bildirimi gönderildi. Cihazınızda görmelisiniz.');
    } catch (error) {
      Alert.alert('❌ Hata', 'Test bildirimi gönderilemedi.');
    }
  };

  const categoryInfo = [
    {
      id: 'motivation',
      name: 'Motivasyon',
      icon: 'fire',
      color: colors.primary,
      description: 'Genel motivasyon mesajları',
    },
    {
      id: 'success',
      name: 'Başarı',
      icon: 'trophy',
      color: colors.warning,
      description: 'Başarı odaklı mesajlar',
    },
    {
      id: 'persistence',
      name: 'Azim',
      icon: 'strength',
      color: colors.danger,
      description: 'Kararlılık mesajları',
    },
    {
      id: 'wisdom',
      name: 'Bilgelik',
      icon: 'brain',
      color: colors.info,
      description: 'Öğrenme ve bilgi mesajları',
    },
    {
      id: 'encouragement',
      name: 'Cesaret',
      icon: 'heart',
      color: colors.success,
      description: 'Cesaretlendirici mesajlar',
    },
  ];

  const dayNames = [
    'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
  ];

  const importanceOptions = [
    { id: 'high', name: 'Yüksek', description: 'Çok önemli bildirimler' },
    { id: 'default', name: 'Normal', description: 'Standart bildirimler' },
    { id: 'low', name: 'Düşük', description: 'Sessiz bildirimler' },
  ];

  const getTimeFromString = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

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
              🔔 Bildirim Ayarları
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Enable/Disable Push Notifications */}
            <View style={[styles.section, { backgroundColor: colors.backgroundLight }]}>
              <View style={styles.sectionHeader}>
                <Icon name="bell" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Push Bildirimleri
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
                Uygulama kapalıyken bile motivasyon mesajları alın
              </Text>
            </View>

            {config.enabled && (
              <>
                {/* Notification Statistics */}
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
                        {notificationStats.scheduled}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textLight }]}>
                        Zamanlanmış
                      </Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: colors.success }]}>
                        {notificationStats.nextNotification 
                          ? notificationStats.nextNotification.toLocaleDateString('tr-TR')
                          : 'Yok'
                        }
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textLight }]}>
                        Sonraki Bildirim
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Daily Time Settings */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Icon name="clock" size={20} color={colors.secondary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Günlük Bildirim Saati
                    </Text>
                  </View>
                  <Text style={[styles.sectionDescription, { color: colors.textLight }]}>
                    Her gün motivasyon mesajı alacağınız saat
                  </Text>
                  
                  <TouchableOpacity
                    style={[styles.timeButton, { backgroundColor: colors.secondary + '15', borderColor: colors.secondary }]}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Icon name="clock-outline" size={20} color={colors.secondary} />
                    <Text style={[styles.timeButtonText, { color: colors.secondary }]}>
                      {config.dailyTime}
                    </Text>
                    <Icon name="chevron-right" size={16} color={colors.secondary} />
                  </TouchableOpacity>
                </View>

                {/* Importance Level */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Icon name="alert" size={20} color={colors.warning} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Önem Seviyesi
                    </Text>
                  </View>
                  <Text style={[styles.sectionDescription, { color: colors.textLight }]}>
                    Bildirimlerin öncelik seviyesini belirleyin
                  </Text>
                  
                  {importanceOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.optionItem,
                        {
                          backgroundColor: config.importance === option.id 
                            ? colors.warning + '15' 
                            : colors.background,
                          borderColor: config.importance === option.id 
                            ? colors.warning 
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
                        color={config.importance === option.id ? colors.warning : colors.textMuted}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Message Categories */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Icon name="tag-multiple" size={20} color={colors.success} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Mesaj Kategorileri
                    </Text>
                  </View>
                  <Text style={[styles.sectionDescription, { color: colors.textLight }]}>
                    Hangi tür motivasyon mesajları almak istediğinizi seçin
                  </Text>
                  
                  {categoryInfo.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryToggle,
                        {
                          backgroundColor: config.categories.includes(category.id)
                            ? category.color + '15'
                            : colors.background,
                          borderColor: config.categories.includes(category.id)
                            ? category.color
                            : colors.border,
                        },
                      ]}
                      onPress={() => toggleCategory(category.id)}
                    >
                      <View style={styles.categoryLeft}>
                        <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                          <Icon name={category.icon} size={18} color={category.color} />
                        </View>
                        <View style={styles.categoryInfo}>
                          <Text style={[styles.categoryName, { color: colors.text }]}>
                            {category.name}
                          </Text>
                          <Text style={[styles.categoryDescription, { color: colors.textLight }]}>
                            {category.description}
                          </Text>
                        </View>
                      </View>
                      <Icon
                        name={config.categories.includes(category.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={20}
                        color={config.categories.includes(category.id) ? category.color : colors.textMuted}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Test Notification */}
                <View style={styles.section}>
                  <TouchableOpacity
                    style={[styles.testButton, { backgroundColor: colors.info }]}
                    onPress={sendTestNotification}
                  >
                    <Icon name="test-tube" size={20} color="white" />
                    <Text style={styles.testButtonText}>Test Bildirimi Gönder</Text>
                  </TouchableOpacity>
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
              value={getTimeFromString(config.dailyTime)}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={handleTimeChange}
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
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
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
  categoryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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

export default PushNotificationSettingsModal;