import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Switch,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  CustomReminder,
  loadCustomReminders,
  createCustomReminder,
  updateCustomReminder,
  deleteCustomReminder,
  reminderTemplates,
  createQuickStudyReminder,
  createQuickBreakReminder,
  createQuickGoalReminder,
  scheduleAllCustomReminders,
  cancelAllCustomReminders,
} from '../utils/customReminders';
import { useTheme } from '../App'; // Assuming theme context is available

const CustomRemindersScreen = () => {
  const { colors: themeColors } = useTheme();
  const [reminders, setReminders] = useState<CustomReminder[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<CustomReminder | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    time: '09:00',
    days: [] as number[],
    enabled: true,
    sound: 'default',
    vibration: true,
    repeatType: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'once',
    category: 'study' as 'study' | 'break' | 'goal' | 'motivation' | 'custom',
    subject: '',
    icon: 'bell',
    priority: 'default' as 'low' | 'high' | 'default',
  });

  const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  const subjects = ['Türkçe', 'Matematik', 'Tarih', 'Coğrafya', 'Vatandaşlık', 'Genel Kültür'];

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    const loadedReminders = await loadCustomReminders();
    setReminders(loadedReminders);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      time: '09:00',
      days: [],
      enabled: true,
      sound: 'default',
      vibration: true,
      repeatType: 'weekly',
      category: 'study',
      subject: '',
      icon: 'bell',
      priority: 'default',
    });
  };

  const handleCreateReminder = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      Alert.alert('Hata', 'Başlık ve mesaj alanları gereklidir.');
      return;
    }

    try {
      await createCustomReminder(formData);
      setShowCreateModal(false);
      resetForm();
      loadReminders();
      await scheduleAllCustomReminders();
      Alert.alert('Başarılı', 'Hatırlatıcı oluşturuldu!');
    } catch (error) {
      Alert.alert('Hata', 'Hatırlatıcı oluşturulamadı.');
    }
  };

  const handleEditReminder = async () => {
    if (!editingReminder) return;

    try {
      await updateCustomReminder(editingReminder.id, formData);
      setShowEditModal(false);
      setEditingReminder(null);
      resetForm();
      loadReminders();
      await scheduleAllCustomReminders();
      Alert.alert('Başarılı', 'Hatırlatıcı güncellendi!');
    } catch (error) {
      Alert.alert('Hata', 'Hatırlatıcı güncellenemedi.');
    }
  };

  const handleDeleteReminder = (reminder: CustomReminder) => {
    Alert.alert(
      'Hatırlatıcıyı Sil',
      `"${reminder.title}" hatırlatıcısını silmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await deleteCustomReminder(reminder.id);
            loadReminders();
            await scheduleAllCustomReminders();
          },
        },
      ]
    );
  };

  const handleToggleReminder = async (reminder: CustomReminder) => {
    await updateCustomReminder(reminder.id, { enabled: !reminder.enabled });
    loadReminders();
    await scheduleAllCustomReminders();
  };

  const openEditModal = (reminder: CustomReminder) => {
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title,
      message: reminder.message,
      time: reminder.time,
      days: reminder.days,
      enabled: reminder.enabled,
      sound: reminder.sound,
      vibration: reminder.vibration,
      repeatType: reminder.repeatType,
      category: reminder.category,
      subject: reminder.subject || '',
      icon: reminder.icon,
      priority: reminder.priority,
    });
    setShowEditModal(true);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setSelectedTime(selectedDate);
      const timeString = `${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`;
      setFormData({ ...formData, time: timeString });
    }
  };

  const toggleDay = (dayIndex: number) => {
    const newDays = formData.days.includes(dayIndex)
      ? formData.days.filter(d => d !== dayIndex)
      : [...formData.days, dayIndex];
    setFormData({ ...formData, days: newDays });
  };

  const addTemplateReminder = async (template: typeof reminderTemplates[0]) => {
    try {
      await createCustomReminder(template);
      loadReminders();
      await scheduleAllCustomReminders();
      Alert.alert('Başarılı', 'Şablon hatırlatıcı eklendi!');
    } catch (error) {
      Alert.alert('Hata', 'Şablon eklenemedi.');
    }
  };

  const createQuickReminder = async (type: 'study' | 'break' | 'goal') => {
    try {
      if (type === 'study') {
        Alert.prompt(
          'Hızlı Çalışma Hatırlatıcısı',
          'Hangi ders için hatırlatıcı oluşturmak istiyorsunuz?',
          async (subject) => {
            if (subject) {
              await createQuickStudyReminder(subject, '09:00');
              loadReminders();
              await scheduleAllCustomReminders();
              Alert.alert('Başarılı', 'Çalışma hatırlatıcısı oluşturuldu!');
            }
          }
        );
      } else if (type === 'break') {
        await createQuickBreakReminder(25);
        loadReminders();
        await scheduleAllCustomReminders();
        Alert.alert('Başarılı', 'Mola hatırlatıcısı oluşturuldu!');
      } else if (type === 'goal') {
        Alert.prompt(
          'Hızlı Hedef Hatırlatıcısı',
          'Hangi hedef için hatırlatıcı oluşturmak istiyorsunuz?',
          async (goalText) => {
            if (goalText) {
              await createQuickGoalReminder(goalText, '19:00');
              loadReminders();
              await scheduleAllCustomReminders();
              Alert.alert('Başarılı', 'Hedef hatırlatıcısı oluşturuldu!');
            }
          }
        );
      }
    } catch (error) {
      Alert.alert('Hata', 'Hızlı hatırlatıcı oluşturulamadı.');
    }
  };

  const renderReminderItem = (reminder: CustomReminder) => (
    <View key={reminder.id} style={[styles.reminderCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.reminderHeader}>
        <View style={styles.reminderInfo}>
          <Icon name={reminder.icon} size={24} color={themeColors.primary} />
          <View style={styles.reminderText}>
            <Text style={[styles.reminderTitle, { color: themeColors.text }]}>
              {reminder.title}
            </Text>
            <Text style={[styles.reminderTime, { color: themeColors.textLight }]}>
              {reminder.time} • {reminder.repeatType === 'daily' ? 'Her gün' : 
                reminder.repeatType === 'weekly' ? 'Haftalık' : 
                reminder.repeatType === 'once' ? 'Bir kez' : 'Aylık'}
            </Text>
          </View>
        </View>
        <View style={styles.reminderActions}>
          <Switch
            value={reminder.enabled}
            onValueChange={() => handleToggleReminder(reminder)}
            trackColor={{ false: themeColors.border, true: themeColors.primary }}
          />
          <TouchableOpacity
            onPress={() => openEditModal(reminder)}
            style={[styles.actionButton, { backgroundColor: themeColors.cardSecondary }]}
          >
            <Icon name="pencil" size={16} color={themeColors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteReminder(reminder)}
            style={[styles.actionButton, { backgroundColor: themeColors.danger + '20' }]}
          >
            <Icon name="delete" size={16} color={themeColors.danger} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.reminderMessage, { color: themeColors.textSecondary }]}>
        {reminder.message}
      </Text>
      {reminder.days.length > 0 && (
        <View style={styles.reminderDays}>
          {reminder.days.map(day => (
            <Text key={day} style={[styles.dayBadge, { color: themeColors.primary }]}>
              {dayNames[day]}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal || showEditModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
          <TouchableOpacity
            onPress={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
              resetForm();
            }}
          >
            <Text style={[styles.modalCancel, { color: themeColors.primary }]}>İptal</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: themeColors.text }]}>
            {showEditModal ? 'Hatırlatıcıyı Düzenle' : 'Yeni Hatırlatıcı'}
          </Text>
          <TouchableOpacity
            onPress={showEditModal ? handleEditReminder : handleCreateReminder}
          >
            <Text style={[styles.modalSave, { color: themeColors.primary }]}>
              {showEditModal ? 'Güncelle' : 'Kaydet'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Form fields will go here */}
          <View style={styles.formSection}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Temel Bilgiler</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Başlık</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: themeColors.cardSecondary, color: themeColors.text }]}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Hatırlatıcı başlığı"
                placeholderTextColor={themeColors.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Mesaj</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { backgroundColor: themeColors.cardSecondary, color: themeColors.text }]}
                value={formData.message}
                onChangeText={(text) => setFormData({ ...formData, message: text })}
                placeholder="Hatırlatıcı mesajı"
                placeholderTextColor={themeColors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Saat</Text>
              <TouchableOpacity
                style={[styles.timeButton, { backgroundColor: themeColors.cardSecondary }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Icon name="clock" size={20} color={themeColors.primary} />
                <Text style={[styles.timeText, { color: themeColors.text }]}>{formData.time}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Additional form sections for repeat type, days, etc. */}
        </ScrollView>

        {showTimePicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={handleTimeChange}
          />
        )}
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Özel Hatırlatıcılar</Text>
        <Text style={[styles.headerSubtitle, { color: themeColors.textLight }]}>
          Kişiselleştirilmiş bildirimler 🔔
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Quick Actions */}
        <View style={[styles.quickActions, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Hızlı Oluştur</Text>
          <View style={styles.quickButtonsRow}>
            <TouchableOpacity
              style={[styles.quickButton, { backgroundColor: themeColors.primary + '20' }]}
              onPress={() => createQuickReminder('study')}
            >
              <Icon name="book" size={24} color={themeColors.primary} />
              <Text style={[styles.quickButtonText, { color: themeColors.primary }]}>Çalışma</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickButton, { backgroundColor: themeColors.warning + '20' }]}
              onPress={() => createQuickReminder('break')}
            >
              <Icon name="coffee" size={24} color={themeColors.warning} />
              <Text style={[styles.quickButtonText, { color: themeColors.warning }]}>Mola</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickButton, { backgroundColor: themeColors.success + '20' }]}
              onPress={() => createQuickReminder('goal')}
            >
              <Icon name="target" size={24} color={themeColors.success} />
              <Text style={[styles.quickButtonText, { color: themeColors.success }]}>Hedef</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Reminders */}
        <View style={styles.remindersList}>
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              Hatırlatıcılarım ({reminders.length})
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: themeColors.primary }]}
              onPress={() => setShowCreateModal(true)}
            >
              <Icon name="plus" size={20} color={themeColors.backgroundLight} />
            </TouchableOpacity>
          </View>

          {reminders.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: themeColors.cardSecondary }]}>
              <Icon name="bell-off" size={48} color={themeColors.textMuted} />
              <Text style={[styles.emptyText, { color: themeColors.textMuted }]}>
                Henüz hatırlatıcınız yok
              </Text>
              <Text style={[styles.emptySubtext, { color: themeColors.textLight }]}>
                İlk hatırlatıcınızı oluşturmak için yukarıdaki butonları kullanın
              </Text>
            </View>
          ) : (
            reminders.map(renderReminderItem)
          )}
        </View>

        {/* Templates */}
        <View style={[styles.templatesSection, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Hazır Şablonlar</Text>
          {reminderTemplates.map((template, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.templateItem, { borderBottomColor: themeColors.border }]}
              onPress={() => addTemplateReminder(template)}
            >
              <Icon name={template.icon} size={20} color={themeColors.primary} />
              <View style={styles.templateInfo}>
                <Text style={[styles.templateTitle, { color: themeColors.text }]}>
                  {template.title}
                </Text>
                <Text style={[styles.templateDesc, { color: themeColors.textLight }]}>
                  {template.message.substring(0, 50)}...
                </Text>
              </View>
              <Icon name="plus-circle" size={20} color={themeColors.success} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {renderCreateModal()}
    </View>
  );
};

const styles = {
  container: { flex: 1 },
  header: { padding: 24, paddingTop: 60, paddingBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  headerSubtitle: { fontSize: 16, fontWeight: '500' },
  content: { flex: 1 },
  quickActions: { margin: 16, padding: 20, borderRadius: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  quickButtonsRow: { flexDirection: 'row', gap: 12 },
  quickButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  quickButtonText: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  remindersList: { margin: 16 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  addButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reminderCard: { padding: 16, borderRadius: 12, marginBottom: 12 },
  reminderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  reminderInfo: { flexDirection: 'row', flex: 1 },
  reminderText: { marginLeft: 12, flex: 1 },
  reminderTitle: { fontSize: 16, fontWeight: '700' },
  reminderTime: { fontSize: 14, marginTop: 4 },
  reminderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionButton: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  reminderMessage: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  reminderDays: { flexDirection: 'row', gap: 6 },
  dayBadge: { fontSize: 12, fontWeight: '600' },
  emptyState: { padding: 40, borderRadius: 12, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 16 },
  emptySubtext: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  templatesSection: { margin: 16, padding: 20, borderRadius: 16 },
  templateItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  templateInfo: { flex: 1, marginLeft: 12 },
  templateTitle: { fontSize: 14, fontWeight: '600' },
  templateDesc: { fontSize: 12, marginTop: 2 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSave: { fontSize: 16, fontWeight: '600' },
  modalContent: { flex: 1, padding: 16 },
  formSection: { marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  textInput: { padding: 12, borderRadius: 8, fontSize: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  timeButton: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8 },
  timeText: { marginLeft: 8, fontSize: 16 },
};

export default CustomRemindersScreen;