'use client';

import { useState, useEffect } from 'react';
import { getSystemSetting, updateSystemSetting, TEACHER_ACCESS_CODE_KEY, DEMO_MODE } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  // Profil ayarları
  const [name, setName] = useState('Admin Kullanıcı');
  const [email, setEmail] = useState('admin@example.com');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  
  // Site ayarları
  const [siteName, setSiteName] = useState('Admin Paneli');
  const [siteDescription, setSiteDescription] = useState('Okul yönetim sistemi için güçlü bir admin paneli');
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [isSiteLoading, setIsSiteLoading] = useState(false);
  
  // Bildirim ayarları
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [isNotificationLoading, setIsNotificationLoading] = useState(false);

  const [teacherAccessCode, setTeacherAccessCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Site ayarları için sistem anahtarları
  const SITE_NAME_KEY = 'site_name';
  const SITE_DESCRIPTION_KEY = 'site_description';
  const ALLOW_REGISTRATION_KEY = 'allow_registration';

  // Bildirim ayarları için sistem anahtarları
  const EMAIL_NOTIFICATIONS_KEY = 'email_notifications';
  const PUSH_NOTIFICATIONS_KEY = 'push_notifications';

  // Demo kullanıcı bilgilerini yükle
  useEffect(() => {
    // Demo modunda localStorage'dan kullanıcı bilgilerini yükle
    if (DEMO_MODE && typeof window !== 'undefined') {
      const storedName = localStorage.getItem('demoUserName');
      const storedEmail = localStorage.getItem('demoUserEmail');
      
      if (storedName) {
        setName(storedName);
      }
      
      if (storedEmail) {
        setEmail(storedEmail);
      }
      
      // Demo kullanıcı ID'si
      setUserId('demo-user-id');
    }
  }, []);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        setError(null);

        // Mevcut kullanıcı bilgisini al
        const user = await getCurrentUser();
        if (user) {
          setUserId(user.id);
          // Kullanıcı bilgilerini form alanlarına doldur
          if (user.user_metadata?.name) {
            setName(user.user_metadata.name);
          }
          if (user.email) {
            setEmail(user.email);
          }
        }

        // Öğretmen giriş kodunu al
        const { data: accessCodeData, error: accessCodeError } = await getSystemSetting(TEACHER_ACCESS_CODE_KEY);
        if (accessCodeError) {
          throw accessCodeError;
        }
        if (accessCodeData) {
          setTeacherAccessCode(accessCodeData.value);
        }
        
        // Site ayarlarını al
        const { data: siteNameData } = await getSystemSetting(SITE_NAME_KEY);
        if (siteNameData) {
          setSiteName(siteNameData.value);
        }
        
        const { data: siteDescData } = await getSystemSetting(SITE_DESCRIPTION_KEY);
        if (siteDescData) {
          setSiteDescription(siteDescData.value);
        }
        
        const { data: allowRegData } = await getSystemSetting(ALLOW_REGISTRATION_KEY);
        if (allowRegData) {
          setAllowRegistration(allowRegData.value === 'true');
        }
        
        // Bildirim ayarlarını al
        const { data: emailNotifData } = await getSystemSetting(EMAIL_NOTIFICATIONS_KEY);
        if (emailNotifData) {
          setEmailNotifications(emailNotifData.value === 'true');
        }
        
        const { data: pushNotifData } = await getSystemSetting(PUSH_NOTIFICATIONS_KEY);
        if (pushNotifData) {
          setPushNotifications(pushNotifData.value === 'true');
        }
      } catch (err) {
        console.error('Ayarlar yüklenirken hata:', err);
        setError('Ayarlar yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  // Demo site ayarlarını yükle
  useEffect(() => {
    // Demo modunda localStorage'dan site ayarlarını yükle
    if (DEMO_MODE && typeof window !== 'undefined') {
      const storedSiteName = localStorage.getItem(SITE_NAME_KEY);
      const storedSiteDesc = localStorage.getItem(SITE_DESCRIPTION_KEY);
      const storedAllowReg = localStorage.getItem(ALLOW_REGISTRATION_KEY);
      
      if (storedSiteName) {
        setSiteName(storedSiteName);
      }
      
      if (storedSiteDesc) {
        setSiteDescription(storedSiteDesc);
      }
      
      if (storedAllowReg) {
        setAllowRegistration(storedAllowReg === 'true');
      }
    }
  }, []);

  // Demo öğretmen giriş kodunu yükle
  useEffect(() => {
    // Demo modunda localStorage'dan öğretmen giriş kodunu yükle
    if (DEMO_MODE && typeof window !== 'undefined') {
      const storedCode = localStorage.getItem(TEACHER_ACCESS_CODE_KEY);
      if (storedCode) {
        setTeacherAccessCode(storedCode);
      }
    }
  }, []);

  // Demo bildirim ayarlarını yükle
  useEffect(() => {
    // Demo modunda localStorage'dan bildirim ayarlarını yükle
    if (DEMO_MODE && typeof window !== 'undefined') {
      const storedEmailNotif = localStorage.getItem(EMAIL_NOTIFICATIONS_KEY);
      const storedPushNotif = localStorage.getItem(PUSH_NOTIFICATIONS_KEY);
      
      if (storedEmailNotif !== null) {
        setEmailNotifications(storedEmailNotif === 'true');
      }
      
      if (storedPushNotif !== null) {
        setPushNotifications(storedPushNotif === 'true');
      }
    }
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileLoading(true);
    
    // Demo modda doğrudan kaydet
    if (DEMO_MODE) {
      try {
        if (typeof window !== 'undefined') {
          // Ekstra kontrol - localStorage kullanılabilir mi?
          if (window.localStorage) {
            // Bilgileri localStorage'a kaydet
            window.localStorage.setItem('demoUserName', name);
            window.localStorage.setItem('demoUserEmail', email);
            
            // Doğrulama - kaydedilen bilgileri oku
            const savedName = window.localStorage.getItem('demoUserName');
            const savedEmail = window.localStorage.getItem('demoUserEmail');
            
            if (savedName === name && savedEmail === email) {
              alert('Profil ayarları başarıyla kaydedildi!');
            } else {
              throw new Error('Profil kaydedilemedi - doğrulama başarısız');
            }
          } else {
            throw new Error('localStorage desteklenmiyor');
          }
        } else {
          throw new Error('window nesnesi kullanılamıyor');
        }
      } catch (error) {
        console.error('Demo profil kaydetme hatası:', error);
        alert(`Profil kaydedilemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
      } finally {
        setIsProfileLoading(false);
      }
      
      return; // Demo modda işlemi burada sonlandır
    }
    
    // Gerçek Supabase güncellemesi
    try {
      if (!userId) {
        throw new Error('Kullanıcı oturumu bulunamadı');
      }
      
      // Doğrudan Supabase Auth API'sini kullan
      const { error } = await supabase.auth.updateUser({
        email: email,
        data: { name: name }
      });
      
      if (error) {
        throw error;
      }
      
      alert('Profil ayarları başarıyla kaydedildi!');
    } catch (err) {
      console.error('Profil güncellenirken hata:', err);
      alert(`Profil güncellenemedi: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleSiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSiteLoading(true);
    
    // Demo modda doğrudan localStorage'a kaydet
    if (DEMO_MODE) {
      try {
        if (typeof window !== 'undefined') {
          // Ekstra kontrol - localStorage kullanılabilir mi?
          if (window.localStorage) {
            // Site ayarlarını localStorage'a kaydet
            window.localStorage.setItem(SITE_NAME_KEY, siteName);
            window.localStorage.setItem(SITE_DESCRIPTION_KEY, siteDescription);
            window.localStorage.setItem(ALLOW_REGISTRATION_KEY, allowRegistration.toString());
            
            // Doğrulama - kaydedilen bilgileri oku
            const savedName = window.localStorage.getItem(SITE_NAME_KEY);
            const savedDesc = window.localStorage.getItem(SITE_DESCRIPTION_KEY);
            const savedReg = window.localStorage.getItem(ALLOW_REGISTRATION_KEY);
            
            if (savedName === siteName && 
                savedDesc === siteDescription && 
                savedReg === allowRegistration.toString()) {
              alert('Site ayarları başarıyla kaydedildi!');
            } else {
              throw new Error('Site ayarları kaydedilemedi - doğrulama başarısız');
            }
          } else {
            throw new Error('localStorage desteklenmiyor');
          }
        } else {
          throw new Error('window nesnesi kullanılamıyor');
        }
      } catch (error) {
        console.error('Demo site ayarları kaydetme hatası:', error);
        alert(`Site ayarları kaydedilemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
      } finally {
        setIsSiteLoading(false);
      }
      
      return; // Demo modda işlemi burada sonlandır
    }
    
    // Gerçek Supabase güncellemesi
    try {
      if (!userId && !DEMO_MODE) {
        throw new Error('Kullanıcı oturumu bulunamadı');
      }
      
      // Site adını kaydet
      const siteNameResult = await updateSystemSetting(
        SITE_NAME_KEY,
        siteName,
        userId || 'demo-user'
      );
      
      if (siteNameResult.error) {
        throw new Error('Site adı kaydedilemedi');
      }
      
      // Site açıklamasını kaydet
      const siteDescResult = await updateSystemSetting(
        SITE_DESCRIPTION_KEY,
        siteDescription,
        userId || 'demo-user'
      );
      
      if (siteDescResult.error) {
        throw new Error('Site açıklaması kaydedilemedi');
      }
      
      // Kayıt izni ayarını kaydet
      const regResult = await updateSystemSetting(
        ALLOW_REGISTRATION_KEY,
        allowRegistration.toString(),
        userId || 'demo-user'
      );
      
      if (regResult.error) {
        throw new Error('Kayıt izni ayarı kaydedilemedi');
      }
      
      // Başarı mesajı göster
      alert('Site ayarları başarıyla kaydedildi!');
    } catch (err) {
      console.error('Site ayarları güncellenirken hata:', err);
      alert(`Site ayarları kaydedilemedi: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
    } finally {
      setIsSiteLoading(false);
    }
  };

  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsNotificationLoading(true);
    
    // Demo modda doğrudan localStorage'a kaydet
    if (DEMO_MODE) {
      try {
        if (typeof window !== 'undefined') {
          // Ekstra kontrol - localStorage kullanılabilir mi?
          if (window.localStorage) {
            // Bildirim ayarlarını localStorage'a kaydet
            window.localStorage.setItem(EMAIL_NOTIFICATIONS_KEY, emailNotifications.toString());
            window.localStorage.setItem(PUSH_NOTIFICATIONS_KEY, pushNotifications.toString());
            
            // Doğrulama - kaydedilen bilgileri oku
            const savedEmailNotif = window.localStorage.getItem(EMAIL_NOTIFICATIONS_KEY);
            const savedPushNotif = window.localStorage.getItem(PUSH_NOTIFICATIONS_KEY);
            
            if (savedEmailNotif === emailNotifications.toString() && 
                savedPushNotif === pushNotifications.toString()) {
              alert('Bildirim ayarları başarıyla kaydedildi!');
            } else {
              throw new Error('Bildirim ayarları kaydedilemedi - doğrulama başarısız');
            }
          } else {
            throw new Error('localStorage desteklenmiyor');
          }
        } else {
          throw new Error('window nesnesi kullanılamıyor');
        }
      } catch (error) {
        console.error('Demo bildirim ayarları kaydetme hatası:', error);
        alert(`Bildirim ayarları kaydedilemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
      } finally {
        setIsNotificationLoading(false);
      }
      
      return; // Demo modda işlemi burada sonlandır
    }
    
    // Gerçek Supabase güncellemesi
    try {
      if (!userId && !DEMO_MODE) {
        throw new Error('Kullanıcı oturumu bulunamadı');
      }
      
      // E-posta bildirim ayarını kaydet
      const emailResult = await updateSystemSetting(
        EMAIL_NOTIFICATIONS_KEY,
        emailNotifications.toString(),
        userId || 'demo-user'
      );
      
      if (emailResult.error) {
        throw new Error('E-posta bildirim ayarı kaydedilemedi');
      }
      
      // Push bildirim ayarını kaydet
      const pushResult = await updateSystemSetting(
        PUSH_NOTIFICATIONS_KEY,
        pushNotifications.toString(),
        userId || 'demo-user'
      );
      
      if (pushResult.error) {
        throw new Error('Anlık bildirim ayarı kaydedilemedi');
      }
      
      // Başarı mesajı göster
      alert('Bildirim ayarları başarıyla kaydedildi!');
    } catch (err) {
      console.error('Bildirim ayarları güncellenirken hata:', err);
      alert(`Bildirim ayarları kaydedilemedi: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
    } finally {
      setIsNotificationLoading(false);
    }
  };

  const handleUpdateTeacherCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teacherAccessCode.trim()) {
      setError('Öğretmen giriş kodu boş olamaz.');
      return;
    }
    
    try {
      setError(null);
      setSuccess(false);
      setUpdating(true);
      
      console.log('Updating teacher access code:', teacherAccessCode);
      
      // Demo modda doğrudan localStorage'a kaydet
      if (DEMO_MODE) {
        if (typeof window !== 'undefined') {
          // Öğretmen giriş kodunu localStorage'a kaydet
          localStorage.setItem(TEACHER_ACCESS_CODE_KEY, teacherAccessCode);
          
          // Doğrulama - kaydedilen bilgiyi oku
          const savedCode = localStorage.getItem(TEACHER_ACCESS_CODE_KEY);
          
          if (savedCode === teacherAccessCode) {
            setSuccess(true);
            console.log('Öğretmen giriş kodu localStorage\'a kaydedildi:', teacherAccessCode);
          } else {
            throw new Error('Giriş kodu kaydedilemedi - doğrulama başarısız');
          }
        } else {
          throw new Error('window nesnesi kullanılamıyor');
        }
      } else {
        // Supabase ile gerçek kayıt
        if (!userId) {
          console.error('User ID missing for updating teacher code');
          setError('Oturum bilgisi bulunamadı. Lütfen yeniden giriş yapın.');
          return;
        }
        
        console.log(`Updating teacher code with userId: ${userId}`);
        const result = await updateSystemSetting(
          TEACHER_ACCESS_CODE_KEY, 
          teacherAccessCode,
          userId
        );
        
        if (result.error) {
          console.error('Supabase error updating teacher code:', result.error);
          throw new Error(`Supabase hatası: ${(result.error as any).message || (result.error as any).details || JSON.stringify(result.error)}`);
        }
        
        // Verification: Read back from database to confirm update
        const { data: verifyData, error: verifyError } = await getSystemSetting(TEACHER_ACCESS_CODE_KEY);
        
        if (verifyError) {
          console.error('Error verifying teacher code update:', verifyError);
          throw new Error(`Güncelleme doğrulaması sırasında hata oluştu: ${verifyError.message}`);
        }
        
        if (!verifyData || verifyData.value !== teacherAccessCode) {
          console.error('Verification failed - saved value does not match:', {
            expected: teacherAccessCode,
            actual: verifyData?.value
          });
          throw new Error('Güncelleme doğrulanamadı: Kaydedilen değer beklenen değerle eşleşmiyor');
        }
        
        console.log('Teacher code successfully updated and verified:', teacherAccessCode);
        setSuccess(true);
      }
      
      // 3 saniye sonra başarı mesajını kaldır
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (err) {
      console.error('Öğretmen giriş kodu güncellenirken hata:', err);
      setError(`Giriş kodu güncellenirken bir hata oluştu: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-10 divide-y divide-gray-900/10">
      {/* Yükleniyor durum kontrolü */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          <div className="space-y-10">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Ayarlar</h1>
              <p className="mt-1 text-gray-500">Uygulama ayarlarını ve profilinizi yönetin</p>
            </div>
            
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Profil Ayarları */}
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Profil Ayarları</h3>
                  <div className="mt-2 max-w-xl text-sm text-gray-500">
                    <p>Kişisel bilgilerinizi ve hesap ayarlarınızı güncelleyin.</p>
                  </div>
                  <form className="mt-5 space-y-4" onSubmit={handleProfileSubmit}>
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        İsim
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        E-posta adresi
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isProfileLoading}
                        className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProfileLoading ? 'Kaydediliyor...' : 'Profili Kaydet'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Site Ayarları */}
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Site Ayarları</h3>
                  <div className="mt-2 max-w-xl text-sm text-gray-500">
                    <p>Uygulamanız için genel ayarları yapılandırın.</p>
                  </div>
                  <form className="mt-5 space-y-4" onSubmit={handleSiteSubmit}>
                    <div>
                      <label htmlFor="site-name" className="block text-sm font-medium text-gray-700">
                        Site Adı
                      </label>
                      <input
                        type="text"
                        name="site-name"
                        id="site-name"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="site-description" className="block text-sm font-medium text-gray-700">
                        Site Açıklaması
                      </label>
                      <textarea
                        name="site-description"
                        id="site-description"
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        value={siteDescription}
                        onChange={(e) => setSiteDescription(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex h-5 items-center">
                        <input
                          id="allow-registration"
                          name="allow-registration"
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          checked={allowRegistration}
                          onChange={(e) => setAllowRegistration(e.target.checked)}
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="allow-registration" className="font-medium text-gray-700">
                          Kullanıcı Kaydına İzin Ver
                        </label>
                        <p className="text-gray-500">Yeni hesapların açık kayıt yapmasını sağlar</p>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSiteLoading}
                        className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSiteLoading ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Bildirim Ayarları */}
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Bildirim Ayarları</h3>
                  <div className="mt-2 max-w-xl text-sm text-gray-500">
                    <p>Sistemden bildirimleri nasıl alacağınızı yapılandırın.</p>
                  </div>
                  <form className="mt-5 space-y-4" onSubmit={handleNotificationSubmit}>
                    <div className="flex items-start">
                      <div className="flex h-5 items-center">
                        <input
                          id="email-notifications"
                          name="email-notifications"
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          checked={emailNotifications}
                          onChange={(e) => setEmailNotifications(e.target.checked)}
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="email-notifications" className="font-medium text-gray-700">
                          E-posta Bildirimleri
                        </label>
                        <p className="text-gray-500">Güncellemeleri e-posta yoluyla alın</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex h-5 items-center">
                        <input
                          id="push-notifications"
                          name="push-notifications"
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          checked={pushNotifications}
                          onChange={(e) => setPushNotifications(e.target.checked)}
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="push-notifications" className="font-medium text-gray-700">
                          Anlık Bildirimler
                        </label>
                        <p className="text-gray-500">Tarayıcınızda gerçek zamanlı güncellemeler alın</p>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isNotificationLoading}
                        className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isNotificationLoading ? 'Kaydediliyor...' : 'Bildirim Ayarlarını Kaydet'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Öğretmen Erişim Kodu */}
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Öğretmen Erişimi</h3>
                  <div className="mt-2 max-w-xl text-sm text-gray-500">
                    <p>Öğretmenlerin arıza bildirim sistemine giriş yaparken kullanacakları kodu belirleyin. Bu kod tüm öğretmenler için geçerlidir.</p>
                  </div>
                  <form className="mt-5 space-y-4" onSubmit={handleUpdateTeacherCode}>
                    <div className="grid grid-cols-6 gap-6">
                      <div className="col-span-6 sm:col-span-4">
                        <label htmlFor="teacherAccessCode" className="block text-sm font-medium text-gray-700">
                          Öğretmen Giriş Kodu
                        </label>
                        <input
                          type="text"
                          name="teacherAccessCode"
                          id="teacherAccessCode"
                          value={teacherAccessCode}
                          onChange={(e) => setTeacherAccessCode(e.target.value)}
                          className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                        {error && (
                          <p className="mt-2 text-sm text-red-600">{error}</p>
                        )}
                        {success && (
                          <p className="mt-2 text-sm text-green-600">Öğretmen giriş kodu başarıyla güncellendi.</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-5">
                      <button
                        type="submit"
                        disabled={updating}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {updating ? 'Güncelleniyor...' : 'Güncelle'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Veritabanı İşlemleri */}
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Veritabanı İşlemleri</h3>
                  <div className="mt-2 max-w-xl text-sm text-gray-500">
                    <p>Veritabanı yedeğini indirin veya diğer veritabanı işlemlerini gerçekleştirin.</p>
                  </div>
                  <div className="mt-5">
                    <a
                      href="/api/backup"
                      download // Suggests download, though Content-Disposition header handles it
                      className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                      Veritabanı Yedeğini İndir (.sql)
                    </a>
                    {/* Gelecekte başka veritabanı işlemleri buraya eklenebilir */}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
} 