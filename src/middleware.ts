import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Demo modu - üretimde false olmalı
const DEMO_MODE = false;

export function middleware(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    const response = NextResponse.next();

    // Dashboard yolları için güvenlik kontrolü
    if (path.startsWith('/dashboard')) {
      // Demo modda kontrolü bypass et
      if (DEMO_MODE) {
        console.log('Demo mod: Yönetici kimlik doğrulama atlandı');
        return response;
      }

      // Admin session cookie kontrolü
      const adminSessionCookie = request.cookies.get('admin-session');
      
      if (!adminSessionCookie?.value) {
        // Session yoksa login sayfasına yönlendir
        console.log('Yönetici oturumu bulunamadı, giriş sayfasına yönlendiriliyor');
        return NextResponse.redirect(new URL('/login', request.url));
      }
      
      try {
        // Admin session kontrolü
        const session = JSON.parse(adminSessionCookie.value);
        if (!session || !session.role || session.role !== 'admin') {
          console.log('Geçersiz yönetici oturumu, giriş sayfasına yönlendiriliyor');
          return NextResponse.redirect(new URL('/login', request.url));
        }
        
        // Oturum geçerliyse devam et
        return response;
      } catch (error) {
        console.error('Yönetici oturumu ayrıştırma hatası:', error);
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } else if (path.startsWith('/teacher')) {
      // Öğretmen bölümü erişimi kontrolü
      if (path.startsWith('/teacher/issues')) {
        // Demo modda öğretmen kontrolü bypass edilir
        if (DEMO_MODE) {
          console.log('Demo mod: Öğretmen kimlik doğrulama atlandı');
          return response;
        }
        
        const teacherSessionCookie = request.cookies.get('teacher-session');
        if (!teacherSessionCookie?.value) {
          // Session yoksa login sayfasına yönlendir
          return NextResponse.redirect(new URL('/teacher/login', request.url));
        }
        
        try {
          // Session değerini ayrıştır
          const session = JSON.parse(teacherSessionCookie.value);
          if (!session || !session.role || session.role !== 'teacher') {
            return NextResponse.redirect(new URL('/teacher/login', request.url));
          }
          
          // Oturum geçerliyse devam et
          return response;
        } catch (error) {
          console.error('Öğretmen session ayrıştırma hatası:', error);
          return NextResponse.redirect(new URL('/teacher/login', request.url));
        }
      }
    }

    return response;
  } catch (error) {
    // Genel hata durumunda 
    console.error('Middleware hatası:', error);
    
    // Demo modda hataları görmezden gel ve geçişe izin ver
    if (DEMO_MODE) {
      console.warn('Demo mod: Middleware hatası yoksayıldı');
      return NextResponse.next();
    }
    
    // Hata durumunda ana sayfaya yönlendir
    return NextResponse.redirect(new URL('/', request.url));
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/teacher/:path*',
  ],
}; 