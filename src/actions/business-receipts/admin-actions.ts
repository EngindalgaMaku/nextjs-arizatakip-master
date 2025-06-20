'use server';

// import { createServerActionClient } from '@supabase/auth-helpers-nextjs'; // Old
import { createSupabaseServerClient } from '@/lib/supabase/server'; // New
// import { cookies } from 'next/headers'; // No longer needed here
import { z } from 'zod';
import { getOrCreateStajIsletmesiByName } from './business-actions'; // Import the helper

// const getSupabaseClient = () => createServerActionClient<Database>({ cookies }); // Old

export interface AdminReceiptFilter {
  studentName?: string;
  className?: string;
  schoolNumber?: string;
  businessName?: string;
  month?: number;
  year?: number;
  page?: number;
  pageSize?: number;
  fetchAll?: boolean;
}

export interface AdminReceiptListItem {
  receipt_id: string;
  receipt_month: number;
  receipt_year: number;
  receipt_file_path: string;
  receipt_file_name_original: string | null;
  receipt_notes: string | null;
  receipt_uploaded_at: string; // This will be the formatted date string
  student_id: string | null; // Original FK, if selected in view
  staj_isletmesi_id: string | null; // Original FK, if selected in view
  student_name: string | null;
  student_school_number: string | null;
  student_class_name: string | null;
  business_name: string | null;
}

export async function getReceiptsForAdmin(filters: AdminReceiptFilter): Promise<{
  data: AdminReceiptListItem[] | null;
  error: string | null;
  count: number | null;
}> {
  const supabase = await createSupabaseServerClient();
  const { 
    studentName, className, schoolNumber, 
    businessName, month, year, 
    page = 1, pageSize = 10, fetchAll = false
  } = filters;

  try {
    // Query the new VIEW
    let query = supabase
      .from('admin_receipts_display') // Use the view name
      .select('* ', { count: 'exact' }); // Select all columns from the view

    // Apply filters using the view's column names
    if (studentName) {
      query = query.ilike('student_name', `%${studentName}%`);
    }
    if (schoolNumber) {
      query = query.eq('student_school_number', schoolNumber);
    }
    if (className) {
      query = query.ilike('student_class_name', `%${className}%`);
    }
    if (businessName) {
      query = query.ilike('business_name', `%${businessName}%`);
    }

    // Date filters using view column names (e.g., receipt_month, receipt_year)
    if (year && month) {
      query = query.eq('receipt_year', year).eq('receipt_month', month);
    } else if (year && !month) { // Specific year, "All Months"
      query = query.eq('receipt_year', year);
    } else if (!year && month) { // Specific month, "All Years"
      query = query.eq('receipt_month', month);
    }

    if (!fetchAll) {
      const startIndex = (page - 1) * pageSize;
      query = query.range(startIndex, startIndex + pageSize - 1);
    }
    
    // Sorting using the view's column names - THIS SHOULD NOW WORK RELIABLY
    query = query.order('student_name', { ascending: true, nullsFirst: false }); // student_name from view
    query = query.order('receipt_year', { ascending: false }); // receipt_year from view
    query = query.order('receipt_month', { ascending: false }); // receipt_month from view

    const { data: viewData, error, count } = await query;

    if (error) {
      console.error('Error fetching from admin_receipts_display view:', error);
      return { data: null, error: 'Dekontlar alınırken bir hata oluştu: ' + error.message, count: null };
    }

    if (!viewData) {
      return { data: [], error: null, count: 0 }; // Return empty array if viewData is null
    }

    // Map data from the view to AdminReceiptListItem
    // The columns from the view should directly map to AdminReceiptListItem fields
    const formattedData: AdminReceiptListItem[] = viewData.map((item: any) => ({
      receipt_id: item.receipt_id,
      receipt_month: item.receipt_month,
      receipt_year: item.receipt_year,
      receipt_file_path: item.receipt_file_path,
      receipt_file_name_original: item.receipt_file_name_original,
      receipt_notes: item.receipt_notes,
      // Format uploaded_at if it's a raw timestamp from the view
      receipt_uploaded_at: new Date(item.receipt_uploaded_at).toLocaleDateString('tr-TR'), 
      student_id: item.student_id, 
      staj_isletmesi_id: item.staj_isletmesi_id,
      student_name: item.student_name,
      student_school_number: item.student_school_number,
      student_class_name: item.student_class_name,
      business_name: item.business_name,
    }));

    return { data: formattedData, error: null, count };

  } catch (e: any) {
    console.error('Unexpected error in getReceiptsForAdmin querying view:', e);
    return { data: null, error: 'Dekontlar alınırken beklenmedik bir hata oluştu: ' + e.message, count: null };
  }
}

