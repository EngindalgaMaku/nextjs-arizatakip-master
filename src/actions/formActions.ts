'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
// import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  Form,
  FormSchema,
  FormValues,
  FormValuesSchema,
  FormField, // Import FormField type
  FormFieldValues,
  FormFieldValuesSchema,
  FormResponse
} from '@/types/forms';

/**
 * Fetch all forms.
 */
export async function fetchForms(): Promise<Form[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching forms:', error);
    throw error;
  }
  
  // Map snake_case to camelCase (ensure types match)
  const mappedData = data?.map(form => ({
      id: form.id,
      title: form.title,
      description: form.description,
      status: form.status,
      createdAt: form.created_at,
      updatedAt: form.updated_at,
  })) || [];

  // Optional validation
  const parseResult = z.array(FormSchema.omit({ fields: true })).safeParse(mappedData);
  if (!parseResult.success) {
    console.error('Fetched forms data validation failed:', parseResult.error);
    return [];
  }

  return parseResult.data as Form[];
}

/**
 * Fetch a single form by ID, including its fields.
 * Accepts an optional Supabase client instance, creates one if not provided.
 */
export async function fetchFormById(
  id: string,
): Promise<Form | null> {
  // Use passed client or create a new one if not provided
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('forms')
    .select(`
      *,
      form_fields ( * )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching form ${id}:`, error);
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  // Map form data
  const mappedForm = {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      fields: [] // Initialize fields array
  };

  // Map fields data (sort by display_order)
  if (data.form_fields && Array.isArray(data.form_fields)) {
      // Define expected structure of raw field data from Supabase
      type RawFormField = { 
         id: string; form_id: string; label: string; field_type: string; 
         options: any; is_required: boolean; display_order: number; 
         created_at: string; updated_at: string;
      };
      mappedForm.fields = data.form_fields
          .map((field: RawFormField) => ({ // Explicitly type the field parameter
              id: field.id,
              formId: field.form_id,
              label: field.label,
              fieldType: field.field_type,
              options: field.options,
              isRequired: field.is_required,
              displayOrder: field.display_order,
              createdAt: field.created_at,
              updatedAt: field.updated_at,
          }))
          // Provide explicit types for sort parameters
          .sort((a: FormField, b: FormField) => a.displayOrder - b.displayOrder); 
  }

  // Validate the final structure
  const parseResult = FormSchema.safeParse(mappedForm);
   if (!parseResult.success) {
      console.error('Fetched form by ID data validation failed:', parseResult.error);
      return null;
  }

  return parseResult.data;
}

/**
 * Fetch a single PUBLISHED form by ID, including its fields.
 * This is intended for the public-facing form page.
 */
export async function fetchPublishedFormById(id: string): Promise<Form | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('forms')
    .select(`
      *,
      form_fields ( * )
    `)
    .eq('id', id)
    .eq('status', 'published') // Ensure form is published
    .single();

  if (error) {
    // If not found (PGRST116) or not published, return null silently for public page
    if (error.code === 'PGRST116') {
        console.log(`Published form not found for ID: ${id}`);
        return null;
    } 
    console.error(`Error fetching published form ${id}:`, error);
    // Optionally throw for other unexpected errors, or return null
    return null; 
  }

  // Map form data (same mapping logic as fetchFormById)
  const mappedForm = {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      fields: [] // Initialize fields array
  };

  // Map fields data (sort by display_order)
  if (data.form_fields && Array.isArray(data.form_fields)) {
       type RawFormField = { 
         id: string; form_id: string; label: string; field_type: string; 
         options: any; is_required: boolean; display_order: number; 
         created_at: string; updated_at: string;
      };
      mappedForm.fields = data.form_fields
          .map((field: RawFormField) => ({
              id: field.id,
              formId: field.form_id,
              label: field.label,
              fieldType: field.field_type,
              options: field.options,
              isRequired: field.is_required,
              displayOrder: field.display_order,
              createdAt: field.created_at,
              updatedAt: field.updated_at,
          }))
          .sort((a: FormField, b: FormField) => a.displayOrder - b.displayOrder);
  }

  // Validate the final structure
   const parseResult = FormSchema.safeParse(mappedForm);
   if (!parseResult.success) {
      console.error('Fetched published form data validation failed:', parseResult.error);
      return null;
  }

  return parseResult.data;
}

/**
 * Create a new form.
 */
export async function createForm(payload: FormValues): Promise<{ success: boolean; form?: Form; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const parse = FormValuesSchema.safeParse(payload);
  if (!parse.success) {
    return { 
      success: false, 
      error: parse.error?.errors.map((e: { message: string }) => e.message).join(', ') || 'Invalid form data'
    };
  }

  const formData = {
    title: parse.data.title,
    description: parse.data.description,
    status: parse.data.status || 'draft',
  };

  try {
    const { data, error } = await supabase
      .from('forms')
      .insert(formData)
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating form:', error?.message);
      return { success: false, error: error?.message || 'Form oluşturulamadı.' };
    }
    // revalidatePath(FORMS_PATH);
    // Map back to camelCase before returning
     const createdForm = {
        id: data.id,
        title: data.title,
        description: data.description,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
    return { success: true, form: createdForm as Form };
  } catch (err) {
    console.error('createForm error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Update an existing form (title, description, status).
 */
export async function updateForm(id: string, payload: FormValues): Promise<{ success: boolean; form?: Form; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const parse = FormValuesSchema.safeParse(payload);
  if (!parse.success) {
    return { 
      success: false, 
      error: parse.error?.errors.map((e: { message: string }) => e.message).join(', ') || 'Invalid form data'
    };
  }

  const formData = {
    title: parse.data.title,
    description: parse.data.description,
    status: parse.data.status,
    // updated_at is handled by the trigger
  };

  try {
    const { data, error } = await supabase
      .from('forms')
      .update(formData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating form:', error?.message);
      return { success: false, error: error?.message || 'Form güncellenemedi.' };
    }
    // revalidatePath(FORMS_PATH);
    // revalidatePath(`${FORMS_PATH}/${id}/edit`); // Revalidate edit page too
     // Map back to camelCase
      const updatedForm = {
        id: data.id,
        title: data.title,
        description: data.description,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };
    return { success: true, form: updatedForm as Form };
  } catch (err) {
    console.error('updateForm error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Delete a form by ID.
 */
export async function deleteForm(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();

  try {
    // Note: ON DELETE CASCADE should handle deleting related fields and submissions
    const { error } = await supabase
      .from('forms')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting form:', error);
      return { success: false, error: error.message };
    }
    // revalidatePath(FORMS_PATH);
    return { success: true };
  } catch (err) {
    console.error('deleteForm error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// --- Form Field Actions --- 

/**
 * Add a new field to a specific form.
 */
export async function addFormField(
  formId: string,
  payload: FormFieldValues
): Promise<{ success: boolean; field?: FormField; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const parse = FormFieldValuesSchema.safeParse(payload);
  if (!parse.success) {
    return { 
      success: false, 
      error: parse.error?.errors.map((e: { message: string }) => e.message).join(', ') || 'Invalid field data'
    };
  }

  try {
    // 1. Find the current maximum display_order for this form
    const { data: maxOrderData, error: maxOrderError } = await supabase
      .from('form_fields')
      .select('display_order')
      .eq('form_id', formId)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxOrderError) {
      console.error('Error fetching max display_order for fields:', maxOrderError);
      return { success: false, error: 'Alan sıra numarası alınırken hata oluştu.' };
    }
    const nextOrder = (maxOrderData?.display_order || 0) + 1;

    // 2. Prepare field data
    const fieldData = {
      form_id: formId,
      label: parse.data.label,
      field_type: parse.data.fieldType,
      options: parse.data.options || null,
      is_required: parse.data.isRequired,
      display_order: nextOrder, // Set calculated order
    };

    // 3. Insert the new field
    const { data, error } = await supabase
      .from('form_fields')
      .insert(fieldData)
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating form field:', error?.message);
      return { success: false, error: error?.message || 'Form alanı oluşturulamadı.' };
    }

    // revalidatePath(`${FORMS_PATH}/${formId}/edit`); // Revalidate form edit page

    // Map back to camelCase
    const createdField: FormField = {
        id: data.id,
        formId: data.form_id,
        label: data.label,
        fieldType: data.field_type,
        options: data.options,
        isRequired: data.is_required,
        displayOrder: data.display_order,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };

    return { success: true, field: createdField };

  } catch (err) {
    console.error('addFormField error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Update an existing form field.
 */
export async function updateFormField(
  fieldId: string,
  payload: FormFieldValues
): Promise<{ success: boolean; field?: FormField; error?: string }> {
  // Remove destructuring - displayOrder is no longer in FormFieldValues
  // const { displayOrder, ...restPayload } = payload; 
  const supabase = await createSupabaseServerClient();
  const parse = FormFieldValuesSchema.safeParse(payload);
  if (!parse.success) {
    return { 
      success: false, 
      error: parse.error?.errors.map((e: { message: string }) => e.message).join(', ') || 'Invalid field data'
    };
  }

  const fieldData = {
    label: parse.data.label,
    field_type: parse.data.fieldType,
    options: parse.data.options || null,
    is_required: parse.data.isRequired,
    // display_order is not updated here
  };

  try {
     // Fetch form_id for revalidation
     const { data: existingField, error: fetchError } = await supabase
        .from('form_fields')
        .select('form_id')
        .eq('id', fieldId)
        .single();
        
     if (fetchError || !existingField) {
         console.error('Error fetching field details for revalidation:', fetchError);
         // Optionally return error if field not found
     }

    const { data, error } = await supabase
      .from('form_fields')
      .update(fieldData)
      .eq('id', fieldId)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating form field:', error?.message);
      return { success: false, error: error?.message || 'Form alanı güncellenemedi.' };
    }

    if (existingField?.form_id) {
       // revalidatePath(`${FORMS_PATH}/${existingField.form_id}/edit`);
    }

     // Map back to camelCase
    const updatedField: FormField = {
        id: data.id,
        formId: data.form_id,
        label: data.label,
        fieldType: data.field_type,
        options: data.options,
        isRequired: data.is_required,
        displayOrder: data.display_order,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
    };

    return { success: true, field: updatedField };

  } catch (err) {
    console.error('updateFormField error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Delete a form field by ID.
 */
export async function deleteFormField(fieldId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  try {
    // Fetch form_id for revalidation before deleting
    const { data: existingField, error: fetchError } = await supabase
      .from('form_fields')
      .select('form_id')
      .eq('id', fieldId)
      .single();

     if (fetchError && fetchError.code !== 'PGRST116') { 
         console.error('Error fetching field details for revalidation (delete):', fetchError);
     }

    const { error } = await supabase
      .from('form_fields')
      .delete()
      .eq('id', fieldId);

    if (error) {
      console.error('Error deleting form field:', error);
      return { success: false, error: error.message };
    }

     if (existingField?.form_id) {
       // revalidatePath(`${FORMS_PATH}/${existingField.form_id}/edit`);
       // TODO: Consider re-ordering remaining fields after deletion?
    }

    return { success: true };
  } catch (err) {
    console.error('deleteFormField error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/*
// --- TODO: Implement Field Reordering Action ---
export async function updateFormFieldOrder(formId: string, orderedFieldIds: string[]): Promise<{ success: boolean; error?: string }> {
  // This requires careful implementation, potentially using a transaction
  // or multiple updates to set the display_order for each field based on its index in the array.
  try {
     // Example pseudo-code (needs proper Supabase transaction/batching):
     // Start transaction
     // For each fieldId in orderedFieldIds at index i:
     //   UPDATE form_fields SET display_order = i + 1 WHERE id = fieldId AND form_id = formId
     // Commit transaction
     
     revalidatePath(`${FORMS_PATH}/${formId}/edit`);
     return { success: true };
  } catch (err) {
     // Rollback transaction
     console.error('updateFormFieldOrder error:', err);
     return { success: false, error: "Alanlar yeniden sıralanırken hata oluştu." };
  }
}
*/

/**
 * Submits a response for a public form.
 * Note: This still uses its own client as it's called from client-side mutation
 */
export async function submitFormResponse(
    formId: string,
    responseData: Record<string, any> // Raw submitted data
): Promise<{ success: boolean; error?: string }> {
    // No user context needed here as it's a public submission
    // We'll use the service role key for insertion if direct client insert isn't allowed by RLS
    // Or configure RLS to allow public inserts without needing service role.
    // For simplicity, let's assume RLS allows public inserts for now.

    const supabase = await createSupabaseServerClient();

    // Basic validation
    if (!formId || !responseData || Object.keys(responseData).length === 0) {
        return { success: false, error: 'Geçersiz form verisi.' };
    }

    try {
        // Optional: Fetch the form definition to potentially validate responseData against fields
        // This adds overhead and complexity, especially if fields can change.
        // For now, we'll just save the raw data.

        const { error } = await supabase
            .from('form_responses')
            .insert({
                form_id: formId,
                response_data: responseData,
            });

        if (error) {
            console.error('Error inserting form response:', error);
            // Provide a more generic error to the client
            return { success: false, error: 'Form yanıtı kaydedilirken bir hata oluştu.' };
        }

        return { success: true };

    } catch (err) {
        console.error('Unexpected error submitting form response:', err);
        return { success: false, error: 'Beklenmedik bir hata oluştu.' };
    }
}

/**
 * Fetches all responses for a specific form.
 * Accepts an optional Supabase client instance, creates one if not provided.
 */
export async function fetchFormResponses(
  formId: string,
): Promise<FormResponse[]> {
    // const supabase = supabaseClient || createServerActionClient({ cookies });
    const supabase = await createSupabaseServerClient();

    if (!formId) {
        console.error('fetchFormResponses called without formId');
        return [];
    }

    try {
        const { data, error } = await supabase // Use the determined client
            .from('form_responses')
            .select('*')
            .eq('form_id', formId)
            .order('submitted_at', { ascending: false });

        if (error) {
            console.error(`Error fetching responses for form ${formId}:`, error);
            // Depending on RLS, this might error if the admin doesn't have SELECT rights.
            // Ensure admin role has SELECT permission on form_responses.
            return []; // Return empty array on error
        }

        // Ensure data matches the FormResponse interface (no mapping needed if DB columns match)
        // Add validation if necessary
        return data as FormResponse[];

    } catch (err) {
        console.error('Unexpected error fetching form responses:', err);
        return [];
    }
}

/**
 * Deletes a specific form response by its ID.
 * @param responseId The ID of the response to delete.
 * @returns An object indicating success or failure.
 */
export async function deleteFormResponse(responseId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createSupabaseServerClient();

    if (!responseId) {
        return { success: false, error: 'Silinecek yanıt IDsi belirtilmedi.' };
    }

    try {
        const { error } = await supabase
            .from('form_responses')
            .delete()
            .eq('id', responseId);

        if (error) {
            console.error(`Error deleting response ${responseId}:`, error);
            // Ensure admin role has DELETE permission on form_responses.
            return { success: false, error: 'Yanıt silinirken bir hata oluştu.' };
        }

        // Optionally, revalidate the responses page path if needed, 
        // but client-side invalidation might be sufficient.
        // Example: revalidatePath(`/dashboard/forms/[formId]/responses`); 

        return { success: true };

    } catch (err) {
        console.error('Unexpected error deleting form response:', err);
        return { success: false, error: 'Yanıt silinirken beklenmedik bir hata oluştu.' };
    }
}

