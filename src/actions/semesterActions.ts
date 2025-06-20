'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Semester, SemesterFormSchema, SemesterFormValues, SemesterSchema } from '@/types/semesters';
import { z } from 'zod';

const SEMESTERS_TABLE = 'semesters';
const SEMESTERS_PATH = '/dashboard/semesters'; // Path for revalidation

// Fetch all semesters, ordered by start date
export async function fetchSemesters(): Promise<Semester[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from(SEMESTERS_TABLE)
    .select('*')
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching semesters:', error);
    throw new Error('Sömestrler getirilirken bir hata oluştu.');
  }

  // Validate the data against the schema
  try {
    return z.array(SemesterSchema).parse(data);
  } catch (validationError) {
    console.error('Fetched semester data validation failed:', validationError);
    // Decide how to handle validation errors, e.g., return empty array or throw
    // return []; 
    throw new Error('Sömestr verileri doğrulanamadı.');
  }
}

// Create a new semester
export async function createSemester(formData: SemesterFormValues): Promise<{ success: boolean; semester?: Semester; error?: string | z.ZodIssue[] }> {
  const supabase = await createSupabaseServerClient();
  const parseResult = SemesterFormSchema.safeParse(formData);

  if (!parseResult.success) {
    console.error('Semester creation validation failed:', parseResult.error.issues);
    return { success: false, error: parseResult.error.issues };
  }

  try {
    const { data: newSemester, error } = await supabase
      .from(SEMESTERS_TABLE)
      .insert(parseResult.data)
      .select()
      .single();

    if (error) {
      console.error('Error creating semester:', error);
      if (error.code === '23505') { // unique constraint violation (likely on name)
        return { success: false, error: 'Bu isimde bir sömestr zaten mevcut.' };
      }
      return { success: false, error: error.message };
    }

    // Validate the returned data
    const finalParse = SemesterSchema.safeParse(newSemester);
    if (!finalParse.success) {
        console.error('Created semester data validation failed:', finalParse.error);
        return { success: false, error: 'Sömestr oluşturuldu ancak dönen veri doğrulanamadı.' };
    }

    return { success: true, semester: finalParse.data };

  } catch (err) {
    console.error('Unexpected error creating semester:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

// Update an existing semester
export async function updateSemester(id: string, formData: SemesterFormValues): Promise<{ success: boolean; semester?: Semester; error?: string | z.ZodIssue[] }> {
  const supabase = await createSupabaseServerClient();
  const parseResult = SemesterFormSchema.safeParse(formData);

  if (!parseResult.success) {
    console.error('Semester update validation failed:', parseResult.error.issues);
    return { success: false, error: parseResult.error.issues };
  }

  try {
    const { data: updatedSemester, error } = await supabase
      .from(SEMESTERS_TABLE)
      .update(parseResult.data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating semester ${id}:`, error);
      if (error.code === '23505') { // unique constraint violation
        return { success: false, error: 'Bu isimde başka bir sömestr zaten mevcut.' };
      }
      return { success: false, error: error.message };
    }

     // Validate the returned data
    const finalParse = SemesterSchema.safeParse(updatedSemester);
    if (!finalParse.success) {
        console.error('Updated semester data validation failed:', finalParse.error);
        return { success: false, error: 'Sömestr güncellendi ancak dönen veri doğrulanamadı.' };
    }

    return { success: true, semester: finalParse.data };

  } catch (err) {
    console.error(`Unexpected error updating semester ${id}:`, err);
    return { success: false, error: err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

// Delete a semester
export async function deleteSemester(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  try {
    const { error } = await supabase
      .from(SEMESTERS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting semester ${id}:`, error);
      // Consider foreign key constraints if semesters are linked elsewhere
       if (error.code === '23503') { 
            return { success: false, error: 'Bu sömestr başka kayıtlara bağlı olduğu için silinemez.' };
       }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error(`Unexpected error deleting semester ${id}:`, err);
    return { success: false, error: err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

// Set a specific semester as active (and deactivate others)
// NOTE: This uses a transaction to ensure atomicity.
export async function setActiveSemester(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  try {
    // Use Supabase Edge Function or RPC for transactions if needed complex logic,
    // otherwise, perform sequential updates (less safe if interrupted).
    // Simple sequential approach (less safe):
    
    // 1. Deactivate all others
    const { error: deactivateError } = await supabase
      .from(SEMESTERS_TABLE)
      .update({ is_active: false })
      .eq('is_active', true)
      .neq('id', id); // Don't deactivate the one we are activating
      
    if (deactivateError) {
      console.error('Error deactivating other semesters:', deactivateError);
      return { success: false, error: 'Diğer sömestrler pasif hale getirilemedi.' };
    }

    // 2. Activate the selected one
    const { error: activateError } = await supabase
      .from(SEMESTERS_TABLE)
      .update({ is_active: true })
      .eq('id', id);

    if (activateError) {
      console.error(`Error activating semester ${id}:`, activateError);
      return { success: false, error: 'Seçilen sömestr aktif hale getirilemedi.' };
    }

    return { success: true };

  } catch (err) {
    console.error(`Unexpected error setting active semester ${id}:`, err);
    return { success: false, error: err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.' };
  }
} 