import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase istemcisi oluştur
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * FCM tokenları temizleme endpoint'i
 * Tüm FCM tokenları temizler veya belirli bir rol için temizler
 */
export async function POST(request: NextRequest) {
  try {
    const reqBody = await request.json();
    const { role } = reqBody;
    
    let query = supabaseAdmin.from('user_fcm_tokens').delete();
    
    // Eğer belirli bir rol için temizleme isteniyorsa
    if (role) {
      query = query.eq('user_role', role);
    }

    const { error, count } = await query;
    
    if (error) {
      console.error('FCM tokenları temizlenirken hata:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    console.log(`${role ? role + ' rolündeki' : 'Tüm'} FCM tokenları temizlendi`);
    return NextResponse.json({ 
      success: true, 
      message: `${role ? role + ' rolündeki' : 'Tüm'} FCM tokenları başarıyla temizlendi` 
    });
    
  } catch (error) {
    console.error('FCM token temizleme hatası:', error);
    return NextResponse.json(
      { success: false, error: 'FCM tokenları temizlenirken bir hata oluştu' },
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