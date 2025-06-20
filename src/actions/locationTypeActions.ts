'use server';

import { supabase } from '@/lib/supabase';
import { LocationType, LocationTypeFormValues } from '@/types/locationTypes';

// Fetch all location types
export async function fetchLocationTypes(): Promise<LocationType[]> {
  console.log('[Action] fetchLocationTypes called');
  const { data, error } = await supabase
    .from('location_types')
    .select('*')
    .order('name', { ascending: true });

  console.log('[Action] fetchLocationTypes - Supabase response:', { data, error });

  if (error) {
    console.error('Error fetching location types:', error);
    throw new Error(error.message);
  }
  return data || [];
}

// Create a new location type
export async function createLocationType(payload: LocationTypeFormValues): Promise<LocationType> {
  const { data, error } = await supabase
    .from('location_types')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('Error creating location type:', error);
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error('Could not create location type, no data returned.');
  }
  return data;
}

// Update an existing location type
export async function updateLocationType(id: string, payload: LocationTypeFormValues): Promise<LocationType> {
  const { data, error } = await supabase
    .from('location_types')
    .update({
        ...payload,
        updated_at: new Date().toISOString(), // Update timestamp
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating location type ${id}:`, error);
    throw new Error(error.message);
  }
   if (!data) {
    throw new Error(`Could not update location type ${id}, no data returned.`);
  }
  return data;
}

// Delete a location type
export async function deleteLocationType(id: string): Promise<{ success: boolean; error?: Error }> {
  // Optional: Check if this type is used by any location before deleting
  // const { count, error: checkError } = await supabase
  //  .from('locations') // Assuming your locations table is named 'locations'
  //  .select('id', { count: 'exact' })
  //  .eq('location_type_id', id); // Assuming foreign key is 'location_type_id'
  //
  // if (checkError) {
  //   console.error('Error checking location usage:', checkError);
  //   return { success: false, error: new Error('Lokasyon kullanımı kontrol edilirken hata oluştu.') };
  // }
  //
  // if (count && count > 0) {
  //   return { success: false, error: new Error('Bu tip, mevcut lokasyonlar tarafından kullanıldığı için silinemez.') };
  // }

  const { error } = await supabase
    .from('location_types')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting location type ${id}:`, error);
    return { success: false, error: new Error(error.message) };
  }

  return { success: true };
}

// Functions for dal_ders_location_types join table

/**
 * Fetch associated location_type_ids for a given dal_ders_id.
 */
export async function fetchDalDersLocationTypes(dalDersId: string): Promise<string[]> {
  if (!dalDersId) return [];

  const { data, error } = await supabase
    .from('dal_ders_location_types' as any)
    .select('location_type_id')
    .eq('dal_ders_id', dalDersId);

  if (error) {
    console.error(`Error fetching location types for dal_ders_id ${dalDersId}:`, error.message);
    // Depending on how you want to handle errors, you might throw or return empty
    return [];
  }

  if (!Array.isArray(data)) return [];
  return data.every(item => 'location_type_id' in item)
    ? data.map(item => String(item.location_type_id))
    : [];
}

/**
 * Set associated location_types for a given dal_ders_id.
 * This will overwrite existing associations.
 */
export async function setDalDersLocationTypes(
  dalDersId: string,
  locationTypeIds: string[]
): Promise<{ success: boolean; error?: string }> {
  if (!dalDersId) {
    return { success: false, error: 'Ders ID sağlanmadı.' };
  }

  // Delete existing associations for this dal_ders_id
  const { error: deleteError } = await supabase
    .from('dal_ders_location_types' as any)
    .delete()
    .eq('dal_ders_id', dalDersId);

  if (deleteError) {
    console.error(`Error deleting old location types for dal_ders_id ${dalDersId}:`, deleteError.message);
    return { success: false, error: deleteError.message };
  }

  // If there are new locationTypeIds, insert them
  if (locationTypeIds && locationTypeIds.length > 0) {
    const newLinks = locationTypeIds.map(locationTypeId => ({
      dal_ders_id: dalDersId,
      location_type_id: locationTypeId,
    }));

    const { error: insertError } = await supabase
      .from('dal_ders_location_types' as any)
      .insert(newLinks);

    if (insertError) {
      console.error(`Error inserting new location types for dal_ders_id ${dalDersId}:`, insertError.message);
      return { success: false, error: insertError.message };
    }
  }

  return { success: true };
} 