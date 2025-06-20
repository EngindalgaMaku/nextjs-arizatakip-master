import { z } from 'zod';
// LabTypeSchema import'u şu an için gerekli değil, ihtiyaç olursa eklenir.

// Schema for the Location object in the database
export const LocationSchema = z.object({
  id: z.string().uuid(),
  branch_id: z.string().uuid('Geçerli bir branş seçilmelidir.'), // Foreign key to branches table
  name: z.string().min(1, 'Konum adı zorunludur.').max(100, 'Konum adı en fazla 100 karakter olabilir.'),
  code: z.string().max(20, 'Konum kodu en fazla 20 karakter olabilir.').optional().nullable(), // Optional code
  capacity: z.number().int().positive('Kapasite pozitif bir tam sayı olmalıdır.').optional().nullable(), // Optional capacity
  location_type_id: z.string().uuid('Geçerli bir lokasyon tipi seçilmelidir.').nullable(), // Changed from lab_type_id, made nullable if a location might not have a type initially
  is_suitable_for_theory: z.boolean().default(false).optional().nullable(), // Added field
  is_suitable_for_practice: z.boolean().default(false).optional().nullable(), // Added field
  created_at: z.string().optional(), // Managed by DB
  updated_at: z.string().optional(), // Managed by DB
});

// Schema for validating the Location form (omits DB-managed fields)
export const LocationFormSchema = LocationSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// TypeScript type for the full Location object
export type Location = z.infer<typeof LocationSchema>;

// TypeScript type for the form values
export type LocationFormValues = z.infer<typeof LocationFormSchema>;

// Type including related details for display purposes
export interface LocationWithDetails extends Location {
    branch?: { id: string; name: string } | null;
    locationType?: { // Changed from labType
        id: string;
        name: string;
        // Add other fields from LocationType if needed for display, e.g., description
    } | null;
}