import { z } from 'zod';

// Schema for the Branch object in the database (matching table structure)
export const BranchSchema = z.object({
  id: z.string().uuid().optional(), // Veritabanından gelirken veya yeni oluşturulurken opsiyonel
  name: z.string().min(1, 'Branş adı zorunludur.'),
  code: z.string().nullable().optional(), // Opsiyonel veya null
  description: z.string().nullable().optional(), // Opsiyonel veya null
  type: z.enum(['meslek', 'kultur']).default('kultur').optional(), // Branş tipi: meslek veya kültür
  created_at: z.string().optional(), // Veritabanından gelirken (tarih stringi)
  updated_at: z.string().optional(), // Veritabanından gelirken (tarih stringi)
});

export type Branch = z.infer<typeof BranchSchema>;

// Schema for validating the branch creation form
export const BranchFormSchema = BranchSchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
});

export type BranchFormData = z.infer<typeof BranchFormSchema>;

// Type for the Branch object (matching DB structure for read operations)
// Note: We are using the interface defined in teacherActions for now,
// but ideally, this should be the source of truth.
// export type Branch = z.infer<typeof BranchDbSchema>;

// Type for the form values used when creating/editing a branch
export type BranchFormValues = z.infer<typeof BranchFormSchema>; 