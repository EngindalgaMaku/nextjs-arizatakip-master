'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchForms, createForm, deleteForm } from '@/actions/formActions';
import { FormsTable } from '@/components/forms/FormsTable';
import { FormFormModal } from '@/components/forms/FormFormModal';
import { Form, FormValues } from '@/types/forms';
import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

export default function FormsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  // const [editingForm, setEditingForm] = useState<Form | null>(null); // Edit handled by navigation for now

  // Fetch Forms
  const { data: forms = [], isLoading, error } = useQuery<Form[]>({ 
    queryKey: ['forms'],
    queryFn: fetchForms,
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: createForm,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['forms'] });
        toast.success('Form başarıyla oluşturuldu!');
        setIsModalOpen(false);
      } else {
        toast.error(`Form oluşturulamadı: ${data.error}`);
      }
    },
    onError: (err) => {
      toast.error(`Form oluşturulamadı: ${err.message}`);
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteForm,
    onSuccess: (data, formId) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['forms'] });
        toast.success('Form başarıyla silindi!');
      } else {
        toast.error(`Form silinemedi: ${data.error}`);
      }
    },
    onError: (err) => {
       toast.error(`Form silinemedi: ${err.message}`);
    },
  });

  const handleAddForm = () => {
    // setEditingForm(null);
    setIsModalOpen(true);
  };

  const handleDeleteForm = (id: string) => {
    if (window.confirm('Bu formu ve ilişkili tüm alanlarını/gönderimlerini silmek istediğinizden emin misiniz?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormSubmit = (data: FormValues) => {
    // Currently only handles create, update is via navigation
    createMutation.mutate(data);
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Form Yönetimi</h1>
        <button
          onClick={handleAddForm}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Yeni Form Ekle
        </button>
      </div>

      {isLoading && <p>Formlar yükleniyor...</p>}
      {error && <p className="text-red-600">Formlar yüklenirken bir hata oluştu: {(error as Error).message}</p>}

      {!isLoading && !error && (
        <FormsTable 
          forms={forms}
          onEdit={() => { /* Handled by link in table */ }}
          onDelete={handleDeleteForm}
        />
      )}

      {/* Use the actual FormFormModal */}
      <FormFormModal
         isOpen={isModalOpen}
         onClose={() => setIsModalOpen(false)}
         onSubmit={handleFormSubmit}
         // Pass initialData={editingForm} if implementing edit via modal later
         loading={createMutation.isPending}
       />
    </div>
  );
} 