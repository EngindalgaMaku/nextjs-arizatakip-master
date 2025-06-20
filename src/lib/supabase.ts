// Import the *browser* client instance
import supabase from './supabase-browser';
// Re-export it for convenience if needed elsewhere, though direct import is preferred
export { supabase };

// .env.local'den ortam değişkenleri
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gcxbfmqyvqchcrudxpmh.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjeGJmbXF5dnFjaGNydWR4cG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzQ5NTcsImV4cCI6MjA2MDc1MDk1N30.ZVAsgNkAWqtSpEgUufOdvegyXVeN5H6fXYA7rn-8osQ";

// Demo modunu kontrol et - Supabase bağlantısı yoksa true yapın
export const DEMO_MODE = false;

export type User = {
  id: string;  // UUID formatında
  email: string;
  name: string | null;
  role: 'admin' | 'editor' | 'viewer' | 'teacher'; // teacher rolünü ekliyoruz
  created_at: string;
  last_login: string | null;
  status: 'active' | 'inactive';
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
};

// Arıza durumu için tip
export type IssueStatus = 'beklemede' | 'atandi' | 'inceleniyor' | 'cozuldu' | 'kapatildi';

// Arıza önceliği için tip
export type IssuePriority = 'dusuk' | 'normal' | 'yuksek' | 'kritik';

// Cihaz tipi için tip
export type DeviceType = 'akilli_tahta' | 'bilgisayar' | 'yazici' | 'projektor' | 'diger';

// Cihaz konumu için tip
export type DeviceLocation = 'sinif' | 'laboratuvar' | 'idare' | 'ogretmenler_odasi' | 'diger';

// Arıza ekleme için veri tipi
export interface IssueData {
  device_type: DeviceType;
  device_name: string;
  device_location: DeviceLocation;
  room_number: string;
  description: string;
  reported_by: string;
  status: IssueStatus;
  priority: IssuePriority;
}

// Arıza kaydı tipi
export type Issue = {
  id: string;
  device_type: DeviceType;
  device_name: string;
  device_location: DeviceLocation;
  room_number: string;
  reported_by: string;
  assigned_to: string | null;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  resolved_at: string | null;
};

// Sistem ayarları türü
export type SystemSettings = {
  id: string;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string | null;
  updated_by: string | null;
};

// Öğretmen giriş kodu ayar anahtarı
export const TEACHER_ACCESS_CODE_KEY = 'teacher_access_code';

// Auth fonksiyonları
export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Dashboard sayfası için getSession fonksiyonu ekliyoruz
export async function getSession() {
  return getCurrentSession();
}

export async function registerUser(email: string, password: string, userData: Partial<User>) {
  try {
    // 1. Auth kayıt işlemi
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name,
          role: userData.role || 'viewer',
          status: userData.status || 'active'
        }
      }
    });
    
    if (error) throw error;
    
    // 2. Kullanıcı tablosuna kaydet - veriyi senkronize tut
    if (data.user) {
      const { error: insertError } = await supabase.from('users').insert({
        id: data.user.id,
        email: data.user.email,
        name: userData.name, // Name alanını doğrudan ekle
        role: userData.role || 'viewer',
        status: userData.status || 'active',
        created_at: new Date().toISOString()
      });
      
      if (insertError) {
        console.error('Kullanıcı DB kaydı oluşturulurken hata:', insertError);
        // Auth kaydı başarılı ama DB kaydı başarısız, burada kullanıcıyı silmek veya tekrar denemek gerekebilir
      }
    }
    
    return data;
  } catch (error) {
    console.error('Kullanıcı kaydı sırasında hata:', error);
    throw error;
  }
}

