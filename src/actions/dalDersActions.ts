'use server';

import { supabase } from '@/lib/supabase';
import { DalDers, DalDersFormSchema, DalDersFormValues, SinifSeviyesi } from '@/types/dalDersleri';
import { z } from 'zod';
import { setDalDersLocationTypes } from '@/actions/locationTypeActions';

/**
 * Fetch all lessons for a specific branch (dal).
 */
export async function fetchDalDersleri(dalId: string): Promise<DalDers[]> {
  if (!dalId) return [];

  const { data, error } = await supabase
    .from('dal_dersleri')
    .select('*')
    .eq('dal_id', dalId)
    // Order by grade level, then lesson name for consistency
    .order('sinif_seviyesi', { ascending: true })
    .order('ders_adi', { ascending: true });

  if (error) {
    console.error(`Error fetching dersler for dal ${dalId}:`, error);
    throw error; 
  }
  
  // Map snake_case to camelCase and ensure type safety
  const mappedData = data?.map(ders => ({
      id: ders.id,
      dalId: ders.dal_id,
      sinifSeviyesi: ders.sinif_seviyesi as SinifSeviyesi, // Cast to specific literal type
      dersAdi: ders.ders_adi,
      haftalikSaat: ders.haftalik_saat,
      requires_multiple_resources: ders.requires_multiple_resources,
      bolunebilir_mi: ders.bolunebilir_mi,
      cizelgeye_dahil_et: ders.cizelgeye_dahil_et,
      createdAt: ders.created_at,
      updatedAt: ders.updated_at,
  })) || [];

  return mappedData as DalDers[];
}

/**
 * Create a new lesson entry for a branch and set its suitable lab types.
 */
