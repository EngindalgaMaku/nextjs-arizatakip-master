'use server';

import { supabase } from '@/lib/supabase';
import { Dal, DalFormSchema, DalFormValues } from '@/types/dallar';

/**
 * Fetch all branches.
 */
export async function fetchDallar(): Promise<Dal[]> {
  const { data, error } = await supabase
    .from('dallar')
    .select('*')
    // Sort by creation date, oldest first
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching dallar:', error);
    throw error; 
  }
  // No mapping needed if schema matches DB columns
  return data as Dal[] || [];
}

/**
 * Create a new branch.
 */
export async function createDal(payload: DalFormValues): Promise<{ success: boolean; dal?: Dal; error?: string }> {
  const parse = DalFormSchema.safeParse(payload);
  if (!parse.success) {
    // Aggregate multiple error messages if necessary
    const errorMessages = parse.error.errors.map(e => `(${e.path.join('.') || 'field'}): ${e.message}`).join(', ');
    console.error('[createDal] Validation failed:', errorMessages, 'Payload:', payload); // Log validation errors
    return { success: false, error: errorMessages };
  }

  const dalData = {
    name: parse.data.name,
    description: parse.data.description || null,
    branch_id: parse.data.branch_id // <<< Added branch_id
  };

  console.log('[createDal] Inserting data:', dalData); // Log data before insert

  try {
    const { data, error } = await supabase
      .from('dallar')
      .insert(dalData)
      .select()
      .single();

    if (error || !data) {
      console.error('[createDal] Error creating dal:', error?.message, 'Details:', error); // Log full error
      if (error?.code === '23505') { // Handle unique constraint violation for name
          return { success: false, error: 'Bu dal adı zaten mevcut.' };
      }
      // Handle foreign key violation for branch_id if needed (though validation should catch invalid UUIDs)
      if (error?.code === '23503') { 
          console.error('[createDal] Foreign key violation likely on branch_id:', error.message);
          return { success: false, error: 'Seçilen ana dal geçerli değil veya bulunamadı.' };
      }
      return { success: false, error: error?.message || 'Dal oluşturulamadı.' };
    }
    console.log('[createDal] Dal created successfully:', data.id); // Log success
    return { success: true, dal: data as Dal };
  } catch (err: any) { // Catch any error
    console.error('[createDal] Uncaught error:', err); // Log uncaught errors
    return { success: false, error: err?.message || 'Bilinmeyen bir hata oluştu.' };
  }
}

/**
 * Update an existing branch.
 */
export async function updateDal(id: string, payload: DalFormValues): Promise<{ success: boolean; dal?: Dal; error?: string }> {
  const parse = DalFormSchema.safeParse(payload);
  if (!parse.success) {
    return { success: false, error: parse.error.errors.map(e => e.message).join(', ') };
  }

  const dalData = {
    name: parse.data.name,
    description: parse.data.description || null,
  };

  try {
    const { data, error } = await supabase
      .from('dallar')
      .update(dalData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating dal:', error?.message);
       if (error?.code === '23505') { // Handle unique constraint violation for name
          return { success: false, error: 'Bu dal adı zaten mevcut.' };
      }
      return { success: false, error: error?.message || 'Dal güncellenemedi.' };
    }
    return { success: true, dal: data as Dal };
  } catch (err) {
    console.error('updateDal error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Delete a branch by ID.
 */
export async function deleteDal(id: string): Promise<{ success: boolean; error?: string }> {
   try {
    const { error } = await supabase
      .from('dallar')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting dal:', error);
      // TODO: Check for foreign key constraint violation if dal is linked elsewhere
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error('deleteDal error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Fetch a single branch by ID.
 */
export async function fetchDalById(id: string): Promise<Dal | null> {
   if (!id) return null;
   const { data, error } = await supabase
    .from('dallar')
    .select('*')
    .eq('id', id)
    .single();

    if (error) {
      console.error(`Error fetching dal ${id}:`, error);
      if (error.code === 'PGRST116') return null; // Not found is not an error here
      throw error;
    }
    return data as Dal | null;
}

// --- NEW ACTION --- 
interface BranchSelectItem {
  id: string;
  name: string;
}

/**
 * Fetch branches for use in a select dropdown.
 */
export async function fetchBranchesForSelect(): Promise<BranchSelectItem[]> {
  const { data, error } = await supabase
    .from('branches') // <<< Use 'branches' table
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching branches for select:', error);
    // Depending on requirements, you might throw or return empty array
    // throw error;
    return [];
  }
  return data || [];
}
// --- END NEW ACTION --- 

/**
 * Fetch all dallar for a specific branch by its ID.
 */
export async function fetchDallarByBranch(branchId: string): Promise<Dal[]> {
  if (!branchId) return [];
  const { data, error } = await supabase
    .from('dallar')
    .select('*')
    .eq('branch_id', branchId)
    .order('name', { ascending: true });
  if (error) {
    console.error(`Error fetching dallar for branch ${branchId}:`, error);
    throw new Error('Dallar getirilirken bir hata oluştu.');
  }
  return data as Dal[];
} 