export async function updateUser(id: string, data: Partial<User>) {
  try {
    // 1. Kullanıcı verisini güncelle (Supabase DB)
    const { error: dbError } = await supabase
      .from('users')
      .update({
        name: data.name,
        role: data.role,
        status: data.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
      
    if (dbError) {
      console.error('Kullanıcı DB güncellemesi sırasında hata:', dbError);
      throw dbError;
    }
    
    // Admin API yerine normal auth update kullan
    // Not: Bu işlem sadece mevcut oturum açmış kullanıcı için çalışır
    // Yönetici rolü için bu kısıtlama bulunmaktadır
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          name: data.name,
          role: data.role,
          status: data.status
        }
      });
      
      if (authError) {
        console.log('Auth metadata güncellemesi sırasında bilgi:', authError);
        // Bu bir hata değil, sadece bilgilendirme amaçlıdır
        // Kullanıcı kendi kendini düzenliyor olabilir, başkasını düzenliyorsa bu değişiklik yapılamaz
      }
    } catch (authErr) {
      console.log('Auth metadata güncellemesi sırasında hata yakalandı:', authErr);
      // Bu hatayı yutuyoruz çünkü kritik değil ve beklenen bir davranış
    }
    
    return { data: { id, ...data }, error: null };
  } catch (error) {
    console.error('Kullanıcı güncelleme sırasında hata:', error);
    return { data: null, error: error instanceof Error ? error : new Error('Bilinmeyen hata') };
  }
}

// Example database functions
export async function getUsers() {
  return supabase.from('users').select('*');
}

export async function getUser(id: string) {
  return supabase.from('users').select('*').eq('id', id).single();
}

export async function deleteUser(id: string) {
  return supabase.from('users').delete().eq('id', id);
}

// Arıza İşlemleri
export const getIssues = async (page = 1, pageSize = 10) => {
  try {
    // Sayfalama için offset hesapla
    const offset = (page - 1) * pageSize;
    
    // Önce toplam kayıt sayısını al
    const countResponse = await supabase
      .from('issues')
      .select('id', { count: 'exact', head: true });
    
    const totalCount = countResponse.count || 0;
    
    // Sayfalanmış veriyi al
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching issues:', error);
      return { error, data: null, totalCount: 0, totalPages: 0 };
    }
    
    // Toplam sayfa sayısını hesapla
    const totalPages = Math.ceil(totalCount / pageSize);
    
    return { data, error: null, totalCount, totalPages };
  } catch (error) {
    console.error('Exception fetching issues:', error);
    return { 
      error: error instanceof Error ? error : new Error('Unknown error fetching issues'), 
      data: null,
      totalCount: 0,
      totalPages: 0
    };
  }
};

export async function getIssue(id: string) {
  try {
    const result = await supabase.from('issues').select('*').eq('id', id).single();
    
    if (result.error) {
      if (result.error.code === 'PGRST116') {
        // Kayıt bulunamadı hatası
        console.error('Belirtilen ID ile arıza kaydı bulunamadı:', id);
        return { data: null, error: new Error('Arıza kaydı bulunamadı') };
      }
      
      // Diğer hatalar
      console.error('Arıza detayları getirilirken hata:', result.error);
      throw result.error;
    }
    
    return result;
  } catch (error) {
    console.error('getIssue hatası:', error);
    throw error;
  }
}

export async function createIssue(data: Omit<Issue, 'id' | 'created_at' | 'updated_at'>) {
  const newIssue = {
    ...data,
    created_at: new Date().toISOString(),
  };
  return supabase.from('issues').insert(newIssue).select().single();
}

export async function updateIssue(id: string, data: Partial<Issue>) {
  const updatedData = {
    ...data,
    updated_at: new Date().toISOString(),
    ...(data.status === 'cozuldu' as any && !data.resolved_at ? { resolved_at: new Date().toISOString() } : {})
  };
  
  return supabase.from('issues').update(updatedData).eq('id', id);
}

export async function deleteIssue(id: string) {
  return supabase.from('issues').delete().eq('id', id);
}

