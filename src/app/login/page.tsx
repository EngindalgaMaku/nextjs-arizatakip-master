'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signIn, getSystemSetting } from '@/lib/supabase';
import { setCookie } from 'cookies-next';
import { 
  ArrowRightOnRectangleIcon, 
  UserIcon,
  DevicePhoneMobileIcon 
} from '@heroicons/react/24/outline';
import supabase from '@/lib/supabase-browser';
import { getSiteSettings } from '@/lib/site-settings';
import { COOKIE_NAME } from '@/constants';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteName, setSiteName] = useState('ATSİS');
  const router = useRouter();
  
  // Demo modunu kontrol edecek değişken (Supabase kurulumu yoksa true yapın)
  const DEMO_MODE = false;

  // PWA modunda tam URL ile navigasyon için
  const navigateTo = (path: string) => {
    // Tarayıcı geçmişinden tamamen yeni bir sayfa olarak açmak için replace kullanıyoruz
    window.location.replace(window.location.origin + path);
  };

  // Site adını yükle
  useEffect(() => {
    async function loadSiteName() {
      try {
        // "site_name" ayarını getir
        const { data, error } = await getSystemSetting('site_name');
        
        if (!error && data?.value) {
          // Sadece okul adını kullan, "ATSİS" kısmını çıkar
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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Lütfen email ve şifre giriniz');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Giriş deneniyor:', email);
      
      if (DEMO_MODE) {
        // Demo giriş - sadece test için
        if (email === 'admin@example.com' && password === 'admin123') {
          const loginTime = new Date().toISOString();
          const userData = {
            email,
            name: 'Demo Admin',
            role: 'admin',
            loginTime
          };
          
          localStorage.setItem('adminUser', JSON.stringify(userData));
          setCookie('admin-session', JSON.stringify(userData), {
            maxAge: 60 * 60 * 24 * 365, // 1 yıl
            path: '/',
          });
          
          router.push('/dashboard');
        } else {
          setError('Demo modunda geçersiz kimlik bilgileri. admin@example.com / admin123 kullanın.');
        }
      } else {
        // Supabase giriş işlemi
        const { data, error } = await signIn(email, password);
        
        console.log('Supabase cevabı:', { data, error });
        
        if (error) {
          throw error;
        }
        
        if (data?.user) {
          // Kullanıcı doğrulandı, oturum bilgilerini kaydet
          const userData = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || data.user.email,
            role: data.user.user_metadata?.role || 'admin',
            loginTime: new Date().toISOString()
          };
          
          // localStorage'a kaydet
          localStorage.setItem('adminUser', JSON.stringify(userData));
          
          // Cookie'ye kaydet
          setCookie('admin-session', JSON.stringify({
            id: userData.id,
            email: userData.email,
            role: userData.role
          }), {
            maxAge: 60 * 60 * 24 * 365, // 1 yıl
            path: '/',
            sameSite: 'lax'
          });
          
          console.log('Oturum cookie kaydedildi, dashboard sayfasına yönlendiriliyor');
          
          // Tarayıcı yönlendirme sorunlarını önlemek için doğrudan URL yönlendirmesi
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
              
              console.log('Bildirim ayarları sıfırlandı, yönetici paneline yönlendiriliyor');
            } catch (error) {
              console.error('Bildirim sıfırlama hatası:', error);
            }
            
            // Yönetici paneline yönlendir
            window.location.href = window.location.origin + '/dashboard';
          };
          
          // Bildirimleri sıfırla ve yönlendir
          resetNotifications();
          return;
        } else {
          throw new Error('Kullanıcı bilgileri alınamadı');
        }
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      
      // Türkçe hata mesajları
      if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials')) {
          setError('Geçersiz email veya şifre');
        } else if (err.message.includes('Email not confirmed')) {
          setError('Email adresi onaylanmamış');
        } else {
          setError(`Giriş yapılırken bir hata oluştu: ${err.message}`);
        }
      } else {
        setError('Giriş yapılırken bir hata oluştu');
      }
    } finally {
      setLoading(false);
    }
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
        
        <h1 className="text-2xl font-bold text-center mb-2">
          {siteName}
        </h1>
        
        <h2 className="text-xl text-center text-blue-600 font-semibold mb-6">
          Yönetici Girişi
        </h2>
        
        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email adresiniz"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Şifreniz"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 bg-blue-600 text-white rounded-md flex items-center justify-center ${
              loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
          >
            {loading ? (
              'Giriş yapılıyor...'
            ) : (
              <>
                <ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
                Giriş Yap
              </>
            )}
          </button>
        </form>
        
        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <button 
            onClick={() => navigateTo('/teacher/login')}
            className="text-sm text-gray-600 hover:text-blue-600 inline-flex items-center"
          >
            <UserIcon className="w-4 h-4 mr-1" />
            Öğretmen Girişi
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