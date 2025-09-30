import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  configureNotifications,
  scheduleWeeklyReminders,
  scheduleEveningMotivation,
  cancelAllNotifications,
  sendTestNotification,
} from '../utils/notifications';

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

const SettingsScreen = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [morningReminder, setMorningReminder] = useState(true);
  const [eveningReminder, setEveningReminder] = useState(true);

  useEffect(() => {
    loadSettings();
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      await configureNotifications();
    } catch (error) {
      console.log('Notification initialization error:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setNotificationsEnabled(parsed.notificationsEnabled || false);
        setMorningReminder(parsed.morningReminder || true);
        setEveningReminder(parsed.eveningReminder || true);
      }
    } catch (error) {
      console.log('Ayarlar yüklenemedi:', error);
    }
  };

  const saveSettings = async (key: string, value: boolean) => {
    try {
      const settings = await AsyncStorage.getItem('settings');
      const parsed = settings ? JSON.parse(settings) : {};
      parsed[key] = value;
      await AsyncStorage.setItem('settings', JSON.stringify(parsed));
    } catch (error) {
      console.log('Ayarlar kaydedilemedi:', error);
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    try {
      setNotificationsEnabled(value);
      await saveSettings('notificationsEnabled', value);

      if (value) {
        const success = await scheduleWeeklyReminders();
        if (success) {
          if (eveningReminder) {
            scheduleEveningMotivation();
          }
          Alert.alert(
            'Bildirimler Açıldı',
            'Günlük hatırlatıcılarınız ayarlandı! 🔔'
          );
        } else {
          setNotificationsEnabled(false);
          Alert.alert(
            'Bildirim İzni Gerekli',
            'Bildirimler için izin verin. Ayarlar > Uygulamalar > KPSS Takip > Bildirimler'
          );
        }
      } else {
        cancelAllNotifications();
        Alert.alert('Bildirimler Kapatıldı', 'Tüm hatırlatıcılar iptal edildi.');
      }
    } catch (error) {
      console.log('Notification toggle error:', error);
      setNotificationsEnabled(false);
      Alert.alert('Hata', 'Bildirim ayarları güncellenirken bir hata oluştu.');
    }
  };

  const handleMorningReminderToggle = (value: boolean) => {
    setMorningReminder(value);
    saveSettings('morningReminder', value);
    if (notificationsEnabled) {
      if (value) {
        scheduleWeeklyReminders();
      }
    }
  };

  const handleEveningReminderToggle = (value: boolean) => {
    setEveningReminder(value);
    saveSettings('eveningReminder', value);
    if (notificationsEnabled) {
      if (value) {
        scheduleEveningMotivation();
      }
    }
  };

  const handleResetProgress = () => {
    Alert.alert(
      'İlerleme Sıfırlama',
      'Tüm ilerlemeniz silinecek. Emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('progress');
              Alert.alert('Başarılı', 'Tüm ilerleme sıfırlandı.');
            } catch (error) {
              Alert.alert('Hata', 'İlerleme sıfırlanamadı.');
            }
          },
        },
      ]
    );
  };

  const handleTestNotification = async () => {
    try {
      const success = await sendTestNotification();
      if (!success) {
        Alert.alert(
          'Bildirim İzni Gerekli',
          'Test bildirimi gönderilemedi. Bildirim izinlerini kontrol edin.'
        );
      }
    } catch (error) {
      console.log('Test notification error:', error);
      Alert.alert('Hata', 'Test bildirimi gönderilemedi.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ayarlar</Text>
        <Text style={styles.headerSubtitle}>Uygulamayı özelleştir ⚙️</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bildirimler</Text>
        
        <View style={styles.settingCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, {backgroundColor: `${colors.primary}15`}]}>
                <Icon name="bell" size={24} color={colors.primary} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Bildirimleri Etkinleştir</Text>
                <Text style={styles.settingDescription}>
                  Günlük hatırlatıcılar al
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{false: colors.borderLight, true: colors.primary}}
              thumbColor={colors.card}
            />
          </View>

          {notificationsEnabled && (
            <>
              <View style={styles.divider} />
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <View style={[styles.iconContainer, {backgroundColor: `${colors.warning}15`}]}>
                    <Icon name="weather-sunny" size={24} color={colors.warning} />
                  </View>
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>Sabah Hatırlatıcı</Text>
                    <Text style={styles.settingDescription}>
                      Her sabah 09:00'da
                    </Text>
                  </View>
                </View>
                <Switch
                  value={morningReminder}
                  onValueChange={handleMorningReminderToggle}
                  trackColor={{false: colors.borderLight, true: colors.warning}}
                  thumbColor={colors.card}
                />
              </View>

              <View style={styles.divider} />
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <View style={[styles.iconContainer, {backgroundColor: `${colors.secondary}15`}]}>
                    <Icon name="weather-night" size={24} color={colors.secondary} />
                  </View>
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>Akşam Özeti</Text>
                    <Text style={styles.settingDescription}>
                      Her akşam 20:00'da
                    </Text>
                  </View>
                </View>
                <Switch
                  value={eveningReminder}
                  onValueChange={handleEveningReminderToggle}
                  trackColor={{false: colors.borderLight, true: colors.secondary}}
                  thumbColor={colors.card}
                />
              </View>
            </>
          )}
        </View>

        {notificationsEnabled && (
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestNotification}>
            <Icon name="bell-ring" size={20} color={colors.primary} />
            <Text style={styles.testButtonText}>Test Bildirimi Gönder</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Veri Yönetimi</Text>
        
        <View style={styles.settingCard}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleResetProgress}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, {backgroundColor: `${colors.danger}15`}]}>
                <Icon name="refresh" size={24} color={colors.danger} />
              </View>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, {color: colors.danger}]}>
                  İlerlemeyi Sıfırla
                </Text>
                <Text style={styles.settingDescription}>
                  Tüm verileri temizle
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hakkında</Text>
        
        <View style={styles.settingCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, {backgroundColor: `${colors.primary}15`}]}>
                <Icon name="information" size={24} color={colors.primary} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Versiyon</Text>
                <Text style={styles.settingDescription}>1.0.0</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Icon name="heart" size={28} color={colors.danger} />
          <Text style={styles.infoText}>
            KPSS'de başarılar dileriz! 🎯
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textLight,
    marginLeft: 24,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  settingCard: {
    backgroundColor: colors.card,
    marginHorizontal: 24,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: 88,
  },
  testButton: {
    backgroundColor: colors.card,
    marginHorizontal: 24,
    marginTop: 12,
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 12,
  },
  infoCard: {
    backgroundColor: colors.accent,
    marginHorizontal: 24,
    marginTop: 12,
    padding: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  infoText: {
    fontSize: 16,
    color: colors.primary,
    marginLeft: 16,
    flex: 1,
    fontWeight: '600',
    lineHeight: 24,
  },
});

export default SettingsScreen;