// Arıza ekleme fonksiyonu
export async function addIssue(issueData: IssueData) {
  const { data, error } = await supabase
    .from('issues')
    .insert([
      {
        ...issueData,
        created_at: new Date().toISOString(),
      },
    ])
    .select();

  return { data, error };
}

// Öğretmen için arızaları getirme fonksiyonu
export async function getIssuesForTeacher(teacherName: string, page = 1, pageSize = 10) {
  try {
    // Sayfalama için offset hesapla
    const offset = (page - 1) * pageSize;
    
    // Önce toplam kayıt sayısını al
    const countResponse = await supabase
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .eq('reported_by', teacherName);
    
    const totalCount = countResponse.count || 0;
    
    // Sayfalanmış veriyi al
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('reported_by', teacherName)
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching issues for teacher:', error);
      return { error, data: null, totalCount: 0, totalPages: 0 };
    }
    
    // Toplam sayfa sayısını hesapla
    const totalPages = Math.ceil(totalCount / pageSize);
    
    return { data, error: null, totalCount, totalPages };
  } catch (error) {
    console.error('Exception fetching issues for teacher:', error);
    return { 
      error: error instanceof Error ? error : new Error('Unknown error fetching issues'), 
      data: null,
      totalCount: 0,
      totalPages: 0
    };
  }
}

// Tüm arızaları getirme fonksiyonu (pagination olmadan, rapor gibi özel amaçlar için)
export async function getAllIssues() {
  try {
    // Önce toplam kayıt sayısını al
    const countResponse = await supabase
      .from('issues')
      .select('id', { count: 'exact', head: true });
    
    const totalCount = countResponse.count || 0;
    
    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all issues:', error);
      return { error, data: null, totalCount: 0, totalPages: 0 };
    }
    
    // Tüm veriyi getirdiğimiz için, toplam sayfa sayısı her zaman 1 olacak
    const totalPages = 1;
    
    return { data, error: null, totalCount, totalPages };
  } catch (error) {
    console.error('Exception fetching all issues:', error);
    return { 
      error: error instanceof Error ? error : new Error('Unknown error fetching all issues'), 
      data: null,
      totalCount: 0,
      totalPages: 0
    };
  }
}

// Diğer işlevler (eski)
// Products
export async function getProducts() {
  return supabase.from('products').select('*');
}

export async function getProduct(id: string) {
  return supabase.from('products').select('*').eq('id', id).single();
}

export async function createProduct(data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
  return supabase.from('products').insert(data).select().single();
}

export async function updateProduct(id: string, data: Partial<Product>) {
  return supabase.from('products').update(data).eq('id', id);
}

export async function deleteProduct(id: string) {
  return supabase.from('products').delete().eq('id', id);
}

// Orders
export async function getOrders() {
  return supabase.from('orders').select('*');
}

export async function getOrder(id: string) {
  return supabase.from('orders').select('*').eq('id', id).single();
}

export async function createOrder(data: Omit<Order, 'id' | 'created_at' | 'updated_at'>) {
  return supabase.from('orders').insert(data).select().single();
}

export async function updateOrder(id: string, data: Partial<Order>) {
  return supabase.from('orders').update(data).eq('id', id);
}

export async function deleteOrder(id: string) {
  return supabase.from('orders').delete().eq('id', id);
}

// Sistem ayarlarını getir
export async function getSystemSettings() {
  return supabase.from('settings').select('*');
}

// Belirli bir ayarı getir
export async function getSystemSetting(key: string) {
  return supabase
    .from('settings')
    .select('*')
    .eq('key', key)
    .single();
}

// Öğretmen giriş kodunu getir
export async function getTeacherAccessCode() {
  try {
    if (DEMO_MODE) {
      // Demo modda localStorage'dan al
      if (typeof window !== 'undefined') {
        const storedCode = localStorage.getItem(TEACHER_ACCESS_CODE_KEY);
        if (storedCode) {
          return storedCode;
        }
      }
      // Varsayılan değer
      return '12345';
    } else {
      // Supabase'den al
      const { data, error } = await getSystemSetting(TEACHER_ACCESS_CODE_KEY);
      
      if (error) {
        console.error('Öğretmen giriş kodu alınırken hata:', error);
        return '12345'; // Varsayılan değer
      }
      
      return data?.value || '12345';
    }
  } catch (err) {
    console.error('Öğretmen giriş kodu getirilirken hata:', err);
    return '12345'; // Hata durumunda varsayılan değer
  }
}

