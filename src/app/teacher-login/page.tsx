'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Yeni sayfaya yönlendir
    router.replace('/teacher/login');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <p className="text-gray-600">Yönlendiriliyor...</p>
      </div>
    </div>
  );
} 