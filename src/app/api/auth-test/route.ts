import { NextResponse } from 'next/server';
import { signIn } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email ve şifre gerekli'
      }, { status: 400 });
    }
    
    // 1. Direkt supabase.ts'deki signIn fonksiyonu ile deneme
    const supabaseSignIn = await signIn(email, password);
    
    // 2. Doğrudan Supabase client oluşturarak deneme
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gcxbfmqyvqchcrudxpmh.supabase.co";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjeGJmbXF5dnFjaGNydWR4cG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzQ5NTcsImV4cCI6MjA2MDc1MDk1N30.ZVAsgNkAWqtSpEgUufOdvegyXVeN5H6fXYA7rn-8osQ";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: directData, error: directError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    // Sonuçları döndür
    return NextResponse.json({
      success: !supabaseSignIn.error && !directError,
      supabaseSignIn: {
        success: !supabaseSignIn.error,
        data: supabaseSignIn.data || null,
        error: supabaseSignIn.error ? supabaseSignIn.error.message : null
      },
      directSignIn: {
        success: !directError,
        data: directData || null,
        error: directError ? directError.message : null
      },
      env: {
        supabaseUrl,
        hasAnonKey: !!supabaseAnonKey
      }
    });
  } catch (err) {
    console.error('Auth test error:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu'
    }, { status: 500 });
  }
} 