import { z } from 'zod';

export const BUSINESS_TYPES = ['public', 'private'] as const;
export type BusinessType = typeof BUSINESS_TYPES[number];

export const BusinessFormSchema = z.object({
  name: z.string().min(3, 'İşletme adı en az 3 karakter olmalıdır.'),
  contactPerson: z.string().optional(),
  contactPhone: z.string().optional(), // İleride format doğrulaması eklenebilir
  address: z.string().optional(),
  industry: z.string().optional(),
  businessType: z.enum(BUSINESS_TYPES, {
    required_error: 'İşletme türü seçilmelidir.',
    invalid_type_error: 'Geçersiz işletme türü.',
  }),
  notes: z.string().optional(),
  semesterId: z.string().uuid({ message: 'Geçerli bir sömestr IDsi seçilmelidir.' }),
});

export const BusinessSchema = BusinessFormSchema.extend({
  id: z.string().uuid(),
  createdAt: z.coerce.date().optional(), // Supabase'den string olarak gelir, Date objesine dönüştürülür
  updatedAt: z.coerce.date().optional(), // Supabase'den string olarak gelir, Date objesine dönüştürülür
});

export type Business = z.infer<typeof BusinessSchema>;
export type BusinessFormValues = z.infer<typeof BusinessFormSchema>;

export const BUSINESS_TYPE_OPTIONS: { label: string; value: BusinessType }[] = [
  { label: 'Kamu', value: 'public' },
  { label: 'Özel', value: 'private' },
]; 