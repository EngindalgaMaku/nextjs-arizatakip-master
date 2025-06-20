import { z } from 'zod';

// Schema for creating/updating a single entry via modal/grid
// Moved from scheduleActions.ts
export const LocationScheduleEntryPayloadSchema = z.object({
  lesson_id: z.string().uuid('Geçerli bir ders seçilmelidir.'),
  class_id: z.string().uuid('Geçerli bir sınıf seçilmelidir.').nullable().optional(),
  teacher_id: z.string().uuid('Geçerli bir öğretmen seçilmelidir.').nullable().optional(),
});
export type LocationScheduleEntryPayload = z.infer<typeof LocationScheduleEntryPayloadSchema>;

// Original schema for bulk upsert
export const ScheduleUpsertEntrySchema = z.object({
  lab_id: z.string().uuid(),
  day: z.number().min(1).max(5), // Assuming Monday=1, Friday=5
  period: z.number().min(1).max(10), // Assuming 10 periods
  lesson_id: z.string().uuid('Geçerli bir ders seçilmelidir.').nullable(),
  class_id: z.string().uuid('Geçerli bir sınıf seçilmelidir.').nullable(),
  teacher_id: z.string().uuid('Geçerli bir öğretmen seçilmelidir.').nullable(),
});

export type ScheduleUpsertEntry = z.infer<typeof ScheduleUpsertEntrySchema>;

// Full schedule entry as stored in the database + joined names
export const ScheduleEntrySchema = ScheduleUpsertEntrySchema.extend({
  id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
  // Joined names (optional because they might not always be joined)
  lesson_name: z.string().optional().nullable(), 
  class_name: z.string().optional().nullable(),
  teacher_name: z.string().optional().nullable(),
});

export type ScheduleEntry = z.infer<typeof ScheduleEntrySchema>; 