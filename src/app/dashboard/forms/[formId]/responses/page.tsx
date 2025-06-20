import React from 'react';
import { fetchFormResponses, fetchFormById } from '@/actions/formActions';
import { FormResponsesTable } from '@/components/forms/FormResponsesTable';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface FormResponsesPageProps {
  params: { formId: string };
}

// This is a Server Component
export default async function FormResponsesPage({ params }: FormResponsesPageProps) {
  const { formId } = params;

  // Fetch responses and form details sequentially - no need to pass client anymore
  const responses = await fetchFormResponses(formId); // <<< Remove supabase client
  const form = await fetchFormById(formId);      // <<< Remove supabase client

  const formTitle = form ? form.title : 'Form Yanıtları';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <Link href={`/dashboard/forms/${formId}/edit`} className="text-sm text-gray-600 hover:text-gray-800 inline-flex items-center mb-1">
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Forma Geri Dön
           </Link>
           <h1 className="text-2xl font-semibold text-gray-800">{formTitle} - Yanıtlar ({responses.length})</h1>
        </div>
         {/* Add export button or other actions here if needed */}
      </div>

      {/* Display the table, passing form fields and formId */}
      <FormResponsesTable
         responses={responses}
         formFields={form?.fields || []}
         formId={formId}
      />

    </div>
  );
} 