// Sistem ayarını güncelle
export async function updateSystemSetting(key: string, value: string, userId: string) {
  try {
    console.log(`Attempting to update system setting: ${key} with value: ${value}`);
    
    if (DEMO_MODE) {
      // Demo modda sadece localStorage'a kaydet
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
        console.log(`DEMO MODE: Setting saved to localStorage: ${key}=${value}`);
      }
      return { data: { key, value }, error: null };
    } else {
      // Supabase'e kaydet
      console.log(`Checking if setting exists: ${key}`);
      const { data: existingData, error: checkError } = await getSystemSetting(key);
      
      if (checkError) {
        console.error(`Error checking existing setting: ${key}`, checkError);
        if (checkError.code !== 'PGRST116') { // PGRST116: Sonuç bulunamadı hatası
          throw checkError;
        }
      }
      
      console.log(`Existing data for ${key}:`, existingData);
      
      let result;
      
      if (existingData) {
        // Mevcut ayarı güncelle
        console.log(`Updating existing setting: ${key}`);
        result = await supabase
          .from('settings')
          .update({
            value,
            updated_at: new Date().toISOString(),
            updated_by: userId
          })
          .eq('key', key);
      } else {
        // Yeni ayar oluştur
        console.log(`Inserting new setting: ${key}`);
        result = await supabase
          .from('settings')
          .insert({
            key,
            value,
            description: key === TEACHER_ACCESS_CODE_KEY ? 'Öğretmen giriş kodu' : null,
            created_at: new Date().toISOString(),
            updated_by: userId
          });
      }
      
      if (result.error) {
        console.error(`Error ${existingData ? 'updating' : 'inserting'} setting:`, result.error);
        throw result.error;
      }
      
      console.log(`Successfully ${existingData ? 'updated' : 'inserted'} setting: ${key}`);
      return result;
    }
  } catch (err) {
    console.error('Ayar güncellenirken hata:', err);
    throw err;
  }
}

// Mevcut kullanıcı bilgilerini getir
export async function loadUserData() {
  try {
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();
    
    if (sessionError || !user) {
      throw sessionError || new Error('Kullanıcı oturumu bulunamadı');
    }
    
    // Auth kullanıcı bilgilerini direkt kullan - veritabanı sorgusu yapmadan
    const userData: User = {
      id: user.id,
      email: user.email || '',
      name: user.email?.split('@')[0] || 'Kullanıcı',
      role: 'admin' as const,
      created_at: user.created_at || new Date().toISOString(),
      last_login: null,
      status: 'active' as const
    };
    
    return userData;
  } catch (error) {
    console.error('Kullanıcı bilgileri yüklenirken hata:', error);
    // Demo ortamında temel kullanıcı verisi döndür
    if (DEMO_MODE && typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('demoAuthUser');
      if (storedUser) {
        return JSON.parse(storedUser);
      }
    }
    return null;
  }
}

// updateUserProfile fonksiyonunu geri ekliyorum
export async function updateUserProfile(userId: string, userData: Partial<User>) {
  // Auth metadata güncelleme
  const { error: metadataError } = await supabase.auth.updateUser({
    data: userData
  });
  
  if (metadataError) throw metadataError;
  
  // Kullanıcı tablosunu güncelleme
  return supabase.from('users').update(userData).eq('id', userId);
}

