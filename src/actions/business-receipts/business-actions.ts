'use server';

import { z } from 'zod';
// import { createServerActionClient } from '@supabase/auth-helpers-nextjs'; // Old
import { createSupabaseServerClient } from '@/lib/supabase/server'; // New
// import { cookies } from 'next/headers'; // No longer needed here
// Updated import paths and names for StajIsletmesi schemas
import { UpsertStajIsletmesiPayload } from '@/types/schemas/business-schema';

// const getSupabaseClient = () => createServerActionClient<Database>({ cookies }); // Old
const getSupabaseClient = () => createSupabaseServerClient(); // New

/**
 * Verilen isme sahip bir staj işletmesini bulur veya yoksa oluşturur.
 * @param name Staj İşletmesi adı
 * @returns Staj İşletmesi ID'si
 */
export async function getOrCreateStajIsletmesiByName(name: string): Promise<{ data: { id: string } | null; error: string | null; }> {
  const supabase = await getSupabaseClient();
  const validatedName = z.string().min(2).safeParse(name);

  if (!validatedName.success) {
    return { data: null, error: 'Geçersiz işletme adı.' };
  }

  try {
    // Önce staj işletmesini adıyla ara
    const { data: existingStajIsletmesi, error: fetchError } = await supabase
      .from('staj_isletmeleri') // Updated table name
      .select('id')
      .eq('name', validatedName.data)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: No rows found
      console.error('Error fetching staj işletmesi:', fetchError);
      return { data: null, error: 'Staj işletmesi aranırken bir hata oluştu.' };
    }

    if (existingStajIsletmesi) {
      return { data: { id: existingStajIsletmesi.id }, error: null };
    }

    // Staj işletmesi bulunamazsa yeni bir tane oluştur
    const newIsletmeData: UpsertStajIsletmesiPayload = {
      name: validatedName.data,
      isletme_tipi: 'Belirtilmemiş' // Default value for the required field
    };

    const { data: newStajIsletmesi, error: createError } = await supabase
      .from('staj_isletmeleri') // Updated table name
      .insert(newIsletmeData)
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating staj işletmesi:', createError);
      // Provide more specific error if possible from createError
      const specificError = createError.message.includes('isletme_tipi') ? 'İşletme tipi sağlanamadı.' : 'Staj işletmesi oluşturulurken bir hata oluştu.';
      return { data: null, error: specificError + ` (DB: ${createError.message})` };
    }

    if (!newStajIsletmesi) {
        return { data: null, error: 'Yeni staj işletmesi oluşturuldu ancak ID alınamadı.' };
    }

    return { data: { id: newStajIsletmesi.id }, error: null };

  } catch (error) {
    console.error('Unexpected error in getOrCreateStajIsletmesiByName:', error);
    return { data: null, error: 'Beklenmedik bir hata oluştu.' };
  }
} 