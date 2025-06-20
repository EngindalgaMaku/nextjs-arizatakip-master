import { z } from 'zod';

// Define allowed roles using literal types
export const teacherRoles = z.enum(['MUDUR', 'MUDUR_YARDIMCISI', 'OGRETMEN', 'REHBER', 'ATOLYE_SEFI', 'ALAN_SEFI']);
export type TeacherRole = z.infer<typeof teacherRoles>;

// Labels for roles (can be used in UI)
export const teacherRoleLabels: Record<TeacherRole, string> = {
    MUDUR: 'Müdür',
    MUDUR_YARDIMCISI: 'Müdür Yardımcısı',
    OGRETMEN: 'Öğretmen',
    REHBER: 'Rehber Öğretmen',
    ATOLYE_SEFI: 'Atölye Şefi',
    ALAN_SEFI: 'Alan Şefi'
};

// Base schema for a Teacher, matching Supabase table columns
export const TeacherSchema = z.object({
  id: z.string().uuid(),
  semester_id: z.string().uuid().nullable(),
  name: z.string().min(1, 'Öğretmen adı zorunludur.'),
  birthDate: z.string().nullable().optional(), // Store as ISO string or similar
  role: teacherRoles.nullable().optional(),
  phone: z.string().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  createdAt: z.string().optional(), // Let DB handle this
  updatedAt: z.string().optional(), // Let DB handle this
  is_active: z.boolean().default(true) // Add is_active field
});

// Schema for validating form data (omitting DB-generated fields)
export const TeacherFormSchema = TeacherSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  is_active: true, // Don't include is_active in the standard add/edit form
  semester_id: true // Semester is managed globally or via specific actions, not this form
});

// Type for the full Teacher object
export type Teacher = z.infer<typeof TeacherSchema>;

// Type for form values
export type TeacherFormValues = z.infer<typeof TeacherFormSchema>;

// Interface for Branch data (used in Teacher form)
export interface Branch {
  id: string;
  name: string;
} 