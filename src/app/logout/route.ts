import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;
  const redirectTo = searchParams.get('redirectTo') || '/login';
  
  // Create response that redirects to the appropriate login page
  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  
  // Clear cookies by setting them to expire immediately
  response.cookies.set('admin-session', '', { maxAge: 0, path: '/' });
  response.cookies.set('teacher-session', '', { maxAge: 0, path: '/' });
  
  // Add script to clear localStorage items when the page loads
  // This will be executed when the redirect happens
  const script = `
    <script>
      localStorage.removeItem('teacherUser');
      localStorage.removeItem('teacher_remembered_device');
      localStorage.removeItem('adminUser');
      window.location.href = '${redirectTo}';
    </script>
  `;
  
  // For direct access to /logout, return HTML with the script
  if (path === '/logout') {
    return new NextResponse(
      `<!DOCTYPE html><html><head><title>Çıkış Yapılıyor...</title></head><body>${script}</body></html>`,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }
  
  return response;
} 