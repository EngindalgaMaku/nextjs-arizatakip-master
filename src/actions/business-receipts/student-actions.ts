'use server';

// import { createServerActionClient } from '@supabase/auth-helpers-nextjs'; // Old
import { createSupabaseServerClient } from '@/lib/supabase/server'; // New
// import { cookies } from 'next/headers'; // No longer needed here as createSupabaseServerClient handles it.
import { z } from 'zod';

// const getSupabaseClient = () => createServerActionClient<Database>({ cookies }); // Old

// İlgili sınıfların adları (12A ve 12H)
const TARGET_CLASS_NAMES = ['12A', '12H', '12Mesem'];
const TARGET_GRADE_LEVEL = 12;

interface StudentLoginResult {
  studentId: string;
  studentName: string;
  className: string;
  schoolNumber: string;
}

/**
 * Öğrencinin okul numarası ve adıyla giriş yapmasını sağlar.
 * Sadece belirtilen 12. sınıf şubelerindeki öğrencilere izin verilir.
 */
export async function loginStudentForReceipts(
  schoolNumber: string,
  studentName: string
): Promise<{ data: StudentLoginResult | null; error: string | null }> {
  const supabase = await createSupabaseServerClient(); // New way to get client

  const validation = z.object({
    schoolNumber: z.string().min(1, "Okul numarası boş olamaz."),
    studentName: z.string().min(2, "Öğrenci adı en az 2 karakter olmalıdır."),
  }).safeParse({ schoolNumber, studentName });

  if (!validation.success) {
    return { data: null, error: validation.error.errors.map(e => e.message).join(', ') };
  }

  try {
    // Fetch as a list first to check for multiple exact matches
    const { data: students, error: studentFetchError } = await supabase
      .from('students')
      .select(`
        id,
        name,
        school_number,
        classes (id, name, grade_level)
      `)
      .eq('school_number', validation.data.schoolNumber)
      .ilike('name', `%${validation.data.studentName.trim()}%`);

    if (studentFetchError) {
      console.error('Error fetching student list:', studentFetchError);
      return { data: null, error: 'Öğrenci bilgileri alınırken bir veritabanı hatası oluştu.' };
    }

    if (!students || students.length === 0) {
      return { data: null, error: 'Öğrenci bulunamadı. Okul numarası ve adı kontrol edin.' };
    }

    if (students.length > 1) {
      console.warn(`Multiple students found for school_number: ${validation.data.schoolNumber} and name: ${validation.data.studentName.trim()}`, students);
      return { data: null, error: 'Birden fazla öğrenci bulundu. Lütfen bilgileri daha kesin girin veya yönetici ile iletişime geçin.' };
    }

    const student = students[0]; // Exactly one student found

    // @ts-ignore // Supabase generated types bazen class ilişkisini doğru çıkaramayabilir
    const studentClassArray = student.classes as unknown as Array<{id: any; name: string; grade_level: number } > | {id: any; name: string; grade_level: number };
    let actualStudentClass: {id: any; name: string; grade_level: number } | undefined;

    if (Array.isArray(studentClassArray) && studentClassArray.length > 0) {
      actualStudentClass = studentClassArray[0];
    } else if (!Array.isArray(studentClassArray)) {
      actualStudentClass = studentClassArray; // It might be a single object
    }

    if (!actualStudentClass || actualStudentClass.grade_level !== TARGET_GRADE_LEVEL || !TARGET_CLASS_NAMES.includes(actualStudentClass.name)) {
      return { 
        data: null, 
        error: `Bu sistem sadece ${TARGET_GRADE_LEVEL}. sınıf ${TARGET_CLASS_NAMES.join(' ve ')} şubeleri içindir.` 
      };
    }

    if (!student) {
      return {
        data: null,
        error: 'Öğrenci bulunamadı'
      };
    }

    return {
      data: {
        studentId: student.id,
        studentName: student.name,
        className: actualStudentClass.name,
        schoolNumber: student.school_number,
      },
      error: null
    };

  } catch (error) {
    console.error('Unexpected error in loginStudentForReceipts:', error);
    return { data: null, error: 'Giriş yapılırken beklenmedik bir hata oluştu.' };
  }
}

/**
 * Öğrencinin belirli bir yıldaki dekontlarını (Eylül-Haziran) ve işletme bilgilerini getirir.
 */
