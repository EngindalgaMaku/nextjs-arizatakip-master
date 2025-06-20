'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
    Business,
    BusinessFormSchema,
    BusinessFormValues,
    BusinessSchema
} from '@/types/businesses';
import { z } from 'zod';

/**
 * Fetch all businesses, optionally filtered by semester.
 */
export async function fetchBusinesses(semesterId?: string): Promise<Business[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('businesses')
    .select('id, name, contact_person, contact_phone, address, industry, business_type, notes, semester_id, created_at, updated_at');

  if (semesterId) {
    query = query.eq('semester_id', semesterId);
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) {
    console.error('Error fetching businesses:', error);
    throw error;
  }

  const mappedData = (data || []).map(item => ({
    id: item.id,
    name: item.name,
    contactPerson: item.contact_person,
    contactPhone: item.contact_phone,
    address: item.address,
    industry: item.industry,
    businessType: item.business_type,
    notes: item.notes,
    semesterId: item.semester_id,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));

  const validatedData = z.array(BusinessSchema).safeParse(mappedData);
  if (!validatedData.success) {
    console.warn('Fetched businesses data validation failed:', validatedData.error.flatten());
    // Filter out invalid records or handle as needed
    return mappedData.filter(item => BusinessSchema.safeParse(item).success);
  }
  return validatedData.data;
}

/**
 * Fetch a single business by ID.
 */
export async function fetchBusinessById(id: string): Promise<Business | null> {
  if (!id || !z.string().uuid().safeParse(id).success) {
    console.error('[fetchBusinessById] Invalid or missing ID provided.');
    return null;
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, contact_person, contact_phone, address, industry, business_type, notes, semester_id, created_at, updated_at')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // "PGRST116" is the code for "Not Found"
      console.log(`[fetchBusinessById] Business with ID ${id} not found.`);
      return null;
    }
    console.error(`[fetchBusinessById] Error fetching business ${id}:`, error);
    throw error;
  }

  if (!data) return null;

  const mappedData = {
    id: data.id,
    name: data.name,
    contactPerson: data.contact_person,
    contactPhone: data.contact_phone,
    address: data.address,
    industry: data.industry,
    businessType: data.business_type,
    notes: data.notes,
    semesterId: data.semester_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  const parseResult = BusinessSchema.safeParse(mappedData);
  if (!parseResult.success) {
    console.error(`[fetchBusinessById] Validation failed for business ${id}:`, parseResult.error.flatten());
    return null;
  }
  return parseResult.data;
}

/**
 * Create a new business.
 */
export async function createBusiness(
  payload: BusinessFormValues
): Promise<{ success: boolean; business?: Business; error?: string | z.ZodIssue[] }> {
  const parse = BusinessFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.issues };
  }

  const supabase = await createSupabaseServerClient();
  const businessDataToInsert = {
    name: parse.data.name,
    contact_person: parse.data.contactPerson,
    contact_phone: parse.data.contactPhone,
    address: parse.data.address,
    industry: parse.data.industry,
    business_type: parse.data.businessType,
    notes: parse.data.notes,
    semester_id: parse.data.semesterId,
  };

  try {
    const { data: newBusinessData, error } = await supabase
      .from('businesses')
      .insert(businessDataToInsert)
      .select('id, name, contact_person, contact_phone, address, industry, business_type, notes, semester_id, created_at, updated_at')
      .single();

    if (error || !newBusinessData) {
      console.error('Error creating business:', error?.message);
      if (error?.code === '23503') { // Foreign key violation (e.g., semester_id doesn't exist)
        return { success: false, error: 'Belirtilen sömestr IDsi geçerli değil veya ilgili kayıt bulunamadı.' };
      }
      if (error?.code === '23505') { // Unique constraint violation
         return { success: false, error: 'Bu isimde bir işletme zaten mevcut olabilir.' };
      }
      return { success: false, error: error?.message || 'İşletme oluşturulamadı.' };
    }
    
    const mappedResult = {
      id: newBusinessData.id,
      name: newBusinessData.name,
      contactPerson: newBusinessData.contact_person,
      contactPhone: newBusinessData.contact_phone,
      address: newBusinessData.address,
      industry: newBusinessData.industry,
      businessType: newBusinessData.business_type,
      notes: newBusinessData.notes,
      semesterId: newBusinessData.semester_id,
      createdAt: newBusinessData.created_at,
      updatedAt: newBusinessData.updated_at,
    };

    const finalParse = BusinessSchema.safeParse(mappedResult);
    if (!finalParse.success) {
      console.error('Created business data validation failed:', finalParse.error.flatten());
      // Potentially delete the created record if validation fails catastrophically
      return { success: false, error: 'İşletme oluşturuldu ancak veri doğrulanamadı.' };
    }

    return { success: true, business: finalParse.data };

  } catch (err) {
    console.error('Create business uncaught error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

/**
 * Update an existing business.
 */
export async function updateBusiness(
  id: string,
  payload: BusinessFormValues
): Promise<{ success: boolean; business?: Business; error?: string | z.ZodIssue[] }> {
  if (!id || !z.string().uuid().safeParse(id).success) {
    return { success: false, error: 'Geçersiz işletme IDsi.' };
  }
  
  const parse = BusinessFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.issues };
  }

  const supabase = await createSupabaseServerClient();
  const businessDataToUpdate = {
    name: parse.data.name,
    contact_person: parse.data.contactPerson,
    contact_phone: parse.data.contactPhone,
    address: parse.data.address,
    industry: parse.data.industry,
    business_type: parse.data.businessType,
    notes: parse.data.notes,
    semester_id: parse.data.semesterId,
    updated_at: new Date().toISOString(), // Manually set updated_at
  };

  try {
    const { data: updatedBusinessData, error } = await supabase
      .from('businesses')
      .update(businessDataToUpdate)
      .eq('id', id)
      .select('id, name, contact_person, contact_phone, address, industry, business_type, notes, semester_id, created_at, updated_at')
      .single();

    if (error || !updatedBusinessData) {
      console.error(`Error updating business ${id}:`, error?.message);
       if (error?.code === 'PGRST116') {
        return { success: false, error: 'Güncellenecek işletme bulunamadı.' };
      }
      if (error?.code === '23503') {
        return { success: false, error: 'Belirtilen sömestr IDsi geçerli değil veya ilgili kayıt bulunamadı.' };
      }
      return { success: false, error: error?.message || 'İşletme güncellenemedi.' };
    }

    const mappedResult = {
      id: updatedBusinessData.id,
      name: updatedBusinessData.name,
      contactPerson: updatedBusinessData.contact_person,
      contactPhone: updatedBusinessData.contact_phone,
      address: updatedBusinessData.address,
      industry: updatedBusinessData.industry,
      businessType: updatedBusinessData.business_type,
      notes: updatedBusinessData.notes,
      semesterId: updatedBusinessData.semester_id,
      createdAt: updatedBusinessData.created_at,
      updatedAt: updatedBusinessData.updated_at,
    };

    const finalParse = BusinessSchema.safeParse(mappedResult);
    if (!finalParse.success) {
      console.error('Updated business data validation failed:', finalParse.error.flatten());
      return { success: false, error: 'İşletme güncellendi ancak veri doğrulanamadı.' };
    }
    
    return { success: true, business: finalParse.data };

  } catch (err) {
    console.error(`Update business ${id} uncaught error:`, err);
    return { success: false, error: err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.' };
  }
}

/**
 * Delete a business by ID.
 */
export async function deleteBusiness(id: string): Promise<{ success: boolean; error?: string }> {
  console.log('[deleteBusiness] Action called with ID:', id);

  if (!id || !z.string().uuid().safeParse(id).success) {
    console.error('[deleteBusiness] Invalid or missing ID provided:', id);
    return { success: false, error: 'Geçersiz işletme IDsi.' };
  }

  const supabase = await createSupabaseServerClient();
  try {
    console.log(`[deleteBusiness] Attempting to delete business with ID: ${id} from Supabase.`);
    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`[deleteBusiness] Supabase error while deleting ID ${id}:`, JSON.stringify(error, null, 2));
      if (error.code === 'PGRST116') { // Row not found - bu durum aslında bir hata değil, silinecek bir şey yok.
         console.warn(`[deleteBusiness] Business with ID ${id} not found for deletion (PGRST116).`);
         // Başarılı gibi dönebiliriz ya da özel bir mesajla.
         // Şimdilik hata olarak işaretleyelim ki fark edilsin.
         return { success: false, error: 'Silinecek işletme bulunamadı (PGRST116).' };
      }
      // Foreign key constraint (23503)
      if (error.code === '23503') {
        console.error(`[deleteBusiness] Foreign key violation for ID ${id}:`, error.message);
        return { success: false, error: 'Bu işletme başka kayıtlarla ilişkili olduğu için silinemez (örn: atanmış öğrenciler).' };
      }
      return { success: false, error: `Supabase Hatası: ${error.message} (Kod: ${error.code})` };
    }
    
    console.log(`[deleteBusiness] Successfully deleted business with ID: ${id} from Supabase (or it didn't exist).`);
    return { success: true };

  } catch (err: any) {
    console.error(`[deleteBusiness] Uncaught error during deletion of ID ${id}:`, err);
    return { success: false, error: err.message || 'Silme işlemi sırasında bilinmeyen bir sunucu hatası oluştu.' };
  }
} 