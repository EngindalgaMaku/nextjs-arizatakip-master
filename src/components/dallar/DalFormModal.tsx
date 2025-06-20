'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/Modal';
import { DalFormSchema, DalFormValues, Dal } from '@/types/dallar';
import { Controller } from 'react-hook-form';

// Define a simple type for the branches passed as props
interface BranchSelectItem {
  id: string;
  name: string;
}

interface DalFormModalProps {
  initialData?: Dal; // Pass full Dal object for editing context
  availableBranches: BranchSelectItem[]; // <<< Add prop for branches
  onSubmit: (data: DalFormValues) => void;
  onClose: () => void;
  loading?: boolean;
}

export function DalFormModal({
  initialData,
  availableBranches, // <<< Destructure prop
  onSubmit,
  onClose,
  loading = false
}: DalFormModalProps) {
  const isEditing = !!initialData?.id;
  const modalTitle = isEditing ? 'Dalı Düzenle' : 'Yeni Dal Ekle';

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<DalFormValues>({
    resolver: zodResolver(DalFormSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      branch_id: initialData?.branch_id ?? '', // Initialize with existing or empty
    },
  });

  const isBusy = loading || isSubmitting;

  return (
    <Modal isOpen onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <fieldset disabled={isBusy} className="space-y-4">
          {/* Branch Selection Dropdown */}
          <div>
            <label htmlFor="branch_id" className="block text-sm font-medium text-gray-700">Ana Dal</label>
            <Controller
              name="branch_id"
              control={control}
              render={({ field }) => (
                <select
                  id="branch_id"
                  {...field}
                  aria-invalid={errors.branch_id ? 'true' : 'false'}
                  className={`mt-1 block w-full rounded p-2 border ${errors.branch_id ? 'border-red-500' : 'border-gray-300'}`}
                  disabled={isEditing} // Optionally disable if editing (usually branch doesn't change)
                >
                  <option value="" disabled>-- Ana Dal Seçin --</option>
                  {availableBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.branch_id && <p className="text-red-600 text-sm">{errors.branch_id.message}</p>}
          </div>

          {/* Dal Adı */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Dal Adı</label>
            <input
              id="name"
              autoFocus
              type="text"
              placeholder="Örn: Bilişim Teknolojileri"
              {...register('name')}
              aria-invalid={errors.name ? 'true' : 'false'}
              className={`mt-1 block w-full rounded p-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Açıklama (Opsiyonel)</label>
            <textarea
              id="description"
              rows={3}
              placeholder="Dal hakkında kısa açıklama..."
              {...register('description')}
              className={`mt-1 block w-full rounded p-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.description && <p className="text-red-600 text-sm">{errors.description.message}</p>}
          </div>

        </fieldset>
        <div className="flex justify-end space-x-2 pt-4">
          <button type="button" onClick={onClose} disabled={isBusy} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50">
            İptal
          </button>
          <button type="submit" disabled={isBusy} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
            {isBusy ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  );
} 