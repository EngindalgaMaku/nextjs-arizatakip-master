// Client-side student actions (no 'use server')

import supabase from '@/lib/supabase-browser';
import { Student, StudentSchema } from '@/types/students';

/**
 * Fetch all students for a given class.
 */
export async function fetchStudentsByClass(classId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('id, name, email, birth_date, phone, gender, school_number, status, guardians, class_id, created_at, updated_at')
    .eq('class_id', classId)
    .order('name', { ascending: true });

  if (error) {
    console.error(`Error fetching students for class ${classId}:`, error);
    throw error;
  }

  const mappedData = data?.map(student => ({
    id: student.id,
    name: student.name,
    email: student.email ?? '',
    birthDate: student.birth_date,
    phone: student.phone ?? '',
    gender: student.gender ?? undefined,
    schoolNumber: student.school_number,
    status: student.status,
    guardians: student.guardians ?? [],
  })) || [];

  const validatedData = mappedData.map(studentData => {
    const parseResult = StudentSchema.safeParse(studentData);
    if (!parseResult.success) {
      console.warn(`Fetched student data validation failed for student ID ${studentData.id}:`, parseResult.error);
      return null;
    }
    return parseResult.data;
  }).filter((s): s is NonNullable<typeof s> => s !== null);

  return validatedData;
}

/**
 * Create a new student in the given class.
 */
export async function createStudent(classId: string, payload: Student): Promise<{ success: boolean; student?: Student; error?: string }> {
  const parse = StudentSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  // Map Zod schema (camelCase) to DB columns (snake_case)
  const studentData = {
    class_id: classId,
    name: parse.data.name,
    school_number: parse.data.schoolNumber ?? '',
    email: parse.data.email || null, // Use null if empty string
    birth_date: parse.data.birthDate || null, // Use null if empty string
    phone: parse.data.phone || null, // Use null if empty string
    gender: parse.data.gender!, // Non-null assertion
    status: parse.data.status, // Already has default
    guardians: JSON.stringify(parse.data.guardians ?? []), // Store as JSON string
  };

  try {
    const { data, error } = await supabase
      .from('students')
      .insert(studentData)
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating student:', error?.message, error?.details);
      return { success: false, error: error?.message };
    }

    const mappedStudent: Student = {
      id: data.id,
      name: data.name,
      email: data.email ?? null,
      birthDate: data.birth_date ?? null,
      phone: data.phone ?? null,
      gender: data.gender,
      schoolNumber: data.school_number ?? null,
      status: data.status,
      guardians: JSON.parse(typeof data.guardians === 'string' ? data.guardians : JSON.stringify(data.guardians ?? [])),
    };

    return { success: true, student: mappedStudent };
  } catch (err) {
    console.error('createStudent error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Update an existing student.
 */
export async function updateStudent(classId: string, id: string, payload: Student): Promise<{ success: boolean; student?: Student; error?: string }> {
  const parse = StudentSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  // Map Zod schema (camelCase) to DB columns (snake_case)
  const studentData = {
    name: parse.data.name,
    school_number: parse.data.schoolNumber ?? '',
    email: parse.data.email || null, // Use null if empty string
    birth_date: parse.data.birthDate || null, // Use null if empty string
    phone: parse.data.phone || null, // Use null if empty string
    gender: parse.data.gender!, // Non-null assertion
    status: parse.data.status, // Already has default
    guardians: JSON.stringify(parse.data.guardians ?? []), // Store as JSON string
  };

  try {
    const { data, error } = await supabase
      .from('students')
      .update(studentData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating student:', error?.message, error?.details);
      return { success: false, error: error?.message };
    }

    const mappedStudent: Student = {
      id: data.id,
      name: data.name,
      email: data.email ?? null,
      birthDate: data.birth_date ?? null,
      phone: data.phone ?? null,
      gender: data.gender,
      schoolNumber: data.school_number ?? null,
      status: data.status,
      guardians: JSON.parse(typeof data.guardians === 'string' ? data.guardians : JSON.stringify(data.guardians ?? [])),
    };

    return { success: true, student: mappedStudent };
  } catch (err) {
    console.error('updateStudent error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Delete a student by ID.
 */
export async function deleteStudent(classId: string, id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Error deleting student:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('deleteStudent error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
} 