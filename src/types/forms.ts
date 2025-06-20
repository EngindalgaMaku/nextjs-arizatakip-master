import { z } from 'zod';

// Allowed form field types
export const FORM_FIELD_TYPES = [
  'text',
  'email',
  'textarea',
  'number',
  'date',
  'select',
  'checkbox',
  'radio',
] as const;
export const FormFieldTypeSchema = z.enum(FORM_FIELD_TYPES);
export type FormFieldType = z.infer<typeof FormFieldTypeSchema>;

// Allowed form statuses
export const FORM_STATUSES = ['draft', 'published'] as const;
export const FormStatusSchema = z.enum(FORM_STATUSES);
export type FormStatus = z.infer<typeof FormStatusSchema>;

// Schema for options in select, radio, checkbox fields
export const FormFieldOptionSchema = z.object({
  label: z.string().min(1, 'Seçenek etiketi boş olamaz'),
  value: z.string().min(1, 'Seçenek değeri boş olamaz'),
});
export type FormFieldOption = z.infer<typeof FormFieldOptionSchema>;

// Schema for Form Fields (mapping DB columns to camelCase)
export const FormFieldSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  label: z.string().min(1, 'Alan etiketi/soru boş olamaz'),
  fieldType: FormFieldTypeSchema,
  // Options are only relevant for certain types, validated conditionally if needed
  options: z.array(FormFieldOptionSchema).nullable().optional(), 
  isRequired: z.boolean().default(false),
  displayOrder: z.number().int().positive(),
  createdAt: z.string().optional(), // Handled by DB
  updatedAt: z.string().optional(), // Handled by DB
});
export type FormField = z.infer<typeof FormFieldSchema>;

// Schema for Forms (mapping DB columns to camelCase)
export const FormSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Form başlığı boş olamaz'),
  description: z.string().nullable().optional(),
  status: FormStatusSchema,
  createdAt: z.string().optional(), // Handled by DB
  updatedAt: z.string().optional(), // Handled by DB
  // Optional: Include fields when fetching a full form
  fields: z.array(FormFieldSchema).optional(), 
});
export type Form = z.infer<typeof FormSchema>;

// Schema for Form Submissions (mapping DB columns to camelCase)
export const FormSubmissionSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  submittedAt: z.string(), // Should be a date string
  // Data can be any JSON object, typically field label/id -> value
  data: z.record(z.string(), z.any()), 
});
export type FormSubmission = z.infer<typeof FormSubmissionSchema>;

// --- Form Values for Creation/Editing ---

// Values needed to create/update a Form Field (manually defined)
export const FormFieldValuesSchema = z.object({
  label: z.string().min(1, 'Alan etiketi/soru boş olamaz'),
  fieldType: FormFieldTypeSchema,
  options: z.array(FormFieldOptionSchema).nullable().optional(),
  isRequired: z.boolean(),
  // displayOrder is excluded as it's handled by the backend
});

// Keep the original type for reference if needed, but use the new schema for the form
// export const OriginalFormFieldValuesSchema = FormFieldSchema.omit({
//   id: true,
//   formId: true,
//   createdAt: true,
//   updatedAt: true,
// });
export type FormFieldValues = z.infer<typeof FormFieldValuesSchema>;

// Values needed to create/update a Form (excluding generated fields)
export const FormValuesSchema = FormSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  fields: true, // Fields managed separately
});
export type FormValues = z.infer<typeof FormValuesSchema>;

/**
 * Represents a submitted response to a form.
 */
export interface FormResponse {
  id: string;           // Unique ID for the response
  form_id: string;      // ID of the form it belongs to
  submitted_at: string; // Timestamp of submission (ISO string)
  response_data: Record<string, any>; // The actual submitted data (fieldId: value)
} 