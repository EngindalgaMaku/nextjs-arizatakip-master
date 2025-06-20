import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase istemcisi oluştur
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * FCM token kaydetme API endpoint'i
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, token, userRole } = await request.json();
    
    // Gerekli alanları kontrol et
    if (!userId || !token) {
      return NextResponse.json(
        { success: false, error: 'Geçersiz istek: userId ve token gerekli' },
        { status: 400 }
      );
    }
    
    // Önce bu kullanıcının tüm eski FCM token'larını temizle
    await supabaseAdmin
      .from('user_fcm_tokens')
      .delete()
      .eq('user_id', userId);
    
    console.log(`Eski FCM tokenlar temizlendi, kullanıcı: ${userId}`);
    
    // Şimdi yeni token'ı ekle
    const { data, error } = await supabaseAdmin
      .from('user_fcm_tokens')
      .insert({
        user_id: userId, 
        token: token,
        user_role: userRole || 'anonymous',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('FCM token kaydedilemedi:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, data });
    
  } catch (error) {
    console.error('FCM token kaydetme hatası:', error);
    return NextResponse.json(
      { success: false, error: 'FCM token kaydedilirken bir hata oluştu' },
      { status: 500 }
    );
  }
}

// CORS için OPTIONS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 