// Şifre değiştirme fonksiyonu
export async function updatePassword(currentPassword: string, newPassword: string) {
  try {
    // Önce mevcut şifre ile oturum açma kontrolü yap
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: (await supabase.auth.getUser()).data.user?.email || '',
      password: currentPassword
    });
    
    if (authError) {
      // Mevcut şifre yanlış
      throw new Error('Mevcut şifre doğru değil');
    }
    
    // Şifreyi güncelle
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Şifre güncellenirken hata:', error);
    throw error;
  }
}

/**
 * Kullanıcının FCM token'ını veritabanına kaydeder
 */
export async function saveFCMToken(userId: string, token: string, userRole?: string) {
  try {
    if (!userId || !token) {
      console.error('saveFCMToken: userId or token is missing');
      return { error: 'UserId or token is missing' };
    }

    // Check if the token already exists for this user
    const { data: existingTokens, error: checkError } = await supabase
      .from('user_fcm_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('token', token);

    if (checkError) {
      console.error('Error checking existing FCM token:', checkError);
      return { error: checkError };
    }

    // If token already exists, no need to insert
    if (existingTokens && existingTokens.length > 0) {
      console.log('Token already exists for this user');
      return { success: true, message: 'Token already exists' };
    }

    // Insert the new token
    const { error: insertError } = await supabase
      .from('user_fcm_tokens')
      .insert({
        user_id: userId,
        token: token,
        user_role: userRole || null,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error saving FCM token:', insertError);
      return { error: insertError };
    }

    console.log('FCM token saved successfully');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in saveFCMToken:', error);
    return { error };
  }
}

/**
 * Kullanıcının tüm FCM token'larını temizler
 */
export async function clearUserTokens(userId: string) {
  try {
    const { error } = await supabase
      .from('user_fcm_tokens')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error('FCM token temizlenemedi:', error);
      return { success: false, error };
    }
    
    console.log(`${userId} kullanıcısı için tüm FCM tokenlar temizlendi`);
    return { success: true };
  } catch (error) {
    console.error('FCM token temizlenirken hata:', error);
    return { success: false, error };
  }
}

/**
 * Veritabanındaki tüm FCM token'ları temizler (sadece çok özel durumlarda kullanılmalı)
 */
export async function clearAllFCMTokens() {
  try {
    // Sadece admin yetkisine sahip kullanıcılar çağırabilir
    const { error } = await supabase
      .from('user_fcm_tokens')
      .delete()
      .neq('user_id', 'dummy');  // Tüm kayıtları silmek için geçerli bir where şartı
    
    if (error) {
      console.error('FCM tokenlar temizlenemedi:', error);
      return { success: false, error };
    }
    
    console.log('Tüm FCM tokenlar temizlendi');
    return { success: true };
  } catch (error) {
    console.error('FCM tokenlar temizlenirken hata:', error);
    return { success: false, error };
  }
}

/**
 * FCM tokenını Supabase'den siler
 * @param userId Kullanıcı ID'si
 * @param token Belirli bir token silinecekse (isteğe bağlı)
 */
export async function deleteFCMToken(userId: string, token?: string) {
  try {
    if (!userId) {
      console.error('deleteFCMToken: userId is missing');
      return { error: 'UserId is missing' };
    }

    let query = supabase
      .from('user_fcm_tokens')
      .delete()
      .eq('user_id', userId);

    // If token is provided, only delete that specific token
    if (token) {
      query = query.eq('token', token);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting FCM token:', error);
      return { error };
    }

    console.log('FCM token(s) deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error in deleteFCMToken:', error);
    return { error };
  }
}

export async function getStudent(id: string) {
  return supabase.from('students').select('id, name, school_number, class_id').eq('id', id).single();
}

export async function getClassNameById(classId: string) {
  if (!classId) return null;
  const { data, error } = await supabase.from('classes').select('name').eq('id', classId).single();
  if (error || !data) return null;
  return data.name;
}

export async function getStudentBySchoolNumber(schoolNumber: string) {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('schoolNumber', schoolNumber)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching student:', error);
    return null;
  }
} 