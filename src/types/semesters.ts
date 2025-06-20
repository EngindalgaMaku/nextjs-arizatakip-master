import { z } from 'zod';

// Helper to ensure date strings are in YYYY-MM-DD format
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-MM-DD formatında olmalıdır.');

// Base schema shape without refinement
const SemesterBaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Sömestr adı zorunludur.'),
  start_date: dateSchema,
  end_date: dateSchema,
  is_active: z.boolean().default(false),
  created_at: z.string().optional(), // Just validate as string
  updated_at: z.string().optional(), // Just validate as string
});

// Apply refinement for the final schema used for parsing full objects
export const SemesterSchema = SemesterBaseSchema.refine(data => new Date(data.end_date) >= new Date(data.start_date), {
  message: 'Bitiş tarihi, başlangıç tarihinden önce olamaz.',
  path: ['end_date'], // Point error to end_date field
});

// Schema for validating the semester form (omits DB-managed fields)
// Use the BASE schema for omit, before the refinement was added
export const SemesterFormSchema = SemesterBaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  is_active: true, // is_active is managed by a separate action
});

// TypeScript type for the full Semester object (inferred from the refined schema)
export type Semester = z.infer<typeof SemesterSchema>;

// TypeScript type for the form values (inferred from the form schema)
export type SemesterFormValues = z.infer<typeof SemesterFormSchema>; 