'use server';

import { supabase } from '@/lib/supabase';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { BranchFormSchema, BranchFormValues } from '@/types/branches';
import { Teacher, TeacherFormSchema, TeacherFormValues, TeacherRole, TeacherSchema } from '@/types/teachers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**
 * Fetch all teachers, optionally filtered by semester.
 */
export async function fetchTeachers(semesterId?: string): Promise<Teacher[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('teachers')
    .select('id, name, birth_date, role, phone, branch_id, created_at, updated_at, is_active, semester_id'); // Include semester_id

  if (semesterId) {
    query = query.eq('semester_id', semesterId);
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) {
    console.error('Error fetching teachers:', error);
    throw error;
  }

  const mappedData = (data || []).map(teacher => {
    const mappedRole = typeof teacher.role === 'string' ? teacher.role.toUpperCase() as TeacherRole : null;
    return {
      id: teacher.id,
      semester_id: teacher.semester_id,
      name: teacher.name,
      birthDate: teacher.birth_date,
      role: mappedRole,
      phone: teacher.phone,
      branchId: teacher.branch_id,
      createdAt: teacher.created_at,
      updatedAt: teacher.updated_at,
      is_active: teacher.is_active
    };
  });

  // Validate mapped data using the full TeacherSchema
  const validatedData = mappedData.map(teacher => {
    // Ensure 'name' is provided and is a string, otherwise provide a default or handle error
    // For now, assuming DB provides valid 'name' as per schema
    const parseResult = TeacherSchema.safeParse(teacher); // Use full TeacherSchema, not partial()
    if (!parseResult.success) {
      console.warn(`Fetched teacher data validation failed for ID ${teacher.id}:`, parseResult.error.flatten());
      // Optionally, decide how to handle invalid records, e.g., filter them out or throw
      // For now, returning null to be filtered, but this means data loss if a teacher is invalid
      return null;
    }
    return parseResult.data;
  }).filter(Boolean) as Teacher[]; // Cast to Teacher[]

  return validatedData;
}

/**
 * Create a new teacher, associated with the provided semester.
 */
