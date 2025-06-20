'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadUserData, updateUserProfile, updatePassword } from '@/lib/supabase';
import Swal from 'sweetalert2';

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  useEffect(() => {
    async function fetchUserData() {
      try {
        setIsLoading(true);
        const data = await loadUserData();
        
        if (!data) {
          router.push('/login');
          return;
        }
        
        setUserData(data);
        setFormData(prev => ({
          ...prev,
          email: data.email || '',
          name: data.name || '',
        }));
      } catch (error) {
        console.error('Kullanıcı verileri yüklenemedi:', error);
        Swal.fire({
          title: 'Hata!',
          text: 'Kullanıcı bilgileri yüklenirken bir sorun oluştu.',
          icon: 'error',
          confirmButtonText: 'Tamam'
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Inputa yazıldığında ilgili hata mesajını temizle
    if (errors[name]) {
      setErrors(prev => {
        const updatedErrors = { ...prev };
        delete updatedErrors[name];
        return updatedErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Profil bilgileri doğrulama
    if (!formData.name.trim()) {
      newErrors.name = 'İsim alanı zorunludur';
    }

    // Şifre değişikliği doğrulama (sadece şifre değiştirilmek isteniyorsa)
    if (formData.newPassword || formData.confirmPassword || formData.currentPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Mevcut şifrenizi girmelisiniz';
      }
      
      if (!formData.newPassword) {
        newErrors.newPassword = 'Yeni şifre alanı zorunludur';
      } else if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'Şifre en az 6 karakter olmalıdır';
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Şifreler eşleşmiyor';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProfileUpdate = async () => {
    if (!validateForm()) return;
    
    try {
      setIsSaving(true);
      
      // Kullanıcı bilgilerini güncelle
      const { error } = await updateUserProfile(userData.id, {
        name: formData.name
      });
      
      if (error) throw error;

      // Şifre değiştirme kontrolü
      if (formData.newPassword && formData.currentPassword) {
        try {
          // Şifre değiştirme işlemi
          const result = await updatePassword(formData.currentPassword, formData.newPassword);
          
          if (!result.success) {
            throw new Error('Şifre güncellenemedi');
          }
        } catch (passwordError: any) {
          console.error('Şifre değiştirme hatası:', passwordError);
          Swal.fire({
            title: 'Şifre Değiştirme Hatası!',
            text: passwordError.message || 'Şifre değiştirilirken bir sorun oluştu.',
            icon: 'error',
            confirmButtonText: 'Tamam'
          });
          
          // Şifre değiştirme hatası olsa bile profil bilgilerini güncellemiş olduk
          // O yüzden başarılı mesajını gösteriyoruz
          Swal.fire({
            title: 'Kısmen Başarılı!',
            text: 'Profil bilgileriniz güncellendi, ancak şifre değiştirilemedi.',
            icon: 'warning',
            confirmButtonText: 'Tamam'
          });
          
          // Form verilerini temizle - şifre alanlarını sıfırla
          setFormData(prev => ({
            ...prev,
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          }));
          
          setIsSaving(false);
          return; // Fonksiyondan çık
        }
      }
      
      // Herşey başarılı ise
      Swal.fire({
        title: 'Başarılı!',
        text: formData.newPassword 
          ? 'Profil bilgileriniz ve şifreniz başarıyla güncellendi' 
          : 'Profil bilgileriniz başarıyla güncellendi',
        icon: 'success',
        confirmButtonText: 'Tamam'
      });
      
      // Form verilerini temizle - şifre alanlarını sıfırla
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
    } catch (error: any) {
      console.error('Profil güncellenirken hata oluştu:', error);
      Swal.fire({
        title: 'Hata!',
        text: `Profil güncellenirken bir sorun oluştu: ${error.message || 'Bilinmeyen hata'}`,
        icon: 'error',
        confirmButtonText: 'Tamam'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="text-center">
          <div className="text-xl font-semibold text-blue-600">Yükleniyor...</div>
          <p className="mt-2 text-gray-500">Profil bilgileriniz yükleniyor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Profil Bilgileri
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Hesap bilgilerinizi görüntüleyin ve güncelleyin
          </p>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Kişisel Bilgiler</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Temel kullanıcı bilgileriniz
          </p>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                E-posta Adresi
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  disabled
                  className="bg-gray-100 flex-1 focus:ring-blue-500 focus:border-blue-500 block w-full rounded-md sm:text-sm border-gray-300"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">E-posta adresi değiştirilemez</p>
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Ad Soyad
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="flex-1 focus:ring-blue-500 focus:border-blue-500 block w-full rounded-md sm:text-sm border-gray-300"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Rol
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  name="role"
                  id="role"
                  value={userData?.role === 'admin' 
                    ? 'Yönetici' 
                    : userData?.role === 'teacher' 
                      ? 'Öğretmen' 
                      : 'Kullanıcı'}
                  disabled
                  className="bg-gray-100 flex-1 focus:ring-blue-500 focus:border-blue-500 block w-full rounded-md sm:text-sm border-gray-300"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Rol sistem yöneticisi tarafından değiştirilebilir</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mt-6">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Şifre Değiştirme</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Güvenlik için şifrenizi düzenli olarak değiştirmeniz önerilir
          </p>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                Mevcut Şifre
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="password"
                  name="currentPassword"
                  id="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  className="flex-1 focus:ring-blue-500 focus:border-blue-500 block w-full rounded-md sm:text-sm border-gray-300"
                />
              </div>
              {errors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
              )}
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                Yeni Şifre
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="password"
                  name="newPassword"
                  id="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  className="flex-1 focus:ring-blue-500 focus:border-blue-500 block w-full rounded-md sm:text-sm border-gray-300"
                />
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Şifreniz en az 6 karakter olmalıdır</p>
            </div>

            <div className="sm:col-span-4">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Yeni Şifre (Tekrar)
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="password"
                  name="confirmPassword"
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="flex-1 focus:ring-blue-500 focus:border-blue-500 block w-full rounded-md sm:text-sm border-gray-300"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="mr-3 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Geri
        </button>
        <button
          type="button"
          onClick={handleProfileUpdate}
          disabled={isSaving}
          className={`py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            isSaving ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
        </button>
      </div>
    </div>
  );
} 