'use server';

import { supabase } from '@/lib/supabase';
import {
    TeacherCourseAssignment,
    TeacherCourseAssignmentFormSchema,
    TeacherCourseAssignmentFormValues
} from '@/types/teacherCourseAssignments'; // Assuming types are defined here
import { z } from 'zod';

/**
 * Fetch all course assignments for a specific teacher.
 */
export async function fetchTeacherAssignments(teacherId: string): Promise<TeacherCourseAssignment[]> {
  if (!teacherId) return [];

  console.log(`[Action] Fetching assignments for teacherId: ${teacherId}`);
  const { data, error } = await supabase
    .from('teacher_course_assignments') 
    .select(`
      id,
      teacher_id,
      dal_ders_id,
      assignment, 
      created_at,
      updated_at,
      dal_ders:dal_dersleri ( id, ders_adi, sinif_seviyesi, dal_id ),
      teachers ( id, name )
    `)
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false });

  // Log the raw data received from Supabase
  console.log('[Action] Raw data received from Supabase:', data);

  if (error) {
    console.error(`Error fetching assignments for teacher ${teacherId}:`, error);
    throw error;
  }
  
  // Log before mapping
  console.log('[Action] Mapping fetched data...');
  const mappedData = data?.map(item => {
    let finalTeacher = undefined;
    const teacherData = item.teachers;
    if (Array.isArray(teacherData) && teacherData.length > 0 && teacherData[0]) {
        if (teacherData[0].id !== undefined && teacherData[0].name !== undefined) {
            finalTeacher = { id: String(teacherData[0].id), name: String(teacherData[0].name) };
        }
    }

    let finalDalDers = undefined;
    const dalDersData = item.dal_ders;
    if (Array.isArray(dalDersData) && dalDersData.length > 0 && dalDersData[0]) {
        const firstDalDers = dalDersData[0];
        if (firstDalDers.id !== undefined && firstDalDers.ders_adi !== undefined && firstDalDers.sinif_seviyesi !== undefined) {
            finalDalDers = {
                id: String(firstDalDers.id),
                dersAdi: String(firstDalDers.ders_adi),
                sinifSeviyesi: Number(firstDalDers.sinif_seviyesi),
                dalId: firstDalDers.dal_id ? String(firstDalDers.dal_id) : undefined
            };
        }
    }

    return {
        id: item.id,
        teacher_id: item.teacher_id,
        dal_ders_id: item.dal_ders_id,
        assignment: item.assignment,
        created_at: item.created_at,
        updated_at: item.updated_at,
        teacher: finalTeacher,
        dal_ders: finalDalDers,
    };
  }) || [];
  
  // Log after mapping
  console.log('[Action] Mapped data:', mappedData);

  // Use a schema that includes the optional dalDers structure if needed for validation
  // For now, let's trust the mapping and cast
  // const parseResult = z.array(TeacherCourseAssignmentSchema).safeParse(mappedData);
  // if (!parseResult.success) { ... }

  return mappedData as TeacherCourseAssignment[]; // Be careful with casting
}

/**
 * Create a new teacher course assignment.
 */
