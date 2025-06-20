import { supabase } from './supabase';
import { type Database } from './database.types';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}

// Demo amacıyla test giriş işlemi (gerçek kullanım için değil)
export async function demoSignIn(email: string, password: string) {
  // Test kullanıcıları
  const testUsers = [
    { email: 'admin@example.com', password: 'admin123', role: 'admin', name: 'Teknik Destek' },
    { email: 'editor@example.com', password: 'editor123', role: 'editor', name: 'Editor User' },
  ];
  
  const user = testUsers.find(u => u.email === email && u.password === password);
  
  if (user) {
    // Local Storage'a demo kullanıcı bilgileri kaydet
    if (typeof window !== 'undefined') {
      localStorage.setItem('demoAuthUser', JSON.stringify({
        email: user.email,
        role: user.role,
        name: user.name,
        loginTime: new Date().toISOString()
      }));
    }
    
    return { success: true, user };
  }
  
  return { success: false, error: 'Invalid login credentials' };
} 