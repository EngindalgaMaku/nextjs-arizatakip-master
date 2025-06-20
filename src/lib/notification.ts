'use client';

import { Issue } from './supabase';
import { toast } from 'react-hot-toast';

// Sesli bildirim için sabit
const NOTIFICATION_ALERT_SOUND = '/notification-alert.mp3';

// --- Start Audio Stability Enhancements ---
let audioContext: AudioContext | null = null;
let alertSoundBuffer: AudioBuffer | null = null;
let isAudioInitialized = false;
let lastPlayTime = 0;
const PLAY_COOLDOWN_MS = 1000; // Only play sound max once per second

// Function to initialize AudioContext and load sound
// This should be called after the first user interaction
export async function initializeAudio() {
  if (isAudioInitialized || typeof window === 'undefined') return;

  try {
    console.log('Initializing AudioContext...');
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Resume context if it's suspended (required by some browsers)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    console.log('Fetching notification sound...');
    const response = await fetch(NOTIFICATION_ALERT_SOUND);
    if (!response.ok) {
      throw new Error(`Failed to fetch sound: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    
    console.log('Decoding audio data...');
    alertSoundBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    isAudioInitialized = true;
    console.log('Audio initialized successfully.');
    
  } catch (error) {
    console.error('Failed to initialize audio or load sound:', error);
    // Keep audioContext null or reset if partially initialized
    audioContext = null;
    alertSoundBuffer = null;
    isAudioInitialized = false; // Mark as not initialized on error
  }
}

// Enhanced playAlertSound function
export function playAlertSound(showVisualFallback = true) {
  const now = Date.now();
  
  // Check if audio is initialized and cooldown period has passed
  if (!audioContext || !alertSoundBuffer || !isAudioInitialized) {
    console.warn('Audio not initialized, cannot play sound.');
    if (showVisualFallback) {
        showVisualNotificationFallback();
    }
    return; // Do not attempt to play if not ready
  }
  
  if (now - lastPlayTime < PLAY_COOLDOWN_MS) {
      console.log('Skipping sound play due to cooldown.');
      return; // Exit if played too recently
  }

  // Check context state again before playing
  if (audioContext.state === 'suspended') {
    console.warn('AudioContext is suspended, attempting to resume...');
    audioContext.resume().then(() => {
       console.log('AudioContext resumed, trying to play again shortly...');
       // Optionally try playing again after a short delay, or rely on the next trigger
    }).catch(err => {
        console.error('Failed to resume AudioContext:', err);
        if (showVisualFallback) showVisualNotificationFallback();
    });
    if (showVisualFallback) showVisualNotificationFallback(); // Show fallback immediately if suspended
    return;
  }
  
  if (audioContext.state !== 'running') {
      console.warn(`AudioContext not running (state: ${audioContext.state}), cannot play sound.`);
      if (showVisualFallback) showVisualNotificationFallback();
      return;
  }

  try {
    console.log('Attempting to play notification sound via AudioContext...');
    const source = audioContext.createBufferSource();
    source.buffer = alertSoundBuffer;
    source.connect(audioContext.destination);
    source.start();
    lastPlayTime = now; // Update last play time on successful start
    console.log('Notification sound started.');

    source.onended = () => {
        console.log('Notification sound finished.');
    };

  } catch (error) {
    console.error('Error playing sound via AudioContext:', error);
    if (showVisualFallback) {
      showVisualNotificationFallback();
    }
  }
}
// --- End Audio Stability Enhancements ---

interface NotificationOptions {
  title: string;
  body: string;
  url?: string;
  onClick?: () => void;
}

/**
 * Ses çalınamadığında gösterilen görsel bildirim
 */
function showVisualNotificationFallback() {
  // Daha çekici bir başarı bildirimi göster
  toast.success('Yeni bildirim geldi! Lütfen kontrol edin.', {
    duration: 5000,
    position: 'bottom-center',
    id: 'notification-toast',
    style: {
      background: 'linear-gradient(to right, #3b82f6, #2563eb)',
      color: '#ffffff',
      fontWeight: 'bold',
      padding: '1rem',
      borderRadius: '0.5rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      maxWidth: '350px',
      width: '100%',
    },
    className: 'notification-toast-success',
    iconTheme: {
      primary: '#ffffff',
      secondary: '#3b82f6',
    },
    icon: '🔔'
  });
  
  // Dikkat çekmek için ekstra bir bildirim de ekle
  setTimeout(() => {
    toast('Arıza bildirimlerini kontrol etmek için tıklayınız', {
      duration: 4000,
      position: 'bottom-center',
      style: {
        background: '#1e40af',
        color: '#ffffff',
        padding: '0.75rem',
        borderRadius: '0.5rem',
        marginTop: '0.5rem',
        fontSize: '0.875rem',
      },
      icon: '👆',
    });
  }, 1000);
  
  // Sayfada görsel yanıp sönme efekti (title değiştirme)
  const originalTitle = document.title;
  let interval: number | null = null;
  
  if (document.hidden) {
    // Sayfa arka plandaysa başlığı yanıp söndür
    let messageShown = false;
    interval = window.setInterval(() => {
      document.title = messageShown ? originalTitle : '🔔 Yeni Bildirim!';
      messageShown = !messageShown;
    }, 1000);
    
    // Kullanıcı sayfaya geri döndüğünde normal başlığa dön
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (interval) window.clearInterval(interval);
        document.title = originalTitle;
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 10 saniye sonra otomatik olarak temizle
    setTimeout(() => {
      if (interval) window.clearInterval(interval);
      document.title = originalTitle;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, 10000);
  }
}

/**
 * Format notification time
 */
export function formatNotificationTime(timestamp: string | number | Date): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Az önce';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} dakika önce`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} saat önce`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} gün önce`;
  } else {
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

/**
 * Get notification color based on type
 */
export function getNotificationColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'success':
      return 'green';
    case 'error':
      return 'red';
    case 'warning':
      return 'orange';
    case 'info':
    default:
      return 'blue';
  }
}

/**
 * Tarayıcı bildirimi gösterir
 */
export const showBrowserNotification = async (options: NotificationOptions) => {
  try {
    if (typeof window === 'undefined') return;
    
    console.log('Bildirim gösteriliyor:', options);
    
    // Tarayıcı bildirimi desteği kontrolü
    if (!('Notification' in window)) {
      console.warn('Bu tarayıcı bildirim özelliğini desteklemiyor');
      return;
    }
    
    // Bildirim izni kontrolü
    if (Notification.permission === 'granted') {
      console.log('Bildirim izni mevcut, bildirim gösteriliyor');
      
      // Bildirim göster
      const notification = new Notification(options.title, {
        body: options.body,
        icon: '/okullogo.png'
      });
      
      // Kullanıcı bildirime tıkladığında sayfaya odaklan
      notification.onclick = () => {
        console.log('Bildirime tıklandı, pencere odaklanıyor');
        window.focus();
        
        // Özel onClick fonksiyonu varsa çağır
        if (options.onClick) {
          options.onClick();
        }
        
        // URL varsa o sayfaya yönlendir
        if (options.url) {
          console.log(`Bildirim URL'sine yönlendiriliyor: ${options.url}`);
          window.location.href = options.url;
        }
      };
    } else if (Notification.permission !== 'denied') {
      console.log('Bildirim izni yok, izin isteniyor...');
      
      // İzin iste
      const permission = await Notification.requestPermission();
      console.log('Bildirim izni sonucu:', permission);
      
      if (permission === 'granted') {
        console.log('Bildirim izni alındı, bildirimi gösteriliyor');
        showBrowserNotification(options);
      } else {
        console.warn('Bildirim izni reddedildi');
      }
    } else {
      console.warn('Bildirim izni daha önce reddedilmiş');
    }
  } catch (error) {
    console.error('Bildirim gösterilemedi:', error);
  }
};

/**
 * Arıza güncelleme bildirimi gösterir
 */
export const showIssueUpdateNotification = (issue: Issue, previousStatus?: string) => {
  // Durum değişikliği varsa
  if (previousStatus && previousStatus !== issue.status) {
    let title = 'Arıza kaydınız güncellendi';
    const body = `"${issue.device_name}" cihazı için bildiriminizin durumu "${getStatusName(issue.status)}" olarak güncellendi.`;
    
    // Çözüldü durumu için farklı başlık
    if (issue.status === 'cozuldu') {
      title = 'Arıza kaydınız çözüldü!';
    }
    
    showBrowserNotification({
      title,
      body
    });
  } else {
    // Genel güncelleme
    showBrowserNotification({
      title: 'Arıza kaydınız güncellendi',
      body: `"${issue.device_name}" cihazı için bildiriminiz güncellendi.`
    });
  }
};

// Durum adını döndüren yardımcı fonksiyon
const getStatusName = (status: string): string => {
  const statusMap: Record<string, string> = {
    'beklemede': 'Beklemede',
    'atandi': 'Atandı',
    'inceleniyor': 'İnceleniyor',
    'cozuldu': 'Çözüldü',
    'kapatildi': 'Kapatıldı'
  };
  
  return statusMap[status] || status;
}; 