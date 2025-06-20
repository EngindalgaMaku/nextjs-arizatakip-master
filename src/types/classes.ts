import { z } from 'zod';

export const ClassSchema = z.object({
  id: z.string().uuid(),
  semester_id: z.string().uuid(),
  name: z.string().min(1, 'Sınıf adı zorunlu').max(50, 'Sınıf adı en fazla 50 karakter olabilir.'), // e.g., "10-A", "ATP 11-B"
  branch_id: z.string().uuid('Geçerli bir branş seçilmeli').nullable().optional(), // Branş ID (örn: Bilişim Teknolojileri)
  dal_id: z.string().uuid('Geçerli bir dal seçilmeli').nullable().optional(), // Dal ID (örn: Yazılım Geliştirme)
  branch_name: z.string().nullable().optional(), // Branş adı (join için)
  dal_name: z.string().nullable().optional(), // Dal adı (join için)
  classTeacherId: z.string().uuid('Geçerli bir öğretmen seçilmeli').optional().nullable(), // Optional FK, allow null
  classPresidentName: z.string().max(100, 'Başkan adı en fazla 100 karakter olabilir.').nullable().optional(), // Optional text field
  teacherName: z.string().nullable().optional(), // NEW: Added for teacher name from join
  displayOrder: z.number().int().positive().optional(), // NEW: Order field (optional initially, set by backend)
  grade_level: z.number().int().min(9, "Seviye 9-12 arası olmalıdır.").max(12, "Seviye 9-12 arası olmalıdır."),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  // Geriye dönük uyumluluk için eski alanlar
  department: z.string().max(100).nullable().optional(), // Eski alan, geriye dönük uyumluluk için
  field: z.string().max(100).nullable().optional(),
  branch: z.string().max(100).nullable().optional(),
  specialization: z.string().max(100).nullable().optional(),
});

export const ClassFormSchema = ClassSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  semester_id: true,
  branch_name: true,
  dal_name: true,
});

export type Class = z.infer<typeof ClassSchema>;
export type ClassFormValues = z.infer<typeof ClassFormSchema>; 