'use server';

// import { createServerActionClient } from '@supabase/auth-helpers-nextjs'; // Old
import { createSupabaseServerClient } from '@/lib/supabase/server'; // New
// import { cookies } from 'next/headers'; // No longer needed here
import {
  UpdateReceiptFormPayload,
  UpdateReceiptFormSchema, // New schema for metadata
  UploadReceiptFormPayload, // Keep this for reference to file validation constants if needed, or define them locally
  UploadReceiptMetadataSchema
} from '@/types/schemas/receipt-schema';
import { z } from 'zod';
import { getOrCreateStajIsletmesiByName } from './business-actions';

// const getSupabaseClient = () => createServerActionClient<Database>({ cookies }); // Old

interface ReceiptData {
  student_id: string;
  staj_isletmesi_id: string;
  month: number;
  year: number;
  file_path: string;
  file_name_original: string | null;
  notes: string | null;
}

/**
 * Yeni bir dekont yükler.
 * Öğrenci ID'si ve form verilerini alır.
 */
export async function uploadReceipt(
  studentId: string,
  payload: UploadReceiptFormPayload,
  file: File
): Promise<{ data: { id: string } | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  // Validate metadata payload
  const validatedForm = UploadReceiptMetadataSchema.safeParse(payload);
  if (!validatedForm.success) {
    return { data: null, error: validatedForm.error.errors.map(e => e.message).join(', ') };
  }

  // Validate file separately
  if (!file) {
    return { data: null, error: 'Dosya yüklemek zorunludur.' };
  }
  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { data: null, error: `Maksimum dosya boyutu ${MAX_FILE_SIZE_MB}MB olabilir.` };
  }
  const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'application/pdf'];
  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    return { data: null, error: 'Sadece .jpg, .jpeg ve .pdf uzantılı dosyalar kabul edilir.' };
  }

  const validatedStudentId = z.string().uuid().safeParse(studentId);
  if (!validatedStudentId.success) {
    return { data: null, error: 'Geçersiz öğrenci ID.' };
  }

  const { businessName, month, year, notes } = validatedForm.data;

  try {
    // 1. İşletmeyi al veya oluştur
    const stajIsletmesiResult = await getOrCreateStajIsletmesiByName(businessName);
    if (stajIsletmesiResult.error || !stajIsletmesiResult.data) {
      return { data: null, error: stajIsletmesiResult.error || 'Staj işletmesi işlenemedi.' };
    }
    const stajIsletmesiId = stajIsletmesiResult.data.id;

    // 2. Dosyayı Supabase Storage'a yükle
    const fileExt = file.name.split('.').pop();
    const fileName = `${studentId}_${year}_${month}_${Date.now()}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('student-receipts') // Bucket adınız bu olmayabilir, kendi bucket adınızı kullanın
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file to Storage:', uploadError);
      return { data: null, error: 'Dosya yüklenirken bir hata oluştu: ' + uploadError.message };
    }

    // 3. Dekont bilgisini veritabanına kaydet
    const receiptData: ReceiptData = {
      student_id: validatedStudentId.data,
      staj_isletmesi_id: stajIsletmesiId,
      month,
      year,
      file_path: filePath,
      file_name_original: file.name,
      notes: notes || null,
    };

    const { data: newReceipt, error: dbError } = await supabase
      .from('receipts')
      .insert(receiptData)
      .select('id')
      .single();

    if (dbError) {
      console.error('Error inserting receipt to DB:', dbError);
      // Eğer dosya yüklendi ama DB kaydı başarısız olduysa, yüklenen dosyayı silmeyi düşünebilirsiniz.
      // await supabase.storage.from('student-receipts').remove([filePath]);
      return { data: null, error: 'Dekont bilgileri kaydedilirken bir hata oluştu: ' + dbError.message };
    }
    
    if (!newReceipt) {
      return { data: null, error: 'Dekont oluşturuldu ancak ID alınamadı.' };
    }

    return { data: { id: newReceipt.id }, error: null };

  } catch (error) {
    console.error('Unexpected error in uploadReceipt:', error);
    return { data: null, error: 'Dekont yüklenirken beklenmedik bir hata oluştu.' };
  }
}


/**
 * Mevcut bir dekontu günceller.
 */
export async function updateReceipt(
  studentId: string, // Güvenlik için öğrenci ID'si ile kontrol
  payload: UpdateReceiptFormPayload,
  file?: File // Dosya opsiyonel, sadece diğer bilgiler güncellenebilir
): Promise<{ data: { id: string } | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  const validatedForm = UpdateReceiptFormSchema.safeParse(payload);
  if (!validatedForm.success) {
    return { data: null, error: validatedForm.error.errors.map(e => e.message).join(', ') };
  }
  
  const validatedStudentId = z.string().uuid().safeParse(studentId);
  if (!validatedStudentId.success) {
    return { data: null, error: 'Geçersiz öğrenci ID.' };
  }

  const { receiptId, businessName, month, year, notes } = validatedForm.data;

  try {
    // 1. Güncellenecek dekontu ve sahibini kontrol et
    const { data: existingReceipt, error: fetchExistingError } = await supabase
      .from('receipts')
      .select('id, student_id, file_path, staj_isletmesi_id')
      .eq('id', receiptId)
      .eq('student_id', validatedStudentId.data)
      .single();

    if (fetchExistingError || !existingReceipt) {
      console.error('Error fetching existing receipt or not found:', fetchExistingError);
      return { data: null, error: 'Güncellenecek dekont bulunamadı veya erişim yetkiniz yok.' };
    }

    // 2. İşletmeyi al veya oluştur
    const stajIsletmesiResult = await getOrCreateStajIsletmesiByName(businessName);
    if (stajIsletmesiResult.error || !stajIsletmesiResult.data) {
      return { data: null, error: stajIsletmesiResult.error || 'Staj işletmesi işlenemedi.' };
    }
    const stajIsletmesiId = stajIsletmesiResult.data.id;

    const updateData: Partial<ReceiptData> = {
      staj_isletmesi_id: stajIsletmesiId,
      month,
      year,
      notes: notes || null,
      file_name_original: file ? file.name : null,
    };

    // 3. Eğer yeni bir dosya yüklendiyse, eskisini sil ve yenisini yükle
    if (file) {
      // Add file type validation for update as well
      const UPD_ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'application/pdf']; 
      if (!UPD_ACCEPTED_FILE_TYPES.includes(file.type)) {
        return { data: null, error: 'Sadece .jpg, .jpeg ve .pdf uzantılı dosyalar kabul edilir.' };
      }
      // Consider adding size validation here too if not already implicitly handled

      const oldFilePath = existingReceipt.file_path;
      const fileExt = file.name.split('.').pop();
      const fileName = `${studentId}_${year}_${month}_${Date.now()}.${fileExt}`;
      const newFilePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-receipts') // Bucket adınız
        .upload(newFilePath, file);

      if (uploadError) {
        console.error('Error uploading new file for update:', uploadError);
        return { data: null, error: 'Yeni dosya yüklenirken bir hata oluştu: ' + uploadError.message };
      }
      updateData.file_path = newFilePath;

      // Eski dosyayı sil (başarısız olursa logla ama işlemi durdurma)
      if (oldFilePath) {
        const { error: deleteOldError } = await supabase.storage
            .from('student-receipts')
            .remove([oldFilePath]);
        if (deleteOldError) {
            console.warn('Could not delete old receipt file:', deleteOldError);
        }
      }
    } else {
      // Eğer dosya güncellenmiyorsa, sadece orijinal dosya adını null yapalım (eğer istenirse)
      // veya olduğu gibi bırakalım. Şimdilik olduğu gibi bırakıyorum.
      // updateData.file_name_original = existingReceipt.file_name_original; // Eğer yeni dosya yoksa eskisi kalır.
    }

    // 4. Dekont bilgisini veritabanında güncelle
    const { data: updatedReceipt, error: dbUpdateError } = await supabase
      .from('receipts')
      .update(updateData)
      .eq('id', receiptId)
      .select('id')
      .single();

    if (dbUpdateError) {
      console.error('Error updating receipt in DB:', dbUpdateError);
      return { data: null, error: 'Dekont güncellenirken bir veritabanı hatası oluştu: ' + dbUpdateError.message };
    }

    if (!updatedReceipt) {
      return { data: null, error: 'Dekont güncellendi ancak ID alınamadı.' };
    }

    return { data: { id: updatedReceipt.id }, error: null };

  } catch (error) {
    console.error('Unexpected error in updateReceipt:', error);
    return { data: null, error: 'Dekont güncellenirken beklenmedik bir hata oluştu.' };
  }
}

// Gerekirse dekont silme fonksiyonu da eklenebilir.
// export async function deleteReceipt(studentId: string, receiptId: string) { ... }

export async function deleteReceiptAndFile(receiptId: string, filePath: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();

  if (!receiptId || !filePath) {
    return { success: false, error: 'Dekont ID veya dosya yolu eksik.' };
  }

  try {
    // 1. Delete the file from Storage
    const { error: fileDeleteError } = await supabase.storage
      .from('student-receipts') // Ensure this is your correct bucket name
      .remove([filePath]);

    if (fileDeleteError) {
      // Log the error but proceed to delete the DB record if desired, or return error immediately
      console.warn(`Dosya silinirken hata oluştu (${filePath}):`, fileDeleteError.message);
      // Depending on desired behavior, you might want to stop if file deletion fails:
      // return { success: false, error: `Dosya silinirken hata oluştu: ${fileDeleteError.message}` };
    }

    // 2. Delete the receipt record from the database
    const { error: dbDeleteError } = await supabase
      .from('receipts')
      .delete()
      .eq('id', receiptId);

    if (dbDeleteError) {
      console.error(`Veritabanından dekont silinirken hata oluştu (ID: ${receiptId}):`, dbDeleteError.message);
      return { success: false, error: `Dekont veritabanından silinirken hata oluştu: ${dbDeleteError.message}` };
    }

    return { success: true };

  } catch (error: unknown) {
    console.error('Unexpected error in deleteReceiptAndFile:', error);
    return { success: false, error: `Beklenmedik bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}` };
  }
} 