'use client';

import React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/Modal';
import { StudentSchema, Guardian } from '@/types/students';
import type { z } from 'zod';

// Base form values: includes the guardians array
type StudentFormValues = z.input<typeof StudentSchema>;

interface StudentFormModalProps {
  initialData?: StudentFormValues;
  onSubmit: (data: StudentFormValues) => void;
  onClose: () => void;
  loading?: boolean;
}

export function StudentFormModal({ initialData, onSubmit, onClose, loading = false }: StudentFormModalProps) {
  // Ensure defaults only contain valid schema fields
  const emptyDefaults: Partial<StudentFormValues> = { // Use Partial for potentially incomplete initial data
    name: '', email: '', birthDate: '', phone: '',
    gender: 'male', schoolNumber: '', status: 'active',
    guardians: [] 
  };
  
  // Merge initialData carefully if provided
  const mergedDefaults = initialData 
    ? { ...emptyDefaults, ...initialData, guardians: initialData.guardians ?? [] } 
    : emptyDefaults;

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<StudentFormValues>({
    resolver: zodResolver(StudentSchema),
    defaultValues: mergedDefaults as StudentFormValues, // Cast needed after merge
  });

  const { fields, append, remove } = useFieldArray({
    control, 
    name: 'guardians' 
  });

  const isBusy = loading || isSubmitting;

  return (
    <Modal isOpen onClose={onClose} title={initialData ? 'Öğrenci Düzenle' : 'Yeni Öğrenci'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <fieldset disabled={isBusy} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ad Soyad</label>
              <input
                autoFocus
                type="text"
                placeholder="Ad Soyad"
                {...register('name')}
                aria-invalid={errors.name ? 'true' : 'false'}
                className={`mt-1 block w-full rounded p-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cinsiyet</label>
              <select
                {...register('gender')}
                className="mt-1 block w-full border rounded p-2"
              >
                <option value="">Seçiniz</option>
                <option value="male">Erkek</option>
                <option value="female">Kadın</option>
                <option value="other">Diğer</option>
              </select>
              {errors.gender && <p className="text-red-600 text-sm">{errors.gender.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Okul No</label>
              <input
                type="text"
                {...register('schoolNumber')}
                className={`mt-1 block w-full rounded p-2 border ${errors.schoolNumber ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.schoolNumber && <p className="text-red-600 text-sm">{errors.schoolNumber.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">E-posta</label>
              <input
                type="email"
                placeholder="E-posta"
                {...register('email')}
                aria-invalid={errors.email ? 'true' : 'false'}
                className={`mt-1 block w-full rounded p-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Doğum Tarihi</label>
              <input
                type="date"
                {...register('birthDate')}
                className="mt-1 block w-full rounded p-2 border-gray-300"
              />
              {errors.birthDate && <p className="text-red-600 text-sm">{errors.birthDate.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cep Telefonu</label>
              <input
                type="tel"
                placeholder="(5XX) XXX XX XX"
                {...register('phone')}
                aria-invalid={errors.phone ? 'true' : 'false'}
                className={`mt-1 block w-full rounded p-2 border ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.phone && <p className="text-red-600 text-sm">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Durum</label>
              <select
                {...register('status')}
                className="mt-1 block w-full border rounded p-2"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset disabled={isBusy} className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900">Veli Bilgileri</h3>
          {fields.map((field, index) => (
            <div key={field.id} className="p-3 border rounded space-y-3 relative">
              <button
                type="button"
                onClick={() => remove(index)}
                className="absolute top-1 right-1 text-red-500 hover:text-red-700"
                aria-label="Veliyi Kaldır"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Yakınlık</label>
                  <input
                    type="text"
                    placeholder="Anne, Baba, Diğer..."
                    {...register(`guardians.${index}.relationship` as const)}
                    className={`mt-1 block w-full rounded p-2 border ${errors.guardians?.[index]?.relationship ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.guardians?.[index]?.relationship && (
                    <p className="text-red-600 text-sm">{errors.guardians?.[index]?.relationship?.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Veli Ad Soyad</label>
                  <input
                    type="text"
                    {...register(`guardians.${index}.name` as const)}
                    className={`mt-1 block w-full rounded p-2 border ${errors.guardians?.[index]?.name ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.guardians?.[index]?.name && (
                    <p className="text-red-600 text-sm">{errors.guardians?.[index]?.name?.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Veli Cep Telefonu</label>
                  <input
                    type="tel"
                    placeholder="+90..."
                    {...register(`guardians.${index}.phone` as const)}
                    className={`mt-1 block w-full rounded p-2 border ${errors.guardians?.[index]?.phone ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.guardians?.[index]?.phone && (
                    <p className="text-red-600 text-sm">{errors.guardians?.[index]?.phone?.message}</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => append({ relationship: '', name: '', phone: '' })}
            disabled={isBusy}
            className="px-3 py-1 border border-dashed border-gray-400 rounded text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            + Veli Ekle
          </button>
          {errors.guardians?.root && <p className="text-red-600 text-sm">{errors.guardians.root.message}</p>}
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