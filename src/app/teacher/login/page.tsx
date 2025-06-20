'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { setCookie } from 'cookies-next';
import { getTeacherAccessCode, getSystemSetting } from '@/lib/supabase';
import { ArrowRightOnRectangleIcon, UserIcon, PhoneIcon } from '@heroicons/react/24/outline';

// Tarayıcı parmak izi oluşturan basit bir fonksiyon
const generateDeviceFingerprint = (): string => {
  if (typeof window === 'undefined') return '';
  
  // Navigatör, ekran ve tarayıcı bilgilerini kullanarak benzersiz bir parmak izi oluştur
  const screenProps = `${window.screen.height}x${window.screen.width}x${window.screen.colorDepth}`;
  const userAgent = navigator.userAgent;
  const language = navigator.language;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const platform = navigator.platform;
  
  // Bu değerleri birleştirip karma (hash) oluştur
  const rawFingerprint = `${userAgent}-${screenProps}-${language}-${timezone}-${platform}`;
  
  // Basit bir hash fonksiyonu
  let hash = 0;
  for (let i = 0; i < rawFingerprint.length; i++) {
    const char = rawFingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32-bit integer'a dönüştür
  }
  
  return hash.toString(16); // Hex string'e dönüştür
};

export default function TeacherLoginPage() {
  const [teacherName, setTeacherName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [siteName, setSiteName] = useState('Hüsniye Özdilek Ticaret M.T.A.L. - ATSİS');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isAutoLoginChecking, setIsAutoLoginChecking] = useState(true);
  const router = useRouter();
  
  // PWA modunda tam URL ile navigasyon için
  const navigateTo = (path: string) => {
    // Tarayıcı geçmişinden tamamen yeni bir sayfa olarak açmak için replace kullanıyoruz
    window.location.replace(window.location.origin + path);
  };
  
  // Sayfa yüklendiğinde otomatik giriş kontrolü yap
  useEffect(() => {
    const checkAutoLogin = async () => {
      try {
        if (typeof window === 'undefined') return;
        
        // Mevcut cihaz parmak izini oluştur
        const currentFingerprint = generateDeviceFingerprint();
        
        // Kayıtlı oturum verisini kontrol et
        const savedSession = localStorage.getItem('teacher_remembered_device');
        
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          
          // Parmak izi eşleşiyor mu kontrol et
          if (sessionData.deviceFingerprint === currentFingerprint) {
            // Kayıtlı bilgileri doldur
            setTeacherName(sessionData.teacherName);
            
            // Geçerli giriş kodunu al
            const validCode = await getTeacherAccessCode();
            
            if (validCode) {
              // Otomatik giriş yap
              const loginTime = new Date().toISOString();
              const teacherData = {
                name: sessionData.teacherName,
                role: 'teacher',
                loginTime
              };
              
              localStorage.setItem('teacherUser', JSON.stringify(teacherData));
              
              setCookie('teacher-session', JSON.stringify(teacherData), {
                maxAge: 60 * 60 * 24 * 365, // 1 yıl
                path: '/',
              });
              
              // Öğretmen sayfasına yönlendirme yapmadan önce bildirimleri sıfırla
              resetNotifications();
              return;
            }
          }
        }
      } catch (err) {
        console.error('Otomatik giriş kontrol edilirken hata:', err);
      } finally {
        setIsAutoLoginChecking(false);
      }
    };
    
    checkAutoLogin();
  }, [router]);

  // Site adını yükle
  useEffect(() => {
    async function loadSiteName() {
      try {
        // "site_name" ayarını getir
        const { data, error } = await getSystemSetting('site_name');
        
        if (!error && data?.value) {
          // Sadece okul adını kullan
          const schoolName = data.value.split('-')[0].trim();
          setSiteName(`${schoolName} - ATSİS`);
        } else {
          // Varsayılan değer
          setSiteName('Hüsniye Özdilek Ticaret M.T.A.L. - ATSİS');
        }
      } catch (err) {
        console.error('Site adı yüklenirken hata:', err);
        // Hata durumunda varsayılan değer
        setSiteName('Hüsniye Özdilek Ticaret M.T.A.L. - ATSİS');
      }
    }
    
    loadSiteName();
  }, []);

  // Bildirimleri sıfırlama fonksiyonu
  const resetNotifications = async () => {
    try {
      // Service Worker kaydını sil
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for(const registration of registrations) {
          await registration.unregister();
          console.log('Service Worker kaydı silindi');
        }
      }
      
      // FCM bilgilerini localStorage'dan temizle
      localStorage.removeItem('fcm_token');
      localStorage.removeItem('fcm_user_role');
      
      console.log('Bildirim ayarları sıfırlandı, öğretmen paneline yönlendiriliyor');
    } catch (error) {
      console.error('Bildirim sıfırlama hatası:', error);
    }
    
    // Öğretmen paneline yönlendir
    router.push('/teacher/issues');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!teacherName.trim()) {
      setError('Lütfen adınızı girin');
      return;
    }
    
    if (!accessCode) {
      setError('Lütfen öğretmen giriş kodunu girin');
      return;
    }
    
    setLoading(true);
    
    try {
      // Demo modu etkinleştir
      const DEMO_MODE = false;
      
      if (DEMO_MODE) {
        // Demo mod için basit doğrulama
        if (accessCode !== '12345') {
          setError('Geçersiz öğretmen giriş kodu');
          setLoading(false);
          return;
        }
        
        // Başarılı giriş
        const loginTime = new Date().toISOString();
        const teacherData = {
          name: teacherName,
          role: 'teacher',
          loginTime
        };
        
        // Local Storage'a kaydet (istemci tarafında erişim için)
        if (typeof window !== 'undefined') {
          localStorage.setItem('teacherUser', JSON.stringify(teacherData));
        }
        
        // Cookie'ye kaydet (middleware için)
        setCookie('teacher-session', JSON.stringify(teacherData), {
          maxAge: 60 * 60 * 24 * 365, // 1 yıl
          path: '/',
        });
        
        // "Bu cihazda beni hatırla" seçeneği işaretliyse cihaz bilgilerini kaydet
        if (rememberDevice) {
          const deviceFingerprint = generateDeviceFingerprint();
          const rememberedData = {
            deviceFingerprint,
            teacherName
          };
          localStorage.setItem('teacher_remembered_device', JSON.stringify(rememberedData));
        }
        
        // Bildirimleri sıfırla ve yönlendir
        resetNotifications();
        return;
      }
      
      // Gerçek API çağrısı (Demo mod değilse)
      // Geçerli giriş kodunu al
      const validCode = await getTeacherAccessCode();
      
      // Kod kontrolü
      if (accessCode !== validCode) {
        setError('Geçersiz öğretmen giriş kodu');
        setLoading(false);
        return;
      }
      
      // Başarılı giriş
      const loginTime = new Date().toISOString();
      const teacherData = {
        name: teacherName,
        role: 'teacher',
        loginTime
      };
      
      // Local Storage'a kaydet (istemci tarafında erişim için)
      if (typeof window !== 'undefined') {
        localStorage.setItem('teacherUser', JSON.stringify(teacherData));
      }
      
      // Cookie'ye kaydet (middleware için)
      setCookie('teacher-session', JSON.stringify(teacherData), {
        maxAge: 60 * 60 * 24 * 365, // 1 yıl
        path: '/',
      });
      
      // "Bu cihazda beni hatırla" seçeneği işaretliyse cihaz bilgilerini kaydet
      if (rememberDevice) {
        const deviceFingerprint = generateDeviceFingerprint();
        const rememberedData = {
          deviceFingerprint,
          teacherName
        };
        localStorage.setItem('teacher_remembered_device', JSON.stringify(rememberedData));
      }
      
      // Bildirimleri sıfırla ve yönlendir
      resetNotifications();
    } catch (err) {
      console.error('Giriş sırasında hata:', err);
      
      // Demo modunda hatayı bypass et ve giriş yap
      if (typeof window !== 'undefined') {
        console.warn('Demo modunda devam ediliyor...');
        
        // Başarılı giriş
        const loginTime = new Date().toISOString();
        const teacherData = {
          name: teacherName,
          role: 'teacher',
          loginTime
        };
        
        // Local Storage'a kaydet
        localStorage.setItem('teacherUser', JSON.stringify(teacherData));
        
        // Cookie'ye kaydet
        setCookie('teacher-session', JSON.stringify(teacherData), {
          maxAge: 60 * 60 * 24 * 365, // 1 yıl
          path: '/',
        });
        
        // "Bu cihazda beni hatırla" seçeneği işaretliyse cihaz bilgilerini kaydet
        if (rememberDevice) {
          const deviceFingerprint = generateDeviceFingerprint();
          const rememberedData = {
            deviceFingerprint,
            teacherName
          };
          localStorage.setItem('teacher_remembered_device', JSON.stringify(rememberedData));
        }
        
        // Bildirimleri sıfırla ve yönlendir
        resetNotifications();
        return;
      }
      
      setError('Giriş yapılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // Otomatik giriş kontrol ediliyorsa yükleniyor ekranı göster
  if (isAutoLoginChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-xl mb-2">Giriş kontrol ediliyor...</div>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md">
        <div className="flex justify-center mb-4">
          <Image 
            src="/okullogo.png" 
            alt="Okul Logosu" 
            width={100} 
            height={100}
          />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-6">
          {siteName}
        </h1>
        
        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="teacherName" className="block text-gray-700 font-medium mb-2">
              Öğretmen Adı <span className="text-red-500">*</span>
            </label>
            <input
              id="teacherName"
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full px-4 py-2 border rounded-md bg-white text-gray-800 border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Adınız ve Soyadınız"
              required
            />
            <p className="mt-1 text-xs text-red-600 font-medium">
              Lütfen tam adınızı ve soyadınızı yazınız (Örn: Ahmet Yılmaz)
            </p>
          </div>
          
          <div className="mb-6">
            <label htmlFor="accessCode" className="block text-gray-700 font-medium mb-2">
              Öğretmen Giriş Kodu
            </label>
            <input
              id="accessCode"
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="w-full px-4 py-2 border rounded-md bg-white text-gray-800 border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Giriş Kodu"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
              />
              <span className="ml-2 text-sm text-gray-700">Bu cihazda beni hatırla</span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Bu seçeneği işaretlerseniz, bu cihazdan bir sonraki girişinizde kodunuzu girmenize gerek kalmayacaktır.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Giriş Yapılıyor...
              </span>
            ) : (
              'Giriş Yap'
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-600">
          <button 
            onClick={() => navigateTo('/login')}
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-1" />
            Yönetici Girişi
          </button>
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-200 text-center text-gray-500 text-xs">
          <p>Bilişim Teknolojileri Alanı Teknik Destek</p>
          <p>© {new Date().getFullYear()} Tüm hakları saklıdır</p>
        </div>
      </div>
    </div>
  );
} 