export async function createTeacher(payload: TeacherFormValues, semesterId: string): Promise<{ success: boolean; teacher?: Teacher; error?: string | z.ZodIssue[] }> {
  if (!z.string().uuid().safeParse(semesterId).success) {
    return { success: false, error: 'Geçersiz sömestr ID.' };
  }

  const parse = TeacherFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.issues };
  }

  // Map camelCase form values to snake_case DB columns
  const teacherData = {
    name: parse.data.name,
    birth_date: parse.data.birthDate || null,
    role: parse.data.role ? parse.data.role.toLowerCase() : null,
    phone: parse.data.phone || null,
    branch_id: parse.data.branchId || null,
    is_active: true, // Directly set to true on creation
    semester_id: semesterId, // Add semester ID
  };

  const supabase = await createSupabaseServerClient();
  try {
    const { data: newTeacherData, error } = await supabase
      .from('teachers')
      .insert(teacherData)
      .select()
      .single();

    if (error || !newTeacherData) {
      console.error('Error creating teacher:', error?.message);
      // Handle specific DB errors
      if (error?.code === '23503') return { success: false, error: 'Seçilen branş veya sömestr geçerli değil.' };
      return { success: false, error: error?.message || 'Öğretmen oluşturulamadı.' };
    }

    // Map DB result back to Teacher schema type
    const mappedResult: Teacher = {
        id: newTeacherData.id,
        semester_id: newTeacherData.semester_id,
        name: newTeacherData.name,
        birthDate: newTeacherData.birth_date,
        role: typeof newTeacherData.role === 'string' ? newTeacherData.role.toUpperCase() as TeacherRole : null,
        phone: newTeacherData.phone,
        branchId: newTeacherData.branch_id,
        createdAt: newTeacherData.created_at,
        updatedAt: newTeacherData.updated_at,
        is_active: newTeacherData.is_active,
    };

    // Final validation of the created object
    const finalParse = TeacherSchema.safeParse(mappedResult);
    if (!finalParse.success) {
      console.error('Created teacher data validation failed:', finalParse.error);
      return { success: false, error: 'Öğretmen oluşturuldu ancak veri doğrulanamadı.' };
    }

    revalidatePath('/dashboard/area-teachers');
    return { success: true, teacher: finalParse.data };

  } catch (err) {
    console.error('Create teacher error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Update an existing teacher. Semester is usually not updated here.
 */
export async function updateTeacher(id: string, payload: TeacherFormValues): Promise<{ success: boolean; teacher?: Teacher; error?: string | z.ZodIssue[] }> {
   const parse = TeacherFormSchema.safeParse(payload);
   if (!parse.success) {
    return { success: false, error: parse.error.issues };
  }

  // Map form values to DB columns (excluding semester_id)
  const teacherData = {
    name: parse.data.name,
    birth_date: parse.data.birthDate || null,
    role: parse.data.role ? parse.data.role.toLowerCase() : null,
    phone: parse.data.phone || null,
    branch_id: parse.data.branchId || null,
    // Do not update is_active here, use updateTeacherActiveStatus
  };

  const supabase = await createSupabaseServerClient();
   try {
    const { data: updatedTeacherData, error } = await supabase
      .from('teachers')
      .update(teacherData)
      .eq('id', id)
      .select()
      .single();

     if (error || !updatedTeacherData) {
        console.error(`Error updating teacher ${id}:`, error?.message);
        if (error?.code === '23503') return { success: false, error: 'Seçilen branş geçersiz.' };
        return { success: false, error: error?.message || 'Öğretmen güncellenemedi.' };
     }

      // Map DB result back to Teacher type
     const mappedResult: Teacher = {
        id: updatedTeacherData.id,
        semester_id: updatedTeacherData.semester_id, // Include semester_id from DB
        name: updatedTeacherData.name,
        birthDate: updatedTeacherData.birth_date,
        role: typeof updatedTeacherData.role === 'string' ? updatedTeacherData.role.toUpperCase() as TeacherRole : null,
        phone: updatedTeacherData.phone,
        branchId: updatedTeacherData.branch_id,
        createdAt: updatedTeacherData.created_at,
        updatedAt: updatedTeacherData.updated_at,
        is_active: updatedTeacherData.is_active,
    };

     // Validate final object
     const finalParse = TeacherSchema.safeParse(mappedResult);
     if (!finalParse.success) {
        console.error('Updated teacher data validation failed:', finalParse.error);
        return { success: false, error: 'Öğretmen güncellendi ancak veri doğrulanamadı.' };
     }

     revalidatePath('/dashboard/area-teachers');
     return { success: true, teacher: finalParse.data };

   } catch (err) {
    console.error('Update teacher error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Delete a teacher by ID.
 */
export async function deleteTeacher(id: string): Promise<{ success: boolean; error?: string }> {
   try {
    const { error } = await supabase
      .from('teachers')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Error deleting teacher:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('deleteTeacher error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fetch a single teacher by ID.
 */
export async function fetchTeacherById(id: string): Promise<Teacher | null> {
   if (!id) return null;
   const supabase = await createSupabaseServerClient();
   const { data, error } = await supabase
    .from('teachers')
    // Select ALL fields defined in TeacherSchema (using snake_case), including semester_id
    .select(`id, name, birth_date, role, phone, branch_id, created_at, updated_at, is_active, semester_id`)
    .eq('id', id)
    .single();

    if (error) {
      console.error(`[fetchTeacherById] Error fetching teacher ${id}:`, error);
      if (error.code === 'PGRST116') { 
          console.log(`[fetchTeacherById] Teacher ${id} not found (PGRST116).`);
          return null; 
      }
      throw error; // Propagate other errors
    }
    
    if (!data) { 
        console.warn(`[fetchTeacherById] No data returned for teacher ${id} despite no error.`);
        return null;
    }
    
    const mappedRole = typeof data.role === 'string' ? data.role.toUpperCase() as TeacherRole : null;
    const teacherData = {
        id: data.id,
        name: data.name,
        birthDate: data.birth_date,
        role: mappedRole,
        phone: data.phone,
        branchId: data.branch_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        is_active: data.is_active,
        semester_id: data.semester_id, // Ensure semester_id is mapped
    };

    const parseResult = TeacherSchema.safeParse(teacherData);
    if (!parseResult.success) {
        console.error(`[fetchTeacherById] Validation failed for teacher ${id}:`, parseResult.error.flatten());
        return null; // Return null if schema validation fails
    }

    return parseResult.data;
}

// Add other teacher actions (create, update, delete) here if needed later 

// --- Branch Actions --- 

/**
 * Fetch all branches for dropdowns/filtering.
 */
export interface Branch {
    id: string;
    name: string;
}

export async function fetchBranches(): Promise<Branch[]> {
    const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        // Custom order: Bilişim Teknolojileri first, then alphabetically
        .order('name', { 
            ascending: true, 
            // Treat 'Bilişim Teknolojileri' specially for sorting
            // This specific syntax might need adjustment based on Supabase client capabilities
            // A raw query might be needed if this doesn't work directly
            nullsFirst: false, // Standard behaviour
            // Attempting a simplified CASE logic hint (actual implementation depends on client)
            // Ideally: ORDER BY CASE WHEN name = 'Bilişim Teknolojileri' THEN 0 ELSE 1 END, name ASC
            // Since direct CASE isn't standard in JS client order, we'll sort client-side instead.
        });

    if (error) {
        console.error('Error fetching branches:', error);
        throw error; 
    }

    const branchesData = (data || []).filter(b => b.id && b.name) as Branch[];

    // Client-side sorting to ensure 'Bilişim Teknolojileri' is first
    branchesData.sort((a, b) => {
        if (a.name === 'Bilişim Teknolojileri') return -1; // a comes first
        if (b.name === 'Bilişim Teknolojileri') return 1;  // b comes first
        return a.name.localeCompare(b.name); // Otherwise, sort alphabetically
    });

    return branchesData;
}

/**
 * Create a new branch.
 */
export async function createBranch(payload: BranchFormValues): Promise<{ success: boolean; branch?: Branch; error?: string }> {
  const parse = BranchFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  try {
    const { data: newBranch, error } = await supabase
      .from('branches')
      .insert({ name: parse.data.name })
      .select('id, name') // Select only id and name
      .single();

    if (error || !newBranch) {
      console.error('Error creating branch:', error?.message);
      if (error?.code === '23505') { // unique_violation
          return { success: false, error: `"${parse.data.name}" adında bir branş zaten mevcut.` };
      }
      return { success: false, error: error?.message || 'Branş oluşturulamadı.' };
    }

    // Revalidate the teachers page as it uses the branches list
    revalidatePath('/dashboard/area-teachers'); 

    return { success: true, branch: newBranch }; // Return the simple Branch type

  } catch (err) {
    console.error('createBranch error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

// --- NEW ACTION TO UPDATE ACTIVE STATUS ---
export async function updateTeacherActiveStatus(teacherId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  if (!teacherId) {
    return { success: false, error: 'Öğretmen IDsi belirtilmedi.' };
  }

  console.log(`[TeacherAction] Updating active status for ${teacherId} to ${isActive}`);

  const supabase = await createSupabaseServerClient();
  try {
    const { error } = await supabase
      .from('teachers')
      .update({ is_active: isActive, updated_at: new Date().toISOString() }) // Update is_active and timestamp
      .eq('id', teacherId);

    if (error) {
      console.error(`[TeacherAction] Error updating active status for ${teacherId}:`, error);
      return { success: false, error: error.message };
    }

    // Revalidate the teachers list page
    revalidatePath('/dashboard/area-teachers'); 
    console.log(`[TeacherAction] Active status updated successfully for ${teacherId}`);
    return { success: true };

  } catch (err: any) {
    console.error(`[TeacherAction] Uncaught error updating status for ${teacherId}:`, err);
    return { success: false, error: err?.message || 'Durum güncellenirken bilinmeyen bir hata oluştu.' };
  }
}
// --- END NEW ACTION --- 