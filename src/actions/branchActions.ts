'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Branch, BranchFormData, BranchFormSchema, BranchSchema } from '@/types/branches';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const BRANCHES_TABLE = 'branches';

// Fetch all branches
export async function fetchBranches(): Promise<Branch[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from(BRANCHES_TABLE).select('*').order('name', { ascending: true });
  if (error) {
    console.error('Error fetching branches:', error);
    throw new Error('Branşlar getirilirken bir hata oluştu.');
  }
  // Zod ile veri doğrulama (her bir obje için)
  return z.array(BranchSchema).parse(data);
}

// Fetch a single branch by ID
export async function fetchBranchById(id: string): Promise<Branch | null> {
  if (!id) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from(BRANCHES_TABLE).select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') { // Not found
      return null;
    }
    console.error(`Error fetching branch with id ${id}:`, error);
    throw new Error('Branş getirilirken bir hata oluştu.');
  }
  return data ? BranchSchema.parse(data) : null;
}

// Create a new branch
export async function createBranch(formData: BranchFormData): Promise<Branch> {
  const supabase = await createSupabaseServerClient();
  const validatedData = BranchFormSchema.parse(formData);
  const { data, error } = await supabase.from(BRANCHES_TABLE).insert(validatedData).select().single();

  if (error) {
    console.error('Error creating branch:', error);
    // TODO: Daha spesifik hata mesajları (örn: unique constraint)
    throw new Error('Branş oluşturulurken bir hata oluştu.');
  }
  revalidatePath('/dashboard/branches'); // Cache'i temizle ve sayfayı yeniden doğrula
  return BranchSchema.parse(data);
}

// Update an existing branch
export async function updateBranch(id: string, formData: BranchFormData): Promise<Branch> {
  if (!id) throw new Error('Güncelleme için Branş ID\'si gereklidir.');
  const supabase = await createSupabaseServerClient();
  const validatedData = BranchFormSchema.parse(formData);
  const { data, error } = await supabase.from(BRANCHES_TABLE).update(validatedData).eq('id', id).select().single();

  if (error) {
    console.error(`Error updating branch with id ${id}:`, error);
    throw new Error('Branş güncellenirken bir hata oluştu.');
  }
  revalidatePath('/dashboard/branches');
  revalidatePath(`/dashboard/branches/edit/${id}`); 
  return BranchSchema.parse(data);
}

// Delete a branch
export async function deleteBranch(id: string): Promise<void> {
  if (!id) throw new Error('Silme için Branş ID\'si gereklidir.');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from(BRANCHES_TABLE).delete().eq('id', id);

  if (error) {
    console.error(`Error deleting branch with id ${id}:`, error);
    throw new Error('Branş silinirken bir hata oluştu.');
  }
  revalidatePath('/dashboard/branches');
} 