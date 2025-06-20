import { z } from 'zod';

export const StajIsletmesiSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, { message: "İşletme adı en az 2 karakter olmalıdır." }),
  isletme_tipi: z.string().min(1, { message: "İşletme tipi boş olamaz." }),
  createdAt: z.date(),
});

export type StajIsletmesi = z.infer<typeof StajIsletmesiSchema>;

export const CreateStajIsletmesiSchema = StajIsletmesiSchema.omit({ id: true, createdAt: true });
export type CreateStajIsletmesiPayload = z.infer<typeof CreateStajIsletmesiSchema>;

export const UpsertStajIsletmesiSchema = StajIsletmesiSchema.partial({ id: true, createdAt: true });
export type UpsertStajIsletmesiPayload = z.infer<typeof UpsertStajIsletmesiSchema>; 