export async function createTeacherAssignment(teacherId: string, dalDersId: string, payload: TeacherCourseAssignmentFormValues): Promise<{ success: boolean; assignment?: TeacherCourseAssignment; error?: string | z.ZodIssue[] }> {
    
    if (!teacherId || !dalDersId) {
      return { success: false, error: 'Öğretmen veya Ders IDsi eksik.' };
    }
    
    const assignmentData = {
        teacher_id: teacherId,
        dal_ders_id: dalDersId,
        assignment: payload.assignment,
    };

    // Log the data just before inserting
    console.log('[Action] Attempting to insert assignmentData:', assignmentData);

    // Remove the redundant Zod validation on the payload object
    /* ... Zod validation comment ... */

    try {
        // Log before the DB call
        console.log('[Action] Calling supabase.insert with:', assignmentData);
        const { data, error } = await supabase
            .from('teacher_course_assignments')
            .insert(assignmentData) 
            .select(`
              id, teacher_id, dal_ders_id, assignment, created_at, updated_at, 
              dal_ders:dal_dersleri ( id, ders_adi, sinif_seviyesi, dal_id ),
              teachers ( id, name )
            `)
            .single();

        // Log the result from Supabase
        console.log('[Action] Supabase insert result:', { data, error });

        if (error || !data) {
            console.error('Error creating teacher assignment:', error?.message);
             if (error?.code === '23505') { // Unique constraint violation
                return { success: false, error: 'Bu öğretmen için bu ders ataması zaten mevcut.' };
            }
            return { success: false, error: error?.message || 'Öğretmen ders ataması oluşturulamadı.' };
        }

        let finalTeacher = undefined;
        const teacherData = data.teachers;
        if (Array.isArray(teacherData) && teacherData.length > 0 && teacherData[0]) {
            if (teacherData[0].id !== undefined && teacherData[0].name !== undefined) {
                finalTeacher = { id: String(teacherData[0].id), name: String(teacherData[0].name) };
            }
        }

        let finalDalDers = undefined;
        const dalDersData = data.dal_ders;
        if (Array.isArray(dalDersData) && dalDersData.length > 0 && dalDersData[0]) {
            const firstDalDers = dalDersData[0];
            if (firstDalDers.id !== undefined && firstDalDers.ders_adi !== undefined && firstDalDers.sinif_seviyesi !== undefined) {
                finalDalDers = {
                    id: String(firstDalDers.id),
                    dersAdi: String(firstDalDers.ders_adi),
                    sinifSeviyesi: Number(firstDalDers.sinif_seviyesi),
                    dalId: firstDalDers.dal_id ? String(firstDalDers.dal_id) : undefined
                };
            }
        }

        const createdAssignment: TeacherCourseAssignment = {
            id: data.id,
            teacher_id: data.teacher_id,
            dal_ders_id: data.dal_ders_id,
            assignment: data.assignment as 'required' | 'excluded',
            created_at: data.created_at,
            updated_at: data.updated_at,
            teacher: finalTeacher,
            dal_ders: finalDalDers,
        };

        return { success: true, assignment: createdAssignment };
    } catch (err) {
        console.error('[Action] createTeacherAssignment caught error:', err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

/**
 * Update an existing teacher course assignment (e.g., change assignment type).
 */
export async function updateTeacherAssignment(assignmentId: string, teacherId: string, payload: TeacherCourseAssignmentFormValues): Promise<{ success: boolean; assignment?: TeacherCourseAssignment; error?: string | z.ZodIssue[] }> {
    
    const parse = TeacherCourseAssignmentFormSchema.safeParse(payload);
    if (!parse.success) {
        return { success: false, error: parse.error.issues };
    }
    
    const updateData = { assignment: payload.assignment };

    try {
        const { data, error } = await supabase
            .from('teacher_course_assignments')
            .update(updateData)
            .eq('id', assignmentId)
            .select(`
              id, teacher_id, dal_ders_id, assignment, created_at, updated_at, 
              dal_ders:dal_dersleri ( id, ders_adi, sinif_seviyesi, dal_id ),
              teachers ( id, name )
            `)
            .single();

        if (error || !data) {
            console.error(`Error updating teacher assignment ${assignmentId}:`, error?.message);
            return { success: false, error: error?.message || 'Öğretmen ders ataması güncellenemedi.' };
        }

        let finalTeacher = undefined;
        const teacherData = data.teachers;
        if (Array.isArray(teacherData) && teacherData.length > 0 && teacherData[0]) {
            if (teacherData[0].id !== undefined && teacherData[0].name !== undefined) {
                finalTeacher = { id: String(teacherData[0].id), name: String(teacherData[0].name) };
            }
        }

        let finalDalDers = undefined;
        const dalDersData = data.dal_ders;
        if (Array.isArray(dalDersData) && dalDersData.length > 0 && dalDersData[0]) {
            const firstDalDers = dalDersData[0];
            if (firstDalDers.id !== undefined && firstDalDers.ders_adi !== undefined && firstDalDers.sinif_seviyesi !== undefined) {
                finalDalDers = {
                    id: String(firstDalDers.id),
                    dersAdi: String(firstDalDers.ders_adi),
                    sinifSeviyesi: Number(firstDalDers.sinif_seviyesi),
                    dalId: firstDalDers.dal_id ? String(firstDalDers.dal_id) : undefined
                };
            }
        }

         const updatedAssignment: TeacherCourseAssignment = {
            id: data.id,
            teacher_id: data.teacher_id,
            dal_ders_id: data.dal_ders_id,
            assignment: data.assignment as 'required' | 'excluded',
            created_at: data.created_at,
            updated_at: data.updated_at,
            teacher: finalTeacher,
            dal_ders: finalDalDers,
        };

        return { success: true, assignment: updatedAssignment };
    } catch (err) {
        console.error('updateTeacherAssignment error:', err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
}

/**
 * Delete a teacher course assignment.
 */
export async function deleteTeacherAssignment(assignmentId: string, teacherId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('teacher_course_assignments')
            .delete()
            .eq('id', assignmentId);

        if (error) {
            console.error(`Error deleting teacher assignment ${assignmentId}:`, error);
             // Handle potential foreign key issues if assignments are referenced elsewhere
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        console.error('deleteTeacherAssignment error:', err);
        return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
} 