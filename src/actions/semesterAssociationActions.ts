'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

// Common paths to revalidate
// const PATHS_TO_REVALIDATE = [
//   '/dashboard/semesters',
//   '/dashboard/area-teachers',
//   '/dashboard/classes',
//   '/dashboard/locations'
// ];

/**
 * Associates teachers with a semester
 * Updates the semester_id field for the specified teachers
 */
export async function associateTeachersWithSemester(semesterId: string, teacherIds: string[]) {
  const supabase = await createSupabaseServerClient();
  
  try {
    const { error } = await supabase
      .from('teachers')
      .update({ semester_id: semesterId })
      .in('id', teacherIds);
    
    if (error) {
      console.error('Error associating teachers with semester:', error);
      return { success: false, error: error.message };
    }

    // Revalidate relevant paths
    // PATHS_TO_REVALIDATE.forEach(path => revalidatePath(path));
    
    return { 
      success: true, 
      message: `${teacherIds.length} öğretmen başarıyla "${semesterId}" dönemi ile ilişkilendirildi.` 
    };
  } catch (err) {
    console.error('Unexpected error associating teachers with semester:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu'
    };
  }
}

/**
 * Associates classes with a semester
 * Updates the semester_id field for the specified classes
 */
export async function associateClassesWithSemester(semesterId: string, classIds: string[]) {
  const supabase = await createSupabaseServerClient();
  
  try {
    const { error } = await supabase
      .from('classes')
      .update({ semester_id: semesterId })
      .in('id', classIds);
    
    if (error) {
      console.error('Error associating classes with semester:', error);
      return { success: false, error: error.message };
    }

    // Revalidate relevant paths
    // PATHS_TO_REVALIDATE.forEach(path => revalidatePath(path));
    
    return { 
      success: true, 
      message: `${classIds.length} sınıf başarıyla "${semesterId}" dönemi ile ilişkilendirildi.` 
    };
  } catch (err) {
    console.error('Unexpected error associating classes with semester:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu'
    };
  }
}

/**
 * Associates locations with a semester
 * Updates the semester_id field for the specified locations
 */
export async function associateLocationsWithSemester(semesterId: string, locationIds: string[]) {
  const supabase = await createSupabaseServerClient();
  
  try {
    const { error } = await supabase
      .from('locations')
      .update({ semester_id: semesterId })
      .in('id', locationIds);
    
    if (error) {
      console.error('Error associating locations with semester:', error);
      return { success: false, error: error.message };
    }

    // Revalidate relevant paths
    // PATHS_TO_REVALIDATE.forEach(path => revalidatePath(path));
    
    return { 
      success: true, 
      message: `${locationIds.length} konum başarıyla "${semesterId}" dönemi ile ilişkilendirildi.` 
    };
  } catch (err) {
    console.error('Unexpected error associating locations with semester:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu'
    };
  }
}

/**
 * Fetches entities (teachers, classes, or locations) that are associated with a semester
 */
export async function fetchEntitiesBySemester(entityType: 'teachers' | 'classes' | 'locations', semesterId: string) {
  const supabase = await createSupabaseServerClient();
  
  try {
    const { data, error } = await supabase
      .from(entityType)
      .select('*')
      .eq('semester_id', semesterId);
    
    if (error) {
      console.error(`Error fetching ${entityType} for semester:`, error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (err) {
    console.error(`Unexpected error fetching ${entityType} for semester:`, err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu',
      data: []
    };
  }
} 