export async function getReceiptDownloadUrl(
  filePath: string,
  expiresIn: number = 3600 
): Promise<{ data: { downloadUrl: string } | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const validation = z.string().min(1).safeParse(filePath);

  if (!validation.success) {
    return { data: null, error: 'Geçersiz dosya yolu.' };
  }

  try {
    const { data, error } = await supabase.storage
      .from('student-receipts') 
      .createSignedUrl(validation.data, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return { data: null, error: 'İndirme linki oluşturulurken bir hata oluştu: ' + error.message };
    }

    return { data: { downloadUrl: data.signedUrl }, error: null };

  } catch (e: any) {
    console.error('Unexpected error in getReceiptDownloadUrl:', e);
    return { data: null, error: 'İndirme linki oluşturulurken beklenmedik bir hata oluştu: ' + e.message };
  }
}

// Schema for validating receipt update data
const updateReceiptSchema = z.object({
  receiptId: z.string().min(1, "Dekont ID gereklidir."),
  month: z.number().min(1, "Ay 1-12 arasında olmalıdır.").max(12, "Ay 1-12 arasında olmalıdır."),
  year: z.number().min(2000, "Yıl 2000'den büyük olmalıdır.").max(2100, "Yıl 2100'den küçük olmalıdır."),
  notes: z.string().max(500, "Notlar 500 karakterden fazla olamaz.").nullable().optional(),
  businessName: z.string().min(2, "İşletme adı en az 2 karakter olmalıdır.").max(255, "İşletme adı çok uzun."),
});

export type UpdateAdminReceiptPayload = z.infer<typeof updateReceiptSchema>;

export async function updateAdminReceipt(
  payload: UpdateAdminReceiptPayload
): Promise<{ data: { id: string } | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const validation = updateReceiptSchema.safeParse(payload);

  if (!validation.success) {
    return { data: null, error: validation.error.errors.map(e => e.message).join(', ') };
  }

  const { receiptId, month, year, notes, businessName } = validation.data;

  try {
    // 1. Get or Create Staj Isletmesi (Business)
    const stajIsletmesiResult = await getOrCreateStajIsletmesiByName(businessName.trim());
    if (stajIsletmesiResult.error || !stajIsletmesiResult.data) {
      return { data: null, error: stajIsletmesiResult.error || 'Staj işletmesi işlenemedi.' };
    }
    const stajIsletmesiId = stajIsletmesiResult.data.id;

    // 2. Update the receipt with the new staj_isletmesi_id and other fields
    const { data, error } = await supabase
      .from('receipts')
      .update({
        month,
        year,
        notes: notes, // Ensure notes is explicitly set (can be null)
        staj_isletmesi_id: stajIsletmesiId, // Update the foreign key for the business
      })
      .eq('id', receiptId)
      .select('id')
      .single();

    if (error) {
      console.error('Error updating receipt:', error);
      return { data: null, error: 'Dekont güncellenirken bir hata oluştu: ' + error.message };
    }

    if (!data) {
      return { data: null, error: 'Dekont bulunamadı veya güncellenemedi.' };
    }

    return { data: { id: data.id }, error: null };

  } catch (e: any) {
    console.error('Unexpected error in updateAdminReceipt:', e);
    return { data: null, error: 'Dekont güncellenirken beklenmedik bir hata oluştu: ' + e.message };
  }
} 