'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/Modal';
import {
  FormValues,
  FormValuesSchema,
  FORM_STATUSES,
  FormStatus
} from '@/types/forms';

interface FormFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormValues) => void;
  initialData?: FormValues;
  loading?: boolean;
}

export function FormFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: FormFormModalProps) {
  const isEditing = !!initialData?.title; // Check if editing based on initialData presence
  const modalTitle = isEditing ? 'Formu Düzenle' : 'Yeni Form Ekle';

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(FormValuesSchema),
    defaultValues: initialData ?? {
      title: '',
      description: '',
      status: 'draft', // Default status
    },
  });

  const isBusy = loading || isSubmitting;

  if (!isOpen) return null; // Don't render if not open

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <fieldset disabled={isBusy} className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Form Başlığı</label>
            <input
              id="title"
              autoFocus
              type="text"
              {...register('title')}
              aria-invalid={errors.title ? 'true' : 'false'}
              className={`mt-1 block w-full rounded p-2 border ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.title && <p className="text-red-600 text-sm">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Açıklama (İsteğe Bağlı)</label>
            <textarea
              id="description"
              rows={3}
              {...register('description')}
              className={`mt-1 block w-full rounded p-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
            />
             {errors.description && <p className="text-red-600 text-sm">{errors.description.message}</p>}
          </div>

          {/* Status */}
          <div>
             <label htmlFor="status" className="block text-sm font-medium text-gray-700">Durum</label>
             <Controller
                name="status"
                control={control}
                defaultValue={initialData?.status || 'draft'}
                render={({ field }) => (
                    <select
                        id="status"
                        {...field}
                        className={`mt-1 block w-full rounded p-2 border ${errors.status ? 'border-red-500' : 'border-gray-300'}`}
                    >
                        {FORM_STATUSES.map((status) => (
                            <option key={status} value={status}>
                                {status === 'published' ? 'Yayında' : 'Taslak'}
                            </option>
                        ))}
                    </select>
                )}
            />
             {errors.status && <p className="text-red-600 text-sm">{errors.status.message}</p>}
          </div>

        </fieldset>
        <div className="flex justify-end space-x-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={isBusy}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {isBusy ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  );
} 