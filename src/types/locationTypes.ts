import * as z from 'zod';

// Zod schema for validating form input when creating/updating
export const locationTypeFormSchema = z.object({
  name: z.string().min(3, { message: 'Tip adı en az 3 karakter olmalıdır.' }).max(100, { message: 'Tip adı en fazla 100 karakter olabilir.' }),
  description: z.string().max(500, { message: 'Açıklama en fazla 500 karakter olabilir.' }).optional().nullable(),
});

// Type inferred from the Zod schema for form values
export type LocationTypeFormValues = z.infer<typeof locationTypeFormSchema>;

// Interface representing the structure of a LocationType record from the database
export interface LocationType {
  id: string;
  name: string;
  description: string | null;
  created_at: string; // Assuming string representation after fetching
  updated_at?: string | null;
} 