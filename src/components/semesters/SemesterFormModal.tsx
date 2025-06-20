'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Semester, SemesterFormValues, SemesterFormSchema } from '@/types/semesters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Modal from '@/components/Modal';

interface SemesterFormModalProps {
  initialData?: Semester;
  onSubmit: (data: SemesterFormValues) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function SemesterFormModal({
  initialData,
  onSubmit,
  onClose,
  isLoading = false,
}: SemesterFormModalProps) {
  const isEditing = !!initialData;
  const modalTitle = isEditing ? 'Sömestri Düzenle' : 'Yeni Sömestr Ekle';

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SemesterFormValues>({
    resolver: zodResolver(SemesterFormSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      start_date: initialData?.start_date ?? '',
      end_date: initialData?.end_date ?? '',
    },
  });

  const isBusy = isLoading || isSubmitting;

  return (
    <Modal isOpen onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <fieldset disabled={isBusy} className="space-y-4">
          <div>
            <Label htmlFor="name">Sömestr Adı *</Label>
            <Input
              id="name"
              type="text"
              autoFocus
              placeholder="Örn: 2024-2025 Güz"
              {...register('name')}
              aria-invalid={errors.name ? 'true' : 'false'}
            />
            {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_date">Başlangıç Tarihi *</Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
                aria-invalid={errors.start_date ? 'true' : 'false'}
              />
              {errors.start_date && <p className="text-red-600 text-sm mt-1">{errors.start_date.message}</p>}
            </div>
            <div>
              <Label htmlFor="end_date">Bitiş Tarihi *</Label>
              <Input
                id="end_date"
                type="date"
                {...register('end_date')}
                aria-invalid={errors.end_date ? 'true' : 'false'}
              />
              {/* Display refine error here as well */}
              {errors.end_date && <p className="text-red-600 text-sm mt-1">{errors.end_date.message}</p>}
            </div>
          </div>

        </fieldset>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isBusy}>
            İptal
          </Button>
          <Button type="submit" disabled={isBusy}>
            {isBusy ? 'Kaydediliyor...' : (isEditing ? 'Güncelle' : 'Kaydet')}
          </Button>
        </div>
      </form>
    </Modal>
  );
} 