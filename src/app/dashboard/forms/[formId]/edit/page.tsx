'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFormById,
  updateForm,
  addFormField,
  updateFormField,
  deleteFormField,
} from '@/actions/formActions';
import {
  Form,
  FormValues,
  FormField,
  FormFieldValues, // Import FormFieldValues
} from '@/types/forms';
import { ArrowLeftIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { FormFormModal } from '@/components/forms/FormFormModal';
import { FormFieldEditorModal } from '@/components/forms/FormFieldEditorModal'; // Import field editor modal

export default function FormEditPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const formId = params.formId as string;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // State for Field Editor Modal
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);

  // Fetch Form Data (including fields)
  const { data: form, isLoading, error, refetch } = useQuery<Form | null>({
    queryKey: ['form', formId],
    queryFn: () => fetchFormById(formId),
    enabled: !!formId,
  });

  // Update Form Mutation (for title, description, status)
  const updateFormMutation = useMutation({
    mutationFn: (payload: FormValues) => updateForm(formId, payload),
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['form', formId] });
        queryClient.invalidateQueries({ queryKey: ['forms'] }); // Invalidate list view too
        toast.success('Form bilgileri güncellendi!');
        setIsEditModalOpen(false);
      } else {
        toast.error(`Form güncellenemedi: ${data.error}`);
      }
    },
    onError: (err) => {
      toast.error(`Form güncellenemedi: ${err.message}`);
    },
  });
  
  // --- Form Field Mutations ---
  const addFieldMutation = useMutation({
    mutationFn: (payload: FormFieldValues) => addFormField(formId, payload),
    onSuccess: (data) => {
      if (data.success) {
        // queryClient.invalidateQueries({ queryKey: ['form', formId] }); // Refetch handles this
        refetch(); // Refetch form data to get updated fields list
        toast.success('Alan başarıyla eklendi!');
        setIsFieldModalOpen(false);
      } else {
        toast.error(`Alan eklenemedi: ${data.error}`);
      }
    },
    onError: (err) => {
      toast.error(`Alan eklenemedi: ${err.message}`);
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: (vars: { fieldId: string; payload: FormFieldValues }) => updateFormField(vars.fieldId, vars.payload),
    onSuccess: (data) => {
      if (data.success) {
        refetch(); 
        toast.success('Alan başarıyla güncellendi!');
        setIsFieldModalOpen(false);
        setEditingField(null);
      } else {
        toast.error(`Alan güncellenemedi: ${data.error}`);
      }
    },
    onError: (err) => {
      toast.error(`Alan güncellenemedi: ${err.message}`);
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: deleteFormField,
    onSuccess: (data) => {
      if (data.success) {
        refetch();
        toast.success('Alan başarıyla silindi!');
      } else {
        toast.error(`Alan silinemedi: ${data.error}`);
      }
    },
    onError: (err) => {
      toast.error(`Alan silinemedi: ${err.message}`);
    },
  });
  // --- End Form Field Mutations ---

  const handleEditFormDetails = () => {
    setIsEditModalOpen(true);
  };

  // --- Field Handlers ---
  const handleAddField = () => {
    setEditingField(null); // Ensure not in editing mode
    setIsFieldModalOpen(true);
  };

  const handleEditField = (field: FormField) => {
    setEditingField(field); // Set the field to edit
    setIsFieldModalOpen(true);
  };

  const handleDeleteField = (fieldId: string) => {
    if (window.confirm('Bu alanı silmek istediğinizden emin misiniz?')) {
      deleteFieldMutation.mutate(fieldId);
    }
  };
  
  const handleFieldFormSubmit = (data: FormFieldValues) => {
      if (editingField?.id) {
          updateFieldMutation.mutate({ fieldId: editingField.id, payload: data });
      } else {
          addFieldMutation.mutate(data);
      }
  };
  // --- End Field Handlers ---

  if (isLoading) return <div className="container mx-auto p-6">Form yükleniyor...</div>;
  if (error) return <div className="container mx-auto p-6 text-red-600">Form yüklenirken hata: {(error as Error).message}</div>;
  if (!form) return <div className="container mx-auto p-6">Form bulunamadı.</div>;

  const fieldMutationLoading = addFieldMutation.isPending || updateFieldMutation.isPending || deleteFieldMutation.isPending;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Back Link and Title */}
      <div className="flex justify-between items-center">
        <Link
           href="/dashboard/forms"
           className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Form Listesine Dön
        </Link>
        <h1 className="text-2xl font-semibold text-gray-800">Form Düzenle: {form.title}</h1>
        <div /> {/* Spacer */} 
      </div>

      {/* Form Details Section */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex justify-between items-start">
             <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-1">Form Bilgileri</h2>
                <p className="text-sm text-gray-600 mb-2">{form.description || "Açıklama yok."}</p>
                <p className="text-sm text-gray-500">Durum: 
                   <span className={`ml-1 font-medium ${form.status === 'published' ? 'text-green-600' : 'text-yellow-600'}`}>
                       {form.status === 'published' ? 'Yayında' : 'Taslak'}
                   </span>
                </p>
             </div>
              <button 
                 onClick={handleEditFormDetails}
                 className="text-sm text-blue-600 hover:text-blue-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                 title="Form Bilgilerini Düzenle"
              >
                 <PencilIcon className="h-5 w-5" />
             </button>
          </div>
      </div>
      
       {/* Form Fields Section */}
       <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
           <div className="flex justify-between items-center mb-4">
               <h2 className="text-lg font-semibold text-gray-700">Form Alanları (Sorular)</h2>
               <button 
                  onClick={handleAddField}
                  disabled={fieldMutationLoading}
                  className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 text-sm"
               >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Alan Ekle
              </button>
           </div>
           
           {/* Fields List */}
           {form.fields && form.fields.length > 0 ? (
              <div className="space-y-3">
                  {form.fields.map((field, index) => (
                      <div key={field.id} className="flex items-center justify-between p-3 border rounded bg-gray-50">
                          <div>
                              <span className="font-medium text-gray-800">{index + 1}. {field.label}</span>
                              <span className="ml-2 text-xs text-gray-500">({field.fieldType}{field.isRequired ? ', Zorunlu' : ''})</span>
                              {/* TODO: Display options if applicable */} 
                          </div>
                          <div className="space-x-2">
                              {/* TODO: Add Reorder Buttons */}
                               <button disabled className="p-1 text-gray-400 cursor-not-allowed" title="Sırala (Yakında)">⇅</button> 
                              {/* Edit Button */}
                               <button 
                                   onClick={() => handleEditField(field)}
                                   disabled={fieldMutationLoading}
                                   className="p-1 text-blue-500 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                                   title="Düzenle">
                                   <PencilIcon className="h-4 w-4" />
                               </button>
                               {/* Delete Button */}
                               <button 
                                   onClick={() => handleDeleteField(field.id)}
                                   disabled={fieldMutationLoading}
                                   className="p-1 text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                                   title="Sil">
                                   <TrashIcon className="h-4 w-4" />
                               </button>
                          </div>
                      </div>
                  ))}
              </div>
           ) : (
              <p className="text-sm text-gray-500 italic text-center py-4">Bu form için henüz alan eklenmemiş.</p>
           )}
       </div>
       
       {/* Edit Form Details Modal */} 
       {isEditModalOpen && (
           <FormFormModal
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              onSubmit={updateFormMutation.mutate}
              initialData={{ title: form.title, description: form.description ?? '', status: form.status }} // Pass current data
              loading={updateFormMutation.isPending}
           />
       )}
       
       {/* Field Editor Modal */}
       {isFieldModalOpen && (
            <FormFieldEditorModal
                isOpen={isFieldModalOpen}
                onClose={() => { 
                    setIsFieldModalOpen(false); 
                    setEditingField(null); // Clear editing state on close
                }}
                onSubmit={handleFieldFormSubmit} 
                initialData={editingField ? { 
                    label: editingField.label,
                    fieldType: editingField.fieldType,
                    options: editingField.options,
                    isRequired: editingField.isRequired,
                 } : undefined} // Pass field data if editing
                loading={addFieldMutation.isPending || updateFieldMutation.isPending}
            />
       )}
       
    </div>
  );
} 