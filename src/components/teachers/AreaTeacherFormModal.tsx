'use client';

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/Modal';
import { TeacherFormSchema, TeacherFormValues, teacherRoles, teacherRoleLabels, TeacherRole, Teacher, Branch } from '@/types/teachers';

interface AreaTeacherFormModalProps {
  initialData?: Partial<TeacherFormValues>;
  onSubmit: (data: TeacherFormValues) => void;
  onClose: () => void;
  loading?: boolean;
  branches: Branch[];
}

export function AreaTeacherFormModal({ initialData, onSubmit, onClose, loading = false, branches }: AreaTeacherFormModalProps) {
  const isEditing = !!initialData;
  
  const { 
    register, 
    handleSubmit, 
    control, 
    formState: { errors, isSubmitting }, 
    reset
  } = useForm<TeacherFormValues>({
    resolver: zodResolver(TeacherFormSchema),
    defaultValues: initialData || { 
      name: '',
      birthDate: null,
      role: null,
      phone: null,
      branchId: null,
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name ?? '',
        birthDate: initialData.birthDate || null, 
        role: initialData.role || null,
        phone: initialData.phone || null,
        branchId: initialData.branchId || null,
      });
    } else {
       reset({ name: '', birthDate: null, role: null, phone: null, branchId: null });
    }
  }, [initialData, reset]);

  const isBusy = loading || isSubmitting;

  return (
    <Modal isOpen onClose={onClose} title={isEditing ? 'Alan Öğretmeni Düzenle' : 'Yeni Alan Öğretmeni'}>
      <form 
        onSubmit={handleSubmit(
          (data) => {
            onSubmit({ ...data, birthDate: data.birthDate || null, role: data.role || null });
          },
          (validationErrors) => {
            console.error("Form Validation Failed:", validationErrors);
          }
        )}
        className="space-y-4"
      >
        <fieldset disabled={isBusy} className="space-y-4">
          {/* Teacher Name */}
          <div>
            <label htmlFor="teacherName" className="block text-sm font-medium text-gray-700">Ad Soyad</label>
            <input
              id="teacherName"
              autoFocus
              type="text"
              placeholder="Ad Soyad"
              {...register('name')}
              aria-invalid={errors.name ? 'true' : 'false'}
              className={`mt-1 block w-full rounded p-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
          </div>

          {/* Birth Date */}
          <div>
            <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">Doğum Tarihi</label>
            <input
              id="birthDate"
              type="date"
              {...register('birthDate')}
              aria-invalid={errors.birthDate ? 'true' : 'false'}
              className={`mt-1 block w-full rounded p-2 border ${errors.birthDate ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.birthDate && <p className="text-red-600 text-sm">{errors.birthDate.message}</p>}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Cep Telefonu</label>
            <input
              id="phone"
              type="tel"
              placeholder="(5XX) XXX XX XX"
              {...register('phone')}
              aria-invalid={errors.phone ? 'true' : 'false'}
              className={`mt-1 block w-full rounded p-2 border ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.phone && <p className="text-red-600 text-sm">{errors.phone.message}</p>}
          </div>

          {/* Role Dropdown */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Görevi</label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <select
                  id="role"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  aria-invalid={errors.role ? 'true' : 'false'}
                  className={`mt-1 block w-full rounded p-2 border ${errors.role ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">-- Görev Seçiniz --</option>
                  <option value="MUDUR">{teacherRoleLabels.MUDUR}</option>
                  <option value="MUDUR_YARDIMCISI">{teacherRoleLabels.MUDUR_YARDIMCISI}</option>
                  <option value="OGRETMEN">{teacherRoleLabels.OGRETMEN}</option>
                  <option value="REHBER">{teacherRoleLabels.REHBER}</option>
                  <option value="ATOLYE_SEFI">{teacherRoleLabels.ATOLYE_SEFI}</option>
                  <option value="ALAN-SEFI">{teacherRoleLabels.ALAN_SEFI}</option>
                </select>
              )}
            />
            {errors.role && <p className="text-red-600 text-sm">{errors.role.message}</p>}
          </div>

          {/* Branch Dropdown */}
          <div>
            <label htmlFor="branchId" className="block text-sm font-medium text-gray-700">Branş</label>
            <Controller
               name="branchId"
               control={control}
               render={({ field }) => (
                 <select
                   id="branchId"
                   {...field}
                   value={field.value ?? ''}
                   onChange={(e) => field.onChange(e.target.value || null)}
                   className={`mt-1 block w-full rounded p-2 border ${errors.branchId ? 'border-red-500' : 'border-gray-300'}`}
                 >
                    <option value="">-- Branş Seçiniz --</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                 </select>
               )}
            />
            {errors.branchId && <p className="text-red-600 text-sm">{errors.branchId.message}</p>}
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