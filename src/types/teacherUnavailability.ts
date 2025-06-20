import { z } from 'zod';

// Base schema for TeacherUnavailability without refinements (for form usage)
export const TeacherUnavailabilityBaseSchema = z.object({
  id: z.string().uuid(),
  teacher_id: z.string().uuid(),
  day_of_week: z.number().int().min(1).max(5), // 1:Pzt, 5:Cuma
  start_period: z.number().int().min(1).max(10), // 1-10
  end_period: z.number().int().min(1).max(10), // 1-10
  reason: z.string().max(200).nullable().optional(),
  created_at: z.string().datetime().optional(), // from DB
  updated_at: z.string().datetime().optional(), // from DB
});

/** ZodEffects schema enforcing end_period >= start_period */
export const TeacherUnavailabilitySchema = TeacherUnavailabilityBaseSchema.refine(data => data.end_period >= data.start_period, {
  message: 'Bitiş saati başlangıç saatinden önce olamaz.',
  path: ['end_period'], // Point error to end_period field
});

// Type inferred from the schema
export type TeacherUnavailability = z.infer<typeof TeacherUnavailabilitySchema>;

// Schema for form validation (omits generated fields, using base schema to allow omit)
export const TeacherUnavailabilityFormSchema = TeacherUnavailabilityBaseSchema.omit({
  id: true,
  teacher_id: true,
  created_at: true,
  updated_at: true,
});

// Type for form values
export type TeacherUnavailabilityFormValues = z.input<typeof TeacherUnavailabilityFormSchema>; 