'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function PWAGuidePage() {
  const [deviceType, setDeviceType] = useState<'ios' | 'android'>('ios');
  const router = useRouter();
  
  // PWA modunda direkt URL navigasyonu için
  const navigateTo = (path: string) => {
    // Tarayıcı geçmişinden tamamen yeni bir sayfa olarak açmak için replace kullanıyoruz
    window.location.replace(window.location.origin + path);
  };
  
  const isIOS = () => {
    if (typeof window !== 'undefined') {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    }
    return false;
  };
  
  const isAndroid = () => {
    if (typeof window !== 'undefined') {
      return /android/i.test(navigator.userAgent);
    }
    return false;
  };
  
  React.useEffect(() => {
    if (isIOS()) {
      setDeviceType('ios');
    } else if (isAndroid()) {
      setDeviceType('android');
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 py-8 px-4">
      <header className="mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-2">ATSİS'i Telefonunuza Ekleme</h1>
        <p className="text-gray-600">Bu adımları izleyerek ATSİS'i telefonunuzun ana ekranına ekleyebilirsiniz.</p>
      </header>
      
      <div className="max-w-md w-full bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="flex border-b border-gray-200">
          <button 
            className={`flex-1 py-3 text-center font-medium ${deviceType === 'ios' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setDeviceType('ios')}
          >
            iPhone (iOS)
          </button>
          <button 
            className={`flex-1 py-3 text-center font-medium ${deviceType === 'android' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => setDeviceType('android')}
          >
            Android
          </button>
        </div>
        
        {deviceType === 'ios' && (
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">iPhone veya iPad Kurulumu:</h3>
              <ol className="list-decimal pl-5 space-y-4">
                <li className="text-gray-700">
                  Safari tarayıcısını açın ve ATSİS web adresine gidin.
                </li>
                <li className="text-gray-700">
                  Ekranın alt kısmındaki "Paylaş" düğmesine <span className="inline-block w-5 h-5 bg-blue-100 rounded-md text-center leading-5">↑</span> tıklayın.
                </li>
                <li className="text-gray-700">
                  Aşağıda açılan menüde "Ana Ekrana Ekle" <span className="inline-block w-5 h-5 bg-blue-100 rounded-md text-center leading-5">+</span> seçeneğine tıklayın.
                </li>
                <li className="text-gray-700">
                  Açılan pencerede "Ekle" düğmesine tıklayarak ATSİS'i ana ekranınıza ekleyin.
                </li>
              </ol>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-md mb-4">
              <p className="text-blue-700 text-sm">
                <strong>Not:</strong> ATSİS'i ana ekranınıza ekledikten sonra, normal bir uygulama gibi telefonunuzdan açabilirsiniz.
              </p>
            </div>
          </div>
        )}
        
        {deviceType === 'android' && (
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Android Kurulumu:</h3>
              <ol className="list-decimal pl-5 space-y-4">
                <li className="text-gray-700">
                  Chrome tarayıcısını açın ve ATSİS web adresine gidin.
                </li>
                <li className="text-gray-700">
                  Sağ üst köşedeki üç nokta menüsüne (⋮) tıklayın.
                </li>
                <li className="text-gray-700">
                  Açılan menüde "Ana ekrana ekle" seçeneğine tıklayın.
                </li>
                <li className="text-gray-700">
                  Onay penceresinde "Ekle" düğmesine tıklayarak ATSİS'i ana ekranınıza ekleyin.
                </li>
              </ol>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-md mb-4">
              <p className="text-blue-700 text-sm">
                <strong>Not:</strong> ATSİS'i ana ekranınıza ekledikten sonra, normal bir uygulama gibi telefonunuzdan açabilirsiniz. İnternet bağlantınız olmasa bile bazı özellikler çalışmaya devam edecektir.
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-center">
        <button 
          onClick={() => navigateTo('/')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Ana Sayfaya Dön
        </button>
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} ATSİS - Hüsniye Özdilek Ticaret M.T.A.L.</p>
      </div>
    </div>
  );
} 