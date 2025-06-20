import { supabase } from '@/lib/supabase';

export async function getClassesForExamLogin() {
  const { data, error } = await supabase
    .from('classes')
    .select('id, name')
    .order('name', { ascending: true });
  return { data, error: error?.message || null };
}

export async function getStudentsByClassForExamLogin(classId: string) {
  const { data, error } = await supabase
    .from('students')
    .select('id, name')
    .eq('class_id', classId)
    .order('name', { ascending: true });
  return { data, error: error?.message || null };
}

export async function verifyStudentExamLogin(studentId: string, schoolNumber: string) {
  const { data, error } = await supabase
    .from('students')
    .select('id, name, class_id, school_number')
    .eq('id', studentId)
    .eq('school_number', schoolNumber)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  if (!data) {
    return { data: null, error: 'Öğrenci bulunamadı veya okul numarası hatalı.' };
  }

  return {
    data: {
      studentId: data.id,
      studentName: data.name,
      classId: data.class_id,
      schoolNumber: data.school_number
    },
    error: null
  };
} 