export async function getStudentReceiptsDashboard(
  studentId: string,
  year: number
): Promise<{ data: any[] | null; error: string | null }> { // any[] tipi detaylandırılacak
  const supabase = await createSupabaseServerClient(); // New way to get client
  const validation = z.object({
    studentId: z.string().uuid("Geçersiz öğrenci ID."),
    year: z.number().int().min(new Date().getFullYear() - 5).max(new Date().getFullYear() + 1, "Geçersiz yıl."),
  }).safeParse({ studentId, year });

  if (!validation.success) {
    return { data: null, error: validation.error.errors.map(e => e.message).join(', ') };
  }
  
  // Eylül (9) - Haziran (6) arası aylar.
  // Veritabanında aylar 1-12 olarak tutulduğu için bu aralıkta sorgu yapacağız.
  // Ancak gösterimde Eylül'den Haziran'a doğru bir sıra izlenmeli.

  try {
    const { data: receipts, error } = await supabase
      .from('receipts')
      .select(`
        id,
        month,
        year,
        file_path,
        file_name_original,
        notes,
        uploaded_at,
        staj_isletmeleri ( name )
      `)
      .eq('student_id', validation.data.studentId)
      .or(`and(month.gte.9,month.lte.12,year.eq.${validation.data.year}),and(month.gte.1,month.lte.6,year.eq.${validation.data.year + 1})`)

    if (error) {
      console.error('Error fetching student receipts:', error);
      return { data: null, error: 'Dekontlar alınırken bir hata oluştu.' };
    }
    
    // İstemci tarafında aylara göre gruplamak ve eksik ayları göstermek için tüm ayları içeren bir yapı döndürülebilir.
    // Örnek: { 9: receiptData, 10: null, ... }
    // Şimdilik sadece gelen dekontları döndürüyoruz.
    return { data: receipts, error: null };

  } catch (e) {
    console.error('Unexpected error in getStudentReceiptsDashboard:', e);
    return { data: null, error: 'Dekontlar alınırken beklenmedik bir hata oluştu.' };
  }
}

export async function getClassesForReceiptLogin(): Promise<{ data: Array<{ id: string; name: string }> | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('id, name')
      .eq('grade_level', TARGET_GRADE_LEVEL)
      .in('name', TARGET_CLASS_NAMES)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching classes for login:', error);
      return { data: null, error: 'Sınıflar yüklenirken bir hata oluştu.' };
    }
    return { data, error: null };
  } catch (e) {
    console.error('Unexpected error in getClassesForReceiptLogin:', e);
    return { data: null, error: 'Sınıflar yüklenirken beklenmedik bir hata oluştu.' };
  }
}

export async function getStudentsByClassForReceiptLogin(classId: string): Promise<{ data: Array<{ id: string; name: string }> | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const validatedClassId = z.string().uuid().safeParse(classId);
  if (!validatedClassId.success) {
    return { data: null, error: 'Geçersiz sınıf ID.' };
  }

  try {
    const { data, error } = await supabase
      .from('students')
      .select('id, name')
      .eq('class_id', validatedClassId.data)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching students by class for login:', error);
      return { data: null, error: 'Öğrenciler yüklenirken bir hata oluştu.' };
    }
    return { data, error: null };
  } catch (e) {
    console.error('Unexpected error in getStudentsByClassForReceiptLogin:', e);
    return { data: null, error: 'Öğrenciler yüklenirken beklenmedik bir hata oluştu.' };
  }
}

export async function verifyStudentLogin(
  studentId: string,
  schoolNumberInput: string
): Promise<{ data: StudentLoginResult | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  const validation = z.object({
    studentId: z.string().uuid("Geçersiz öğrenci ID."),
    schoolNumber: z.string().min(1, "Okul numarası boş olamaz."),
  }).safeParse({ studentId, schoolNumber: schoolNumberInput });

  if (!validation.success) {
    return { data: null, error: validation.error.errors.map(e => e.message).join(', ') };
  }

  try {
    const { data: student, error: studentFetchError } = await supabase
      .from('students')
      .select(`
        id,
        name,
        school_number,
        classes (id, name, grade_level)
      `)
      .eq('id', validation.data.studentId)
      .single();

    if (studentFetchError || !student) {
      console.error('Error fetching student for verification:', studentFetchError);
      return { data: null, error: 'Öğrenci bilgileri alınamadı veya bulunamadı.' };
    }

    if (student.school_number !== validation.data.schoolNumber) {
      return { data: null, error: 'Okul numarası eşleşmiyor. Lütfen kontrol edin.' };
    }

    // @ts-ignore 
    const studentClassArrayVerify = student.classes as unknown as Array<{id: any; name: string; grade_level: number } > | {id: any; name: string; grade_level: number };
    let actualStudentClassVerify: {id: any; name: string; grade_level: number } | undefined;

    if (Array.isArray(studentClassArrayVerify) && studentClassArrayVerify.length > 0) {
      actualStudentClassVerify = studentClassArrayVerify[0];
    } else if (!Array.isArray(studentClassArrayVerify)) {
      actualStudentClassVerify = studentClassArrayVerify; // It might be a single object
    }

    if (!actualStudentClassVerify || actualStudentClassVerify.grade_level !== TARGET_GRADE_LEVEL || !TARGET_CLASS_NAMES.includes(actualStudentClassVerify.name)) {
      return { 
        data: null, 
        error: `Bu sistem sadece ${TARGET_GRADE_LEVEL}. sınıf ${TARGET_CLASS_NAMES.join(' ve ')} şubeleri içindir. Seçilen öğrenci bu kriterlere uymuyor.` 
      };
    }

    return {
      data: {
        studentId: student.id,
        studentName: student.name,
        className: actualStudentClassVerify.name,
        schoolNumber: student.school_number,
      },
      error: null,
    };

  } catch (error) {
    console.error('Unexpected error in verifyStudentLogin:', error);
    return { data: null, error: 'Giriş yapılırken beklenmedik bir hata oluştu.' };
  }
} 