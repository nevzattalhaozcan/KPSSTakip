import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../utils/theme';

interface DeveloperInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export const DeveloperInfoModal: React.FC<DeveloperInfoModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();

  const openGitHub = () => {
    Linking.openURL('https://github.com/nevzattalhaozcan').catch(() => {
      Alert.alert('Hata', 'GitHub profili açılamadı.');
    });
  };

  const openBuyMeACoffee = () => {
    Linking.openURL('https://www.buymeacoffee.com/nevzattalhaozcan').catch(() => {
      Alert.alert('Hata', 'Buy Me a Coffee sayfası açılamadı.');
    });
  };

  const openLinkedIn = () => {
    Linking.openURL('https://www.linkedin.com/in/nevzat-talha-ozcan').catch(() => {
      Alert.alert('Hata', 'LinkedIn profili açılamadı.');
    });
  };

  const sendEmail = () => {
    Linking.openURL('mailto:ozcann.talha@gmail.com?subject=KPSS Çalışma Asistanı - İletişim').catch(() => {
      Alert.alert('Hata', 'E-posta uygulaması açılamadı.');
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              👨‍💻 Geliştirici Bilgileri
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Developer Profile */}
            <View style={[styles.profileSection, { backgroundColor: colors.card }]}>
              <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
                <Icon name="account" size={48} color="white" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.developerName, { color: colors.text }]}>
                  Nevzat Talha Özcan
                </Text>
                <Text style={[styles.developerTitle, { color: colors.textLight }]}>
                  Software Developer
                </Text>
                <Text style={[styles.developerLocation, { color: colors.textMuted }]}>
                  📍 Türkiye
                </Text>
              </View>
            </View>

            {/* Disclaimer */}
            <View style={[styles.disclaimerSection, { backgroundColor: colors.warning + '15', borderLeftColor: colors.warning }]}>
              <Icon name="information" size={20} color={colors.warning} />
              <Text style={[styles.disclaimerText, { color: colors.text }]}>
                Bu uygulama ÖSYM veya herhangi bir resmi kurum tarafından geliştirilmemiştir. 
                Gayri resmi, kişisel çalışma takip uygulamasıdır.
              </Text>
            </View>

            {/* About */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                📖 Hakkımda
              </Text>
              <Text style={[styles.aboutText, { color: colors.textLight }]}>
                KPSS'ye hazırlanan arkadaşlar için bu kişisel çalışma takip uygulamasını geliştirdim. 
                Hedefim, çalışma sürecini daha düzenli ve motive edici hale getirmek.
                
                React Native, TypeScript ve modern mobil uygulama geliştirme teknolojileri 
                ile çalışıyorum. Açık kaynak projelere katkıda bulunmayı ve yararlı 
                uygulamalar geliştirmeyi seviyorum.
              </Text>
            </View>

            {/* Tech Stack */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                🛠️ Bu Uygulamada Kullanılan Teknolojiler
              </Text>
              <View style={styles.techContainer}>
                {[
                  { name: 'React Native', icon: 'react' },
                  { name: 'TypeScript', icon: 'language-typescript' },
                  { name: 'AsyncStorage', icon: 'database' },
                  { name: 'React Navigation', icon: 'navigation' },
                  { name: 'Firebase', icon: 'firebase' },
                  { name: 'Material Icons', icon: 'material-design' },
                ].map((tech, index) => (
                  <View key={index} style={[styles.techItem, { backgroundColor: colors.background }]}>
                    <Icon name={tech.icon} size={16} color={colors.primary} />
                    <Text style={[styles.techText, { color: colors.text }]}>{tech.name}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Social Links */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                🌐 Bağlantılar
              </Text>
              
              <TouchableOpacity 
                style={[styles.linkButton, { backgroundColor: colors.card }]}
                onPress={openGitHub}
              >
                <View style={styles.linkLeft}>
                  <Icon name="github" size={24} color="#333" />
                  <View style={styles.linkInfo}>
                    <Text style={[styles.linkTitle, { color: colors.text }]}>GitHub</Text>
                    <Text style={[styles.linkDesc, { color: colors.textLight }]}>
                      Diğer projelerimi inceleyin
                    </Text>
                  </View>
                </View>
                <Icon name="open-in-new" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.linkButton, { backgroundColor: colors.card }]}
                onPress={openLinkedIn}
              >
                <View style={styles.linkLeft}>
                  <Icon name="linkedin" size={24} color="#0077B5" />
                  <View style={styles.linkInfo}>
                    <Text style={[styles.linkTitle, { color: colors.text }]}>LinkedIn</Text>
                    <Text style={[styles.linkDesc, { color: colors.textLight }]}>
                      Profesyonel profilim
                    </Text>
                  </View>
                </View>
                <Icon name="open-in-new" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.linkButton, { backgroundColor: colors.card }]}
                onPress={sendEmail}
              >
                <View style={styles.linkLeft}>
                  <Icon name="email" size={24} color={colors.primary} />
                  <View style={styles.linkInfo}>
                    <Text style={[styles.linkTitle, { color: colors.text }]}>E-posta</Text>
                    <Text style={[styles.linkDesc, { color: colors.textLight }]}>
                      ozcann.talha@gmail.com
                    </Text>
                  </View>
                </View>
                <Icon name="send" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Buy Me a Coffee */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                ☕ Destek Ol
              </Text>
              <Text style={[styles.supportText, { color: colors.textLight }]}>
                Bu gayri resmi uygulamayı geliştirmek için zaman ve emek harcadım. 
                Eğer yararlı bulduysanız, bir kahve ısmarlamayı düşünebilirsiniz! 😊
              </Text>
              
              <TouchableOpacity 
                style={[styles.coffeeButton, { backgroundColor: '#FFDD00' }]}
                onPress={openBuyMeACoffee}
              >
                <Icon name="coffee" size={24} color="#333" />
                <Text style={[styles.coffeeButtonText, { color: '#333' }]}>
                  Buy Me a Coffee
                </Text>
                <Icon name="heart" size={20} color="#FF5722" />
              </TouchableOpacity>
            </View>

            {/* App Stats */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                📊 Uygulama İstatistikleri
              </Text>
              <View style={styles.statsContainer}>
                <View style={[styles.statItem, { backgroundColor: colors.background }]}>
                  <Icon name="code-tags" size={20} color={colors.primary} />
                  <Text style={[styles.statNumber, { color: colors.text }]}>10,000+</Text>
                  <Text style={[styles.statLabel, { color: colors.textLight }]}>Kod Satırı</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: colors.background }]}>
                  <Icon name="clock" size={20} color={colors.warning} />
                  <Text style={[styles.statNumber, { color: colors.text }]}>3 Ay</Text>
                  <Text style={[styles.statLabel, { color: colors.textLight }]}>Geliştirme</Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: colors.background }]}>
                  <Icon name="heart" size={20} color={colors.danger} />
                  <Text style={[styles.statNumber, { color: colors.text }]}>∞</Text>
                  <Text style={[styles.statLabel, { color: colors.textLight }]}>Sevgi</Text>
                </View>
              </View>
            </View>

            {/* Thank You */}
            <View style={[styles.thankYouSection, { backgroundColor: colors.primary + '10' }]}>
              <Icon name="heart-multiple" size={32} color={colors.primary} />
              <Text style={[styles.thankYouTitle, { color: colors.primary }]}>
                Teşekkürler!
              </Text>
              <Text style={[styles.thankYouText, { color: colors.text }]}>
                KPSS Çalışma Asistanı uygulamasını kullandığınız için teşekkür ederim. 
                Başarılarınızda küçük bir katkım olabilirse ne mutlu bana! 🎯
              </Text>
            </View>
          </ScrollView>
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
    width: width * 0.9,
    maxHeight: '85%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    maxHeight: '90%',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    margin: 16,
    borderRadius: 12,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  developerName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  developerTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  developerLocation: {
    fontSize: 14,
  },
  disclaimerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    gap: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 22,
  },
  techContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  techItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  techText: {
    fontSize: 12,
    fontWeight: '500',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  linkInfo: {
    marginLeft: 12,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  linkDesc: {
    fontSize: 13,
  },
  supportText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  coffeeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  coffeeButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  thankYouSection: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  thankYouTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
  },
  thankYouText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});