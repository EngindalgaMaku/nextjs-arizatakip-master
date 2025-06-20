import { z } from 'zod';

// Define the assignment type enum using Zod (removed 'preferred')
export const AssignmentTypeEnum = z.enum(['required', 'excluded']);
export type AssignmentType = z.infer<typeof AssignmentTypeEnum>;

// Base schema for the teacher_course_assignments table
export const TeacherCourseAssignmentSchema = z.object({
  id: z.string().uuid(),
  teacher_id: z.string().uuid('Geçerli bir öğretmen seçilmelidir.'),
  dal_ders_id: z.string().uuid('Geçerli bir ders seçilmelidir.'),
  assignment: z.enum(['required', 'excluded'], { // Removed 'preferred'
    required_error: 'Atama türü zorunludur.',
    invalid_type_error: 'Geçersiz atama türü.',
  }),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  
  // Add optional nested objects for joined data
  teacher: z.object({
      id: z.string().uuid(),
      name: z.string(),
  }).optional().nullable(),
  
  dal_ders: z.object({
      id: z.string().uuid(),
      dersAdi: z.string(),
      sinifSeviyesi: z.number(), // Assuming sinifSeviyesi is a number
      dalId: z.string().uuid().optional().nullable(),
  }).optional().nullable(),
});

// Type inferred from the base schema
export type TeacherCourseAssignment = z.infer<typeof TeacherCourseAssignmentSchema>;

// Schema for the assignment form (might only need assignment type)
export const TeacherCourseAssignmentFormSchema = z.object({
  assignment: z.enum(['required', 'excluded'], { // Removed 'preferred'
    required_error: 'Atama türü seçilmelidir.',
  }),
});

// Type for the form values
export type TeacherCourseAssignmentFormValues = z.infer<typeof TeacherCourseAssignmentFormSchema>; 