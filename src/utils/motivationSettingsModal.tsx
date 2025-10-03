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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  getMotivationSettings,
  saveMotivationSettings,
  showMotivationalMessage,
  getMessageByCategory,
  MotivationSettings,
} from './motivationalMessages';

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

interface MotivationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const MotivationSettingsModal: React.FC<MotivationSettingsModalProps> = ({
  visible,
  onClose,
}) => {
  const [settings, setSettings] = useState<MotivationSettings>({
    enabled: true,
    frequency: 'daily',
    categories: ['motivation', 'success', 'persistence', 'wisdom', 'encouragement'],
    showTime: 'anytime',
  });

  const [loading, setLoading] = useState(false);

  // Load settings when modal opens
  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      const loadedSettings = await getMotivationSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error loading motivation settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      await saveMotivationSettings(settings);
      Alert.alert('✅ Başarılı', 'Motivasyon ayarları kaydedildi!');
      onClose();
    } catch (error) {
      console.error('Error saving motivation settings:', error);
      Alert.alert('❌ Hata', 'Ayarlar kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setSettings(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
  };

  const testCategory = async (category: string) => {
    try {
      const message = await getMessageByCategory(category);
      if (message) {
        Alert.alert('🎯 Test Mesajı', message.message);
      } else {
        Alert.alert('⚠️ Uyarı', 'Bu kategori için mesaj bulunamadı.');
      }
    } catch (error) {
      Alert.alert('❌ Hata', 'Test mesajı gösterilemedi.');
    }
  };

  const categoryInfo = [
    {
      id: 'motivation',
      name: 'Motivasyon',
      icon: 'fire',
      color: colors.primary,
      description: 'Genel motivasyon ve ilham verici mesajlar',
    },
    {
      id: 'success',
      name: 'Başarı',
      icon: 'trophy',
      color: colors.warning,
      description: 'Başarı ve hedefe odaklanma mesajları',
    },
    {
      id: 'persistence',
      name: 'Azim',
      icon: 'strength',
      color: colors.danger,
      description: 'Dayanıklılık ve pes etmeme mesajları',
    },
    {
      id: 'wisdom',
      name: 'Bilgelik',
      icon: 'brain',
      color: colors.info,
      description: 'Öğrenme ve bilgi üzerine mesajlar',
    },
    {
      id: 'encouragement',
      name: 'Cesaret',
      icon: 'heart',
      color: colors.success,
      description: 'Destekleyici ve cesaretlendirici mesajlar',
    },
  ];

  const frequencyOptions = [
    { id: 'every_visit', name: 'Her Açılışta', description: 'Uygulamayı her açtığınızda' },
    { id: 'daily', name: 'Günlük', description: 'Günde bir kez' },
    { id: 'weekly', name: 'Haftalık', description: 'Haftada bir kez' },
  ];

  const timeOptions = [
    { id: 'morning', name: 'Sabah', description: '06:00 - 12:00 arası' },
    { id: 'evening', name: 'Akşam', description: '18:00 - 22:00 arası' },
    { id: 'anytime', name: 'Her Zaman', description: 'Zaman sınırı yok' },
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
              💪 Motivasyon Ayarları
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Enable/Disable */}
            <View style={[styles.section, { backgroundColor: colors.backgroundLight }]}>
              <View style={styles.sectionHeader}>
                <Icon name="power" size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Motivasyon Mesajları
                </Text>
                <Switch
                  value={settings.enabled}
                  onValueChange={(value) =>
                    setSettings(prev => ({ ...prev, enabled: value }))
                  }
                  trackColor={{ false: colors.border, true: colors.primary + '30' }}
                  thumbColor={settings.enabled ? colors.primary : colors.textMuted}
                />
              </View>
              <Text style={[styles.sectionDescription, { color: colors.textLight }]}>
                Motivasyon mesajlarını tamamen açar veya kapatır
              </Text>
            </View>

            {settings.enabled && (
              <>
                {/* Frequency Settings */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Icon name="clock-outline" size={20} color={colors.secondary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Sıklık
                    </Text>
                  </View>
                  <Text style={[styles.sectionDescription, { color: colors.textLight }]}>
                    Motivasyon mesajlarının ne sıklıkla gösterileceğini seçin
                  </Text>
                  
                  {frequencyOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.optionItem,
                        {
                          backgroundColor: settings.frequency === option.id 
                            ? colors.secondary + '15' 
                            : colors.background,
                          borderColor: settings.frequency === option.id 
                            ? colors.secondary 
                            : colors.border,
                        },
                      ]}
                      onPress={() =>
                        setSettings(prev => ({ ...prev, frequency: option.id as any }))
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
                        name={settings.frequency === option.id ? 'radiobox-marked' : 'radiobox-blank'}
                        size={20}
                        color={settings.frequency === option.id ? colors.secondary : colors.textMuted}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Time Settings */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Icon name="clock-time-four" size={20} color={colors.info} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Zaman Tercihi
                    </Text>
                  </View>
                  <Text style={[styles.sectionDescription, { color: colors.textLight }]}>
                    Mesajların hangi saatlerde gösterileceğini belirleyin
                  </Text>
                  
                  {timeOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.optionItem,
                        {
                          backgroundColor: settings.showTime === option.id 
                            ? colors.info + '15' 
                            : colors.background,
                          borderColor: settings.showTime === option.id 
                            ? colors.info 
                            : colors.border,
                        },
                      ]}
                      onPress={() =>
                        setSettings(prev => ({ ...prev, showTime: option.id as any }))
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
                        name={settings.showTime === option.id ? 'radiobox-marked' : 'radiobox-blank'}
                        size={20}
                        color={settings.showTime === option.id ? colors.info : colors.textMuted}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Categories */}
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
                    <View key={category.id} style={styles.categoryItem}>
                      <TouchableOpacity
                        style={[
                          styles.categoryToggle,
                          {
                            backgroundColor: settings.categories.includes(category.id)
                              ? category.color + '15'
                              : colors.background,
                            borderColor: settings.categories.includes(category.id)
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
                          name={settings.categories.includes(category.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                          size={20}
                          color={settings.categories.includes(category.id) ? category.color : colors.textMuted}
                        />
                      </TouchableOpacity>
                      
                      {settings.categories.includes(category.id) && (
                        <TouchableOpacity
                          style={[styles.testButton, { backgroundColor: category.color }]}
                          onPress={() => testCategory(category.id)}
                        >
                          <Icon name="play" size={14} color="white" />
                          <Text style={styles.testButtonText}>Test Et</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>

                {/* Test All Messages */}
                <View style={styles.section}>
                  <TouchableOpacity
                    style={[styles.testAllButton, { backgroundColor: colors.warning }]}
                    onPress={() => showMotivationalMessage()}
                  >
                    <Icon name="test-tube" size={20} color="white" />
                    <Text style={styles.testAllButtonText}>Rastgele Mesaj Göster</Text>
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
              onPress={saveSettings}
              disabled={loading}
            >
              <Text style={[styles.modalButtonText, { color: 'white' }]}>
                {loading ? 'Kaydediliyor...' : 'Kaydet'}
              </Text>
            </TouchableOpacity>
          </View>
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
  categoryItem: {
    marginBottom: 12,
  },
  categoryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
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
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
    gap: 4,
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  testAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  testAllButtonText: {
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

export default MotivationSettingsModal;