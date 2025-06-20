'use server';

import { supabase } from '@/lib/supabase';
import { Location, LocationFormValues, LocationFormSchema, LocationWithDetails, LocationSchema } from '@/types/locations';
// LabType'ı doğrudan kullanmıyoruz ama ilişki için önemli
// import { LabType } from '@/types/labTypes';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**
 * Fetch all locations with their associated location type information.
 */
export async function fetchLocations(semesterId?: string): Promise<LocationWithDetails[]> {
  let query = supabase
    .from('locations')
    .select(`
      *,
      branch:branches ( id, name ),
      locationType:location_types ( id, name )
    `);

  if (semesterId) {
    query = query.eq('semester_id', semesterId);
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) {
    console.error('Error fetching locations:', error);
    throw error;
  }

  const locations = (data || []).map(loc => ({
    ...loc,
    branch: loc.branch ? { id: (loc.branch as any).id, name: (loc.branch as any).name } : null,
    locationType: loc.locationType ? { id: (loc.locationType as any).id, name: (loc.locationType as any).name } : null,
  })) as LocationWithDetails[];

  return locations;
}

/**
 * Fetch a single location by its ID.
 * Used for populating the edit form. Returns only Location data, not LabType.
 */
export async function fetchLocationById(id: string): Promise<Location | null> {
  if (!id) return null;

  const { data, error } = await supabase
    .from('locations')
    .select('*') // Select only columns from locations table
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching location ${id}:`, error);
    if (error.code === 'PGRST116') { // Not Found
      return null;
    }
    throw error;
  }

  // Validate data against the base LocationSchema
  const parseResult = LocationSchema.safeParse(data);
  if (!parseResult.success) {
      console.error('Fetched location data validation failed:', parseResult.error);
      return null;
  }

  return parseResult.data;
}

/**
 * Create a new location.
 */
export async function createLocation(payload: LocationFormValues): Promise<{ success: boolean; location?: Location; error?: string | z.ZodIssue[] }> {
  // Use LocationFormSchema for validation
  const parse = LocationFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.issues };
  }

  try {
    const { data, error } = await supabase
      .from('locations')
      .insert(parse.data) // Insert validated form data
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating location:', error?.message);
      if (error?.code === '23505') { // Unique constraint violation
        return { success: false, error: 'Bu kod veya isim ile başka bir konum zaten mevcut olabilir.' };
      }
       if (error?.code === '23503') { // Foreign key violation
            return { success: false, error: 'Seçilen Branş veya Lokasyon Tipi geçersiz/bulunamadı.' };
       }
      return { success: false, error: error?.message || 'Konum oluşturulamadı.' };
    }

    revalidatePath('/dashboard/locations');

    // Validate the final result against the full LocationSchema
    const finalParse = LocationSchema.safeParse(data);
     if (!finalParse.success) {
        console.error('Created location data validation failed:', finalParse.error);
        // Return success=true but maybe indicate a data issue? Or handle differently.
        return { success: true, location: undefined, error: 'Konum oluşturuldu ancak veri doğrulanamadı.' };
    }

    return { success: true, location: finalParse.data };
  } catch (err) {
    console.error('createLocation error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Update an existing location.
 */
export async function updateLocation(id: string, payload: LocationFormValues): Promise<{ success: boolean; location?: Location; error?: string | z.ZodIssue[] }> {
  // Use LocationFormSchema for validation
  const parse = LocationFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.issues };
  }

  try {
    const { data, error } = await supabase
      .from('locations')
      .update(parse.data) // Update with validated form data
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error(`Error updating location ${id}:`, error?.message);
      if (error?.code === '23505') { // Unique constraint violation
        return { success: false, error: 'Bu kod veya isim ile başka bir konum zaten mevcut olabilir.' };
      }
      if (error?.code === '23503') { // Foreign key violation
            return { success: false, error: 'Seçilen Branş veya Lokasyon Tipi geçersiz/bulunamadı.' };
      }
      return { success: false, error: error?.message || 'Konum güncellenemedi.' };
    }

    revalidatePath('/dashboard/locations');

     // Validate the final result against the full LocationSchema
    const finalParse = LocationSchema.safeParse(data);
     if (!finalParse.success) {
        console.error('Updated location data validation failed:', finalParse.error);
        return { success: true, location: undefined, error: 'Konum güncellendi ancak veri doğrulanamadı.' };
    }

    return { success: true, location: finalParse.data };
  } catch (err) {
    console.error('updateLocation error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Delete a location by ID.
 */
export async function deleteLocation(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting location ${id}:`, error);
       if (error.code === '23503') { // Foreign key constraint violation
            return { success: false, error: 'Bu konum başka kayıtlarda (çizelgeler vb.) kullanıldığı için silinemez.' };
       }
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/locations');

    return { success: true };
  } catch (err) {
    console.error('deleteLocation error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fetch all locations for a specific branch by its ID, including location type info.
 */
export async function fetchLocationsByBranch(branchId: string, semesterId?: string): Promise<LocationWithDetails[]> {
  if (!branchId) return [];
  let query = supabase
    .from('locations')
    .select(
      `*,
      branch:branches ( id, name ),
      locationType:location_types ( id, name )
    `)
    .eq('branch_id', branchId);

  if (semesterId) {
    query = query.eq('semester_id', semesterId);
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) {
    console.error(`Error fetching locations for branch ${branchId}:`, error);
    throw error;
  }

  const locations = (data || []).map(loc => ({
    ...loc,
    branch: loc.branch ? { id: (loc.branch as any).id, name: (loc.branch as any).name } : null,
    locationType: loc.locationType ? { id: (loc.locationType as any).id, name: (loc.locationType as any).name } : null,
  })) as LocationWithDetails[];

  return locations;
}