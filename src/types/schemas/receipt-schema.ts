import { z } from 'zod';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const ReceiptSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  businessId: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(new Date().getFullYear() - 5).max(new Date().getFullYear() + 1),
  filePath: z.string().min(1),
  fileNameOriginal: z.string().optional(),
  notes: z.string().optional(),
  // status: z.enum(['pending_approval', 'approved', 'rejected']).optional(), // Eğer status alanı SQL'de aktif edilirse
  uploadedAt: z.date(),
  updatedAt: z.date(),
});

export type Receipt = z.infer<typeof ReceiptSchema>;

export const UploadReceiptFormSchema = z.object({
  // studentId öğrenci giriş yaptıktan sonra otomatik alınacak
  businessName: z.string().min(2, { message: "İşletme adı en az 2 karakter olmalıdır." }),
  month: z.coerce.number().int().min(1, {message: "Ay seçimi zorunludur."}).max(12),
  year: z.coerce.number().int().min(new Date().getFullYear() - 5, {message: "Yıl hatası"}).max(new Date().getFullYear() + 1, {message: "Yıl hatası"}),
  file: z
    .any() // veya z.instanceof(File) tarayıcı ortamında
    .refine((files) => files?.[0], "Dosya yüklemek zorunludur.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE_BYTES, `Maksimum dosya boyutu ${MAX_FILE_SIZE_MB}MB olabilir.`)
    .refine(
      (files) => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      ".pdf, .jpg, .jpeg, .png ve .webp uzantılı dosyalar kabul edilir."
    ),
  notes: z.string().optional(),
});

// Schema for the metadata part of the upload form (excluding the file itself)
export const UploadReceiptMetadataSchema = z.object({
  businessName: z.string().min(2, { message: "İşletme adı en az 2 karakter olmalıdır." }),
  month: z.coerce.number().int().min(1, {message: "Ay seçimi zorunludur."}).max(12),
  year: z.coerce.number().int().min(new Date().getFullYear() - 5, {message: "Yıl hatası"}).max(new Date().getFullYear() + 1, {message: "Yıl hatası"}),
  notes: z.string().optional(),
});

// Type for the metadata payload
export type UploadReceiptFormPayload = z.infer<typeof UploadReceiptMetadataSchema>;

export const UpdateReceiptFormSchema = UploadReceiptFormSchema.extend({
  receiptId: z.string().uuid()
});
export type UpdateReceiptFormPayload = z.infer<typeof UpdateReceiptFormSchema>; 