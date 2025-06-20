'use client';

import React, { useState } from 'react';
import { FormResponse, FormField } from '@/types/forms';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale'; // Import Turkish locale
import { EyeIcon, CodeBracketIcon, TrashIcon } from '@heroicons/react/24/outline';
import Modal from '@/components/Modal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteFormResponse } from '@/actions/formActions';
import toast from 'react-hot-toast';

interface FormResponsesTableProps {
  responses: FormResponse[];
  formFields: FormField[]; // Add formFields prop
  formId: string; // Add formId prop for query invalidation
}

// Helper function to render response value nicely
function renderValue(value: any): React.ReactNode {
  if (value === null || typeof value === 'undefined' || value === '') {
    return <span className="text-gray-500 italic">Boş</span>;
  }
  if (typeof value === 'boolean') {
    return value ? 'Evet' : 'Hayır';
  }
  if (Array.isArray(value)) {
    return value.join(', '); // Simple join for arrays (e.g., checkboxes)
  }
  if (typeof value === 'object') {
    // Handle specific objects or stringify as fallback
    return JSON.stringify(value);
  }
  return String(value);
}

export function FormResponsesTable({ responses, formFields, formId }: FormResponsesTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResponseData, setSelectedResponseData] = useState<Record<string, any> | null>(null);
  const queryClient = useQueryClient();

  const openModal = (data: Record<string, any>) => {
    setSelectedResponseData(data);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedResponseData(null);
  };

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteFormResponse,
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Yanıt başarıyla silindi.');
        // Invalidate the query for this specific form's responses
        queryClient.invalidateQueries({ queryKey: ['formResponses', formId] });
      } else {
        toast.error(`Yanıt silinemedi: ${data.error}`);
      }
    },
    onError: (error) => {
      toast.error(`Yanıt silinirken bir hata oluştu: ${error.message}`);
    },
  });

  const handleDelete = (responseId: string) => {
    if (window.confirm('Bu yanıtı silmek istediğinizden emin misiniz?')) {
      deleteMutation.mutate(responseId);
    }
  };

  // Create a map for quick field lookup by ID
  const fieldMap = new Map(formFields.map(field => [field.id, field]));

  return (
    <>
      <div className="overflow-x-auto shadow border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gönderim Zamanı
              </th>
              {/* Optionally add more columns derived from response_data if needed */}
              {/* For example, if you always collect 'name' or 'email' */}
              {/* <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th> */}
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {responses.map((response) => (
              <tr key={response.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {format(new Date(response.submitted_at), 'PPPpp', { locale: tr })}
                </td>
                {/* Example column derived from data */}
                {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{response.response_data?.name || '-'}</td> */}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right space-x-2">
                  <button
                    onClick={() => openModal(response.response_data)}
                    className="text-indigo-600 hover:text-indigo-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400 inline-flex items-center"
                    title="Yanıt Verisini Görüntüle"
                  >
                    <CodeBracketIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(response.id)}
                    disabled={deleteMutation.isPending}
                    className="text-red-600 hover:text-red-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-400 inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Yanıtı Sil"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
            {responses.length === 0 && (
              <tr>
                <td colSpan={2} className="text-center py-10 text-gray-500">
                  Bu form için kayıtlı yanıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal to display FORMATTED data */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Yanıt Detayları">
        {selectedResponseData && (
          <div className="space-y-3 text-sm">
            {formFields.length > 0 ? (
               // Map over the original form fields to maintain order and show all fields
              formFields.map((field) => {
                 const value = selectedResponseData[field.id];
                 return (
                   <div key={field.id} className="border-b border-gray-200 pb-2 last:border-b-0">
                     <p className="font-medium text-gray-700">{field.label}:</p>
                     <p className="text-gray-600 mt-1">{renderValue(value)}</p>
                   </div>
                 );
              })
            ) : (
              // Fallback if formFields prop wasn't passed or is empty
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                 {JSON.stringify(selectedResponseData, null, 2)}
              </pre>
            )}
          </div>
        )}
      </Modal>
    </>
  );
} 