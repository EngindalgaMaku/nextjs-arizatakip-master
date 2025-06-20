import { z } from 'zod';

export const DAYS_OF_WEEK = [
  { id: 1, name: 'Pazartesi' },
  { id: 2, name: 'Salı' },
  { id: 3, name: 'Çarşamba' },
  { id: 4, name: 'Perşembe' },
  { id: 5, name: 'Cuma' },
  // Add Saturday/Sunday if needed
  // { id: 6, name: 'Cumartesi' },
  // { id: 0, name: 'Pazar' },
];

export const TIME_SLOTS = [
  { id: 1, time: '08:20 - 09:00' },
  { id: 2, time: '09:15 - 09:55' },
  { id: 3, time: '10:05 - 10:45' },
  { id: 4, time: '10:55 - 11:35' },
  { id: 5, time: '11:45 - 12:25' },
  { id: 6, time: '13:10 - 13:50' },
  { id: 7, time: '14:00 - 14:40' },
  { id: 8, time: '14:50 - 15:30' },
  { id: 9, time: '15:40 - 16:20' },
  { id: 10, time: '16:30 - 17:10' },
  // Add more slots if needed
] as const;

// Schema for a single schedule entry (matches DB + camelCase)
export const TeacherScheduleEntrySchema = z.object({
  id: z.string().uuid(),
  teacherId: z.string().uuid(),
  dayOfWeek: z.number().min(0).max(6),
  timeSlot: z.number().min(1).max(TIME_SLOTS.length), // Ensure max matches length
  className: z.string().nullable().optional(),
  locationName: z.string().nullable().optional(),
  createdAt: z.string().optional(), // Changed from datetime()
  updatedAt: z.string().optional(), // Changed from datetime()
  classId: z.string().uuid('Geçerli bir sınıf seçilmelidir.').nullable().optional(),
  classNameDisplay: z.string().nullable().optional(),
});

// Type for a single entry
export type TeacherScheduleEntry = z.infer<typeof TeacherScheduleEntrySchema>;

// Schema for the form (doesn't include ids or timestamps)
export const TeacherScheduleFormSchema = z.object({
  className: z.string().min(1, 'Ders adı zorunludur.').max(100, 'Ders adı en fazla 100 karakter olabilir.'),
  locationName: z.string().max(100, 'Konum en fazla 100 karakter olabilir.').nullable().optional(),
  classId: z.string().uuid('Geçerli bir sınıf seçilmelidir.').nullable().optional(),
});

// Type for form values
export type TeacherScheduleFormValues = z.input<typeof TeacherScheduleFormSchema>;

// Type helper for structuring data for the grid
export type TeacherScheduleGridData = {
  [day: number]: {
    [slot: number]: TeacherScheduleEntry | null;
  };
}; 