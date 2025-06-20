'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/Modal';
import { BranchFormValues, BranchFormSchema } from '@/types/branches';

interface BranchFormModalProps {
  isOpen: boolean;
  onSubmit: (data: BranchFormValues) => void;
  onClose: () => void;
  loading?: boolean;
}

export function BranchFormModal({ isOpen, onSubmit, onClose, loading = false }: BranchFormModalProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<BranchFormValues>({
    resolver: zodResolver(BranchFormSchema),
    defaultValues: {
      name: '',
    },
  });

  const handleClose = () => {
    reset(); // Reset form on close
    onClose();
  };

  const isBusy = loading || isSubmitting;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Yeni Branş Ekle">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <fieldset disabled={isBusy} className="space-y-4">
          <div>
            <label htmlFor="branchName" className="block text-sm font-medium text-gray-700">Branş Adı</label>
            <input
              id="branchName"
              autoFocus
              type="text"
              placeholder="Branş adı (örn: Bilişim Teknolojileri)"
              {...register('name')}
              aria-invalid={errors.name ? 'true' : 'false'}
              className={`mt-1 block w-full rounded p-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
          </div>
        </fieldset>
        <div className="flex justify-end space-x-2 pt-4">
          <button type="button" onClick={handleClose} disabled={isBusy} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50">
            İptal
          </button>
          <button type="submit" disabled={isBusy} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
            {isBusy ? 'Ekleniyor...' : 'Ekle'}
          </button>
        </div>
      </form>
    </Modal>
  );
} 