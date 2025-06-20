'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCookie } from 'cookies-next';
import { UserIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

export default function HomePage() {
  const router = useRouter();
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Sayfa yüklendiğinde cookie kontrolü yap ve otomatik giriş yap
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Admin cookie kontrolü
        const adminSession = getCookie('admin-session');
        if (adminSession) {
          console.log('Yönetici oturumu bulundu, yönlendiriliyor...');
          router.push('/dashboard');
          return;
        }

        // Öğretmen cookie kontrolü
        const teacherSession = getCookie('teacher-session');
        if (teacherSession) {
          console.log('Öğretmen oturumu bulundu, yönlendiriliyor...');
          router.push('/teacher/issues');
          return;
        }

        // Oturum bulunamadı, normal giriş ekranını göster
        setIsAuthChecking(false);
      } catch (error) {
        console.error('Oturum kontrolü sırasında hata:', error);
        setIsAuthChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  // PWA modunda direkt URL navigasyonu için
  const navigateTo = (path: string) => {
    // Tarayıcı geçmişinden tamamen yeni bir sayfa olarak açmak için replace kullanıyoruz
    window.location.replace(window.location.origin + path);
  };

  // Oturum kontrolü devam ediyorsa yükleniyor ekranını göster
  if (isAuthChecking) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Oturum bilgileri kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  // Oturum yoksa normal giriş ekranını göster
  return (
    <div className="h-screen flex items-center justify-center bg-gray-100 overflow-hidden">
      <div className="w-full max-w-md px-6 py-5 bg-white rounded-lg shadow-md mx-4">
        <div className="flex justify-center">
          <Image 
            src="/okullogo.png" 
            alt="Okul Logosu" 
            width={100} 
            height={100} 
            className="mb-2"
            priority
          />
        </div>
        
        <h1 className="text-xl font-bold text-center mb-2">
          Hüsniye Özdilek Ticaret M.T.A.L.
        </h1>
        
        <h2 className="text-lg font-semibold text-center mb-4">
          Arıza Takip Sistemi
        </h2>
        
        <div className="space-y-3">
          <button 
            onClick={() => navigateTo('/login')}
            className="flex items-center justify-center w-full py-2.5 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <UserIcon className="w-5 h-5 mr-2" />
            Yönetici Girişi
          </button>
          
          <button 
            onClick={() => navigateTo('/teacher/login')}
            className="flex items-center justify-center w-full py-2.5 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <AcademicCapIcon className="w-5 h-5 mr-2" />
            Öğretmen Girişi
          </button>
        </div>
        
        <div className="mt-4 text-center text-gray-500 text-xs">
          <p>Bilişim Teknolojileri Alanı Teknik Destek</p>
          <p>© {new Date().getFullYear()} Tüm hakları saklıdır</p>
        </div>
      </div>
    </div>
  );
}

