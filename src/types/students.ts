import { z } from 'zod';

// New schema for a single guardian
export const GuardianSchema = z.object({
  relationship: z.string().min(1, 'Yakınlık zorunlu'), // e.g., 'mother', 'father', 'other'
  name: z.string().min(1, 'Veli adı zorunlu'),
  phone: z.string().min(10, 'Veli telefonu en az 10 hane').regex(/^\+?\d+$/, 'Sadece rakam ve "+" içerebilir').optional().or(z.literal('')), // Making phone optional per guardian
});

// Type for a single guardian
export type Guardian = z.infer<typeof GuardianSchema>;

// Updated Student Schema
export const StudentSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Ad zorunlu'),
  email: z.string().email('Geçersiz e-posta').optional().or(z.literal('')),
  birthDate: z.string().nullable(),
  phone: z.string().min(10, 'Telefon numarası en az 10 hane').regex(/^\+?\d+$/, 'Sadece rakam ve "+" içerebilir').optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']).optional(),
  schoolNumber: z.string().min(1, 'Okul numarası zorunlu').nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
  guardians: z.array(GuardianSchema).optional().default([]), // Optional array, defaults to empty
});

export type Student = {
  id?: string;
  name: string;
  status: 'active' | 'inactive';
  guardians: Guardian[];
  birthDate: string | null;
  schoolNumber: string | null;
  email?: string | null | undefined;
  gender?: 'male' | 'female' | 'other';
  phone?: string | null;
};

export type ClassInfo = {
  id: string;
  name: string;
};

export type StudentInfo = {
  id: string;
  name: string;
}; 