export async function createDalDers(
  dalId: string,
  payload: DalDersFormValues,
  suitableLocationTypeIds: string[] = []
): Promise<{ success: boolean; ders?: DalDers; error?: string | z.ZodIssue[]; partialError?: string | undefined }> {
  const parse = DalDersFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.issues };
  }

  const dersData = {
    dal_id: dalId,
    sinif_seviyesi: parse.data.sinifSeviyesi,
    ders_adi: parse.data.dersAdi,
    haftalik_saat: parse.data.haftalikSaat,
    bolunebilir_mi: parse.data.bolunebilir_mi ?? true,
    cizelgeye_dahil_et: parse.data.cizelgeye_dahil_et ?? true,
    requires_multiple_resources: parse.data.requires_multiple_resources ?? false,
  };

  // Log the data being sent to Supabase
  console.log('[createDalDers] Data to insert:', dersData);
  console.log('[createDalDers] requires_multiple_resources value being sent:', dersData.requires_multiple_resources);

  let createdDersRecord: any = null;

  try {
    const { data, error: insertError } = await supabase
      .from('dal_dersleri')
      .insert(dersData)
      .select()
      .single();

    if (insertError || !data) {
      console.error('Error creating dal dersi:', insertError?.message);
      if (insertError?.code === '23505') {
          return { success: false, error: 'Bu sınıfta bu ders zaten mevcut.' };
      }
      return { success: false, error: insertError?.message || 'Ders oluşturulamadı.' };
    }
    createdDersRecord = data;

    const { success: setTypesSuccess, error: setTypesError } = await setDalDersLocationTypes(createdDersRecord.id, suitableLocationTypeIds);

    let partialError: string | undefined = undefined;
    if (!setTypesSuccess) {
        console.warn(`Dal dersi ${createdDersRecord.id} oluşturuldu ancak konum tipleri ayarlanamadı:`, setTypesError);
        partialError = `Ders oluşturuldu ancak konum tipleri ayarlanamadı: ${setTypesError}`; 
    }

    const createdDers: DalDers = { 
        id: createdDersRecord.id,
        dalId: createdDersRecord.dal_id,
        sinifSeviyesi: createdDersRecord.sinif_seviyesi as SinifSeviyesi,
        dersAdi: createdDersRecord.ders_adi,
        haftalikSaat: createdDersRecord.haftalik_saat,
        requires_multiple_resources: createdDersRecord.requires_multiple_resources,
        bolunebilir_mi: createdDersRecord.bolunebilir_mi,
        cizelgeye_dahil_et: createdDersRecord.cizelgeye_dahil_et,
        createdAt: createdDersRecord.created_at,
        updatedAt: createdDersRecord.updated_at,
    };
    
    return { 
      success: true, 
      ders: createdDers, 
      partialError 
    };
  } catch (err) {
    console.error('createDalDers error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Update an existing branch lesson and its suitable lab types.
 */
export async function updateDalDers(
  dersId: string,
  payload: DalDersFormValues,
  suitableLocationTypeIds: string[]
): Promise<{ success: boolean; ders?: DalDers; error?: string | z.ZodIssue[]; partialError?: string | undefined }> {
  const parse = DalDersFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.issues };
  }

  const dersData = {
    sinif_seviyesi: parse.data.sinifSeviyesi,
    ders_adi: parse.data.dersAdi,
    haftalik_saat: parse.data.haftalikSaat,
    bolunebilir_mi: parse.data.bolunebilir_mi ?? true,
    cizelgeye_dahil_et: parse.data.cizelgeye_dahil_et ?? true,
    requires_multiple_resources: parse.data.requires_multiple_resources ?? false,
  };
  
  // Log the data being sent to Supabase
  console.log(`[updateDalDers] Data to update for dersId ${dersId}:`, dersData);
  console.log('[updateDalDers] requires_multiple_resources value being sent:', dersData.requires_multiple_resources);

  let updatedDersRecord: any = null;

  try {
    const { data: existingData, error: fetchError } = await supabase
      .from('dal_dersleri')
      .select('dal_id')
      .eq('id', dersId)
      .single();

    if (fetchError || !existingData) {
       console.warn('Error fetching dal_id for revalidation:', fetchError?.message);
    }

    const { data, error: updateError } = await supabase
      .from('dal_dersleri')
      .update(dersData)
      .eq('id', dersId)
      .select()
      .single();

    if (updateError || !data) {
      console.error('Error updating dal dersi:', updateError?.message);
      if (updateError?.code === '23505') {
          return { success: false, error: 'Bu sınıfta bu ders zaten mevcut.' };
      }
      return { success: false, error: updateError?.message || 'Ders güncellenemedi.' };
    }
    updatedDersRecord = data;

    const { success: setTypesSuccess, error: setTypesError } = await setDalDersLocationTypes(updatedDersRecord.id, suitableLocationTypeIds);
    
    let partialError: string | undefined = undefined;
    if (!setTypesSuccess) {
        console.warn(`Dal dersi ${updatedDersRecord.id} güncellendi ancak konum tipleri ayarlanamadı:`, setTypesError);
        partialError = `Ders güncellendi ancak konum tipleri ayarlanamadı: ${setTypesError}`; 
    }

    const updatedDers: DalDers = { 
        id: updatedDersRecord.id,
        dalId: updatedDersRecord.dal_id,
        sinifSeviyesi: updatedDersRecord.sinif_seviyesi as SinifSeviyesi,
        dersAdi: updatedDersRecord.ders_adi,
        haftalikSaat: updatedDersRecord.haftalik_saat,
        requires_multiple_resources: updatedDersRecord.requires_multiple_resources,
        bolunebilir_mi: (updatedDersRecord.bolunebilir_mi as boolean) ?? true,
        cizelgeye_dahil_et: updatedDersRecord.cizelgeye_dahil_et,
        createdAt: updatedDersRecord.created_at,
        updatedAt: updatedDersRecord.updated_at,
    };

    return { success: true, ders: updatedDers, partialError };
  } catch (err) {
    console.error('updateDalDers error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Delete a branch lesson by ID.
 */
export async function deleteDalDers(dersId: string): Promise<{ success: boolean; error?: string }> {
   try {
     const { error: fetchError } = await supabase
      .from('dal_dersleri')
      .select('dal_id')
      .eq('id', dersId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
       console.warn('Error fetching dal_id for revalidation before delete:', fetchError?.message);
    }

    const { error } = await supabase
      .from('dal_dersleri')
      .delete()
      .eq('id', dersId);

    if (error) {
      console.error('Error deleting dal dersi:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err) {
    console.error('deleteDalDers error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fetch all distinct lesson names from dal_dersleri.
 */
export async function fetchDistinctDersAdlari(): Promise<string[]> {
  const { data, error } = await supabase
    .from('dal_dersleri')
    .select('ders_adi'); // Select only the lesson name column

  if (error) {
    console.error('Error fetching distinct ders adlari:', error);
    return []; // Return empty array on error
  }

  // Get unique, non-null/empty names
  const distinctNames = [
    ...new Set(
      data
        ?.map(item => item.ders_adi)
        .filter((name): name is string => !!name) // Filter out null/undefined and type guard
    )
  ];

  return distinctNames.sort(); // Sort alphabetically
}

/**
 * Fetches distinct lessons suitable for select options.
 * Returns an array of { id, dersAdi, sinifSeviyesi, dalAdi } objects.
 * Uses the ID and details of the first occurrence found for each distinct name.
 */
export async function fetchAllDersOptions(): Promise<{ id: string; dersAdi: string; sinifSeviyesi: number; dalAdi: string }[]> {
  const { data, error } = await supabase
    .from('dal_dersleri')
    // Select related dal name as well
    .select(`
      id,
      ders_adi,
      sinif_seviyesi,
      dal:dallar(name)
    `)
    .order('dal(name)') // Order by branch name first
    .order('ders_adi'); // Then by lesson name

  if (error) {
    console.error('Error fetching all ders options with dal:', error);
    return [];
  }

  if (!data) {
    return [];
  }

  // Map to the desired structure, including dalAdi
  const options = data.map(ders => {
    // Cast related dal object to any to bypass strict type checking for name access
    const relatedDal: any = ders.dal;
    const dalName = Array.isArray(relatedDal) ? relatedDal[0]?.name : relatedDal?.name;
    
    return {
      id: ders.id,
      dersAdi: ders.ders_adi,
      sinifSeviyesi: Number(ders.sinif_seviyesi),
      dalAdi: dalName || 'Bilinmeyen Dal',
    };
  }).filter(ders => !isNaN(ders.sinifSeviyesi));
  
  // Note: This fetches all lessons, not distinct by name anymore, which might be intended for this dropdown.
  // If distinct by name IS required, the Map logic needs to be re-introduced and adapted.

  return options;
} 