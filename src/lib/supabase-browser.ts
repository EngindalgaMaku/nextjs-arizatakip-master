import { Database } from '@/types/supabase'; // Adjusted path assuming @/ resolves to admin/src/
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gcxbfmqyvqchcrudxpmh.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjeGJmbXF5dnFjaGNydWR4cG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzQ5NTcsImV4cCI6MjA2MDc1MDk1N30.ZVAsgNkAWqtSpEgUufOdvegyXVeN5H6fXYA7rn-8osQ";

// Demo mode flag
export const DEMO_MODE = false;

// Create Supabase client specifically for browser use
const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // default is true
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Export supabase instance as default
export default supabase;

// Export browser-specific auth functions
export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function signUp(email: string, password: string, userData: any = {}) {
  return supabase.auth.signUp({
    email,
    password,
    options: { data: userData }
  });
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

export async function updatePassword(newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword });
}

export async function updateUserProfile(userData: any) {
  return supabase.auth.updateUser({
    data: userData
  });
}

export async function getSystemSetting(key: string) {
  return supabase
    .from('system_settings')
    .select('*')
    .eq('key', key)
    .single();
}

// Add browser-specific methods as needed 