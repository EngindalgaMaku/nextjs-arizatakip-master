import { z } from 'zod';

// Constants for grade levels
export const SINIF_SEVIYELERI = [9, 10, 11, 12] as const; // Use const assertion for literal types
export type SinifSeviyesi = typeof SINIF_SEVIYELERI[number]; // Type: 9 | 10 | 11 | 12

// Schema for a Branch Lesson - Represents the full DB object
export const DalDersSchema = z.object({
  id: z.string().uuid(),
  dalId: z.string().uuid(),
  sinifSeviyesi: z.union([
    z.literal(9),
    z.literal(10),
    z.literal(11),
    z.literal(12),
  ]),
  dersAdi: z.string().min(1, 'Ders adı zorunludur.').max(150, 'Ders adı en fazla 150 karakter olabilir.'),
  haftalikSaat: z.number().int().positive('Haftalık saat pozitif bir tam sayı olmalıdır.').max(40, 'Haftalık saat en fazla 40 olabilir.'), // Add max check
  requires_multiple_resources: z.boolean().default(false), // Yeni alan eklendi
  bolunebilir_mi: z.boolean().default(true), // Add new field with default
  cizelgeye_dahil_et: z.boolean().default(true), // New field: Include in schedule?
  createdAt: z.string().optional(), // from DB
  updatedAt: z.string().optional(), // from DB
});

// Schema for form validation (omits generated/implicit fields)
export const DalDersFormSchema = DalDersSchema.omit({
  id: true,
  dalId: true, // dalId will be passed implicitly, not part of form
  createdAt: true,
  updatedAt: true,
  // requires_multiple_resources artık formdan yönetilecek, omit'ten KALDIRILMALI
  // requires_multiple_resources: true, // Bu satırı kaldır veya yorumla
}).extend({
   // Make bolunebilir_mi optional in the form input if it defaults in DB/schema
   bolunebilir_mi: z.boolean().optional(), 
   suitableLocationTypeIds: z.array(z.string().uuid()).optional(), // UPDATED: from suitableLabTypeIds
   cizelgeye_dahil_et: z.boolean().optional(), // Add optional boolean for schedule inclusion
   requires_multiple_resources: z.boolean().optional(), // Add optional boolean for multi-resource need
});

// Type for the full Branch Lesson object
export type DalDers = z.infer<typeof DalDersSchema>;

// Type for form values
export type DalDersFormValues = z.input<typeof DalDersFormSchema>;

// Helper type for grouping lessons by grade level
export type GrupedDalDersleri = {
  [key in SinifSeviyesi]?: DalDers[];
}; 