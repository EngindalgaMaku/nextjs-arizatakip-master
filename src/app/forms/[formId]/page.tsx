'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchPublishedFormById, submitFormResponse } from '@/actions/formActions';
import { Form, FormField } from '@/types/forms';
import { useForm, Controller } from 'react-hook-form';
import { QueryProvider } from "@/providers/QueryProvider";
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Define response type for form submission
interface FormSubmitResponse {
  success: boolean;
  error?: string;
}

// Helper component to render individual fields
type RenderFormFieldProps = {
  field: FormField;
  register: any;
  errors: any;
};

const RenderFormField: React.FC<RenderFormFieldProps> = ({ field, register, errors }) => {
    const fieldId = field.id; // Use ID for registration name
    const label = (
        <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 mb-1">
            {field.label} {field.isRequired ? <span className="text-red-500">*</span> : ''}
        </label>
    );

    let inputElement;

    switch (field.fieldType) {
        case 'text':
        case 'email':
        case 'number':
        case 'date':
            inputElement = (
                 <input
                    id={fieldId}
                    type={field.fieldType}
                    {...register(fieldId, { required: field.isRequired })}
                    className={`block w-full rounded p-2 border ${errors[fieldId] ? 'border-red-500' : 'border-gray-300'}`}
                 />
            );
            break;
        case 'textarea':
             inputElement = (
                 <textarea
                    id={fieldId}
                    rows={4}
                    {...register(fieldId, { required: field.isRequired })}
                    className={`block w-full rounded p-2 border ${errors[fieldId] ? 'border-red-500' : 'border-gray-300'}`}
                 />
             );
             break;
        case 'select':
            inputElement = (
                 <select
                    id={fieldId}
                    {...register(fieldId, { required: field.isRequired })}
                    className={`block w-full rounded p-2 border ${errors[fieldId] ? 'border-red-500' : 'border-gray-300'}`}
                 >
                    <option value="">-- Seçiniz --</option>
                    {field.options?.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                 </select>
            );
            break;
         case 'radio':
            inputElement = (
                <div className="space-y-2 mt-1">
                   {field.options?.map(option => (
                     <div key={option.value} className="flex items-center">
                       <input
                         id={`${fieldId}-${option.value}`}
                         type="radio"
                         value={option.value}
                         {...register(fieldId, { required: field.isRequired })}
                         className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 mr-2"
                       />
                       <label htmlFor={`${fieldId}-${option.value}`} className="text-sm text-gray-700">
                         {option.label}
                       </label>
                     </div>
                   ))}
                 </div>
            );
            break;
         case 'checkbox': // Assuming multiple checkboxes for a single question if options exist
            inputElement = (
                <div className="space-y-2 mt-1">
                   {field.options?.map(option => (
                     <div key={option.value} className="flex items-center">
                       <input
                         id={`${fieldId}-${option.value}`}
                         type="checkbox"
                         value={option.value}
                         // For multiple checkboxes with the same name, validation needs refinement
                         // Maybe use Controller or a different registration approach if multi-select is needed
                         {...register(`${fieldId}.${option.value}`, { required: false })} // Register each option separately for now
                         className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mr-2"
                       />
                       <label htmlFor={`${fieldId}-${option.value}`} className="text-sm text-gray-700">
                         {option.label}
                       </label>
                     </div>
                   ))}
                 </div>
            );
            // If no options, maybe render a single checkbox? Needs clarification.
            // For now, checkbox type requires options based on schema.
            break;
        default:
            inputElement = <p className="text-xs text-red-500">Unsupported field type: {field.fieldType}</p>;
    }

    return (
        <div>
            {label}
            {inputElement}
            {errors[fieldId] && <p className="text-red-600 text-sm mt-1">Bu alan zorunludur.</p>}
        </div>
    );
}

export default function PublicFormPage() {
  const params = useParams();
  const formId = params.formId as string;

  // Pass formId to FormContent
  return (
    <QueryProvider>
      <FormContent formId={formId} />
    </QueryProvider>
  );
}

// Extracted form content logic into a separate component to use hooks inside the provider
function FormContent({ formId }: { formId: string }) {
  // Add state to track successful submission
  const [isSubmittedSuccessfully, setIsSubmittedSuccessfully] = useState(false);

  // Initialize useForm here inside the component that needs it
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  // Fetch PUBLISHED Form Data
  const { data: form, isLoading, error } = useQuery<Form | null>({
    queryKey: ['publishedForm', formId],
    queryFn: () => fetchPublishedFormById(formId),
    enabled: !!formId,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Define the mutation for submitting the form
  const submitMutation = useMutation({
    mutationFn: (data: Record<string, any>) => submitFormResponse(formId, data),
    onSuccess: (result: FormSubmitResponse) => {
      if (result.success) {
        toast.success('Form başarıyla gönderildi!');
        reset(); // Reset the form fields
        setIsSubmittedSuccessfully(true); // <-- Set state to true on success
      } else {
        // Handle failure case returned by the server action
        toast.error(result.error || 'Form gönderilirken bir hata oluştu.');
      }
    },
    onError: (error) => {
      // Handle unexpected errors during the mutation
      console.error("Form submission mutation error:", error);
      toast.error('Form gönderilirken beklenmedik bir hata oluştu.');
    },
  });

  // Update onSubmit to use the mutation
  const onSubmit = (data: any) => {
    console.log("Form Data Submitted:", data);
    submitMutation.mutate(data); // Trigger the mutation
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <p className="text-gray-600">Form yükleniyor...</p>
      </div>
    );
  }

  if (error) {
      console.error("Error loading public form:", error);
     return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <p className="text-red-600">Form yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>
      </div>
    );
  }
  
  if (!form) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <p className="text-red-500 font-semibold">Form bulunamadı veya yayında değil.</p>
      </div>
    );
  }

  if (isSubmittedSuccessfully) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-semibold text-green-600 mb-4">Başarılı!</h2>
          <p className="text-gray-700">Formunuz başarıyla gönderildi.</p>
          {/* Optional: Add a button to submit another response or go back */}
        </div>
      </div>
    );
  }

  // Wrap the actual form rendering in the centering container
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4"> {/* Centering container */} 
      <div className="w-full max-w-2xl p-6 md:p-8 bg-white rounded-lg shadow-md"> {/* Form container */} 
        <h1 className="text-2xl font-bold mb-2 text-center">{form.title}</h1>
        <p className="text-gray-600 mb-6 text-center">{form.description}</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {(form.fields || []).length > 0 ? (
            (form.fields || []).map((field) => (
              <RenderFormField 
                key={field.id} 
                field={field} 
                register={register} 
                errors={errors} 
              />
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">Bu formda henüz hiç alan bulunmamaktadır.</p>
          )}
          <button 
            type="submit"
            disabled={submitMutation.isPending}
            className="w-full flex justify-center items-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
          >
            {submitMutation.isPending ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Gönderiliyor...
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                Gönder
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
} 