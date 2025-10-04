// Clean feedback service for KPSS Çalışma Asistanı app
export interface FeedbackData {
  feedbackType: 'suggestion' | 'bug' | 'general';
  feedbackText: string;
  userEmail?: string;
  deviceInfo?: string;
  appVersion?: string;
}

export class FeedbackService {
  // Using Formspree for reliable email delivery
  static async sendFeedback(feedbackData: FeedbackData): Promise<boolean> {
    try {
      const formspreeUrl = 'https://formspree.io/f/manpjljn';
      
      const payload = {
        email: 'ozcann.talha@gmail.com',
        subject: `KPSS Çalışma Asistanı Feedback - ${feedbackData.feedbackType === 'suggestion' ? 'Öneri' : feedbackData.feedbackType === 'bug' ? 'Hata Bildirimi' : 'Genel'}`,
        message: `
📱 KPSS Çalışma Asistanı App Feedback

Geri Bildirim Türü: ${feedbackData.feedbackType === 'suggestion' ? 'Öneri' : feedbackData.feedbackType === 'bug' ? 'Hata Bildirimi' : 'Genel'}

Mesaj:
${feedbackData.feedbackText}

---
Kullanıcı E-postası: ${feedbackData.userEmail || 'Belirtilmedi'}
Cihaz Bilgisi: ${feedbackData.deviceInfo || 'Bilinmiyor'}
Uygulama Sürümü: ${feedbackData.appVersion || '1.0.0'}
Tarih: ${new Date().toLocaleString('tr-TR')}

Bu geri bildirim KPSS Çalışma Asistanı mobil uygulamasından gönderildi.
        `,
        _replyto: feedbackData.userEmail || 'noreply@kpsstakip.com',
      };

      const response = await fetch(formspreeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      console.error('Feedback sending failed:', error);
      return false;
    }
  }

  // Backup webhook method
  static async sendFeedbackViaWebhook(feedbackData: FeedbackData): Promise<boolean> {
    try {
      const webhookUrl = 'https://httpbin.org/post';
      
      const payload = {
        ...feedbackData,
        timestamp: new Date().toISOString(),
        recipient: 'ozcann.talha@gmail.com',
        app: 'KPSS Çalışma Asistanı',
        platform: 'React Native',
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      console.error('Webhook feedback failed:', error);
      return false;
    }
  }
}