"use client";

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/Modal';
import { LocationScheduleEntryPayload, LocationScheduleEntryPayloadSchema } from '@/types/schedules';
// Removed import for scheduleConstants
import type { Class } from '@/types/classes';
import type { Teacher } from '@/types/teachers'; 

// Define constants directly
const DAYS_OF_WEEK = [
  { id: 1, name: 'Pazartesi' }, { id: 2, name: 'Salı' }, { id: 3, name: 'Çarşamba' },
  { id: 4, name: 'Perşembe' }, { id: 5, name: 'Cuma' },
];
const PERIOD_TIMES = [
  '08:20-09:00', '09:15-09:55', '10:05-10:45', '10:55-11:35', '11:45-12:25',
  '13:10-13:50', '14:00-14:40', '14:50-15:30', '15:40-16:20', '16:30-17:10'
];

// Define type for ders options used in dropdown
interface DersDropdownOption {
    value: string; // lesson_id
    label: string; // ders_adi
}

// Interface for props passed to the modal
interface LocationScheduleFormModalProps {
  isOpen: boolean; // Add isOpen prop
  initialData?: LocationScheduleEntryPayload & { id?: string }; 
  day: number;
  period: number;
  editorOptions: {
      dersOptions: DersDropdownOption[]; // Use updated type
      classes: Class[];
      teachers: Partial<Teacher>[]; // Expect Partial<Teacher>
  };
  onSubmit: (data: LocationScheduleEntryPayload) => void;
  onClose: () => void;
  loading?: boolean; 
}

export function LocationScheduleFormModal({
  isOpen, // Use isOpen prop
  initialData,
  day,
  period,
  editorOptions,
  onSubmit,
  onClose,
  loading = false
}: LocationScheduleFormModalProps) {

  const dayName = DAYS_OF_WEEK.find(d => d.id === day)?.name;
  const periodTime = PERIOD_TIMES[period - 1] || ''; 
  const modalTitle = initialData?.id 
    ? `Dersi Düzenle (${dayName} - ${periodTime})`
    : `Yeni Ders Ekle (${dayName} - ${periodTime})`;

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<LocationScheduleEntryPayload>({
    resolver: zodResolver(LocationScheduleEntryPayloadSchema),
    defaultValues: {
      lesson_id: initialData?.lesson_id || '',
      class_id: initialData?.class_id || null,
      teacher_id: initialData?.teacher_id || null,
    },
  });

  const isBusy = loading || isSubmitting; 

  return (
    // Pass isOpen to the underlying Modal component
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <fieldset disabled={isBusy} className="space-y-4">

          {/* Lesson Selection Dropdown */}
          <div>
            <label htmlFor="lesson_id" className="block text-sm font-medium text-gray-700">Ders</label>
            <select
              id="lesson_id"
              {...register('lesson_id')}
              autoFocus
              className={`mt-1 block w-full rounded p-2 border ${errors.lesson_id ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">-- Ders Seçiniz --</option>
              {/* Use updated dersOptions prop */}
              {editorOptions.dersOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.lesson_id && <p className="text-red-600 text-sm">{errors.lesson_id.message}</p>}
          </div>

          {/* Class Selection Dropdown */}
          <div>
            <label htmlFor="class_id" className="block text-sm font-medium text-gray-700">Sınıf (İsteğe Bağlı)</label>
             <select
                id="class_id"
                {...register('class_id')} 
                 className={`mt-1 block w-full rounded p-2 border ${errors.class_id ? 'border-red-500' : 'border-gray-300'}`}
            >
                <option value="">-- Sınıf Seçiniz --</option>
                 {editorOptions.classes.map((cls) => (
                    <option key={cls.id} value={cls.id || ''}> 
                        {cls.name} {cls.department ? `(${cls.department})` : ''}
                    </option>
                ))}
            </select>
            {errors.class_id && <p className="text-red-600 text-sm">{errors.class_id.message}</p>}
          </div>

          {/* Teacher Selection Dropdown */}
          <div>
            <label htmlFor="teacher_id" className="block text-sm font-medium text-gray-700">Öğretmen</label>
             <select
                id="teacher_id"
                {...register('teacher_id')}
                 className={`mt-1 block w-full rounded p-2 border ${errors.teacher_id ? 'border-red-500' : 'border-gray-300'}`}
            >
                <option value="">-- Öğretmen Seçiniz --</option>
                {/* Filter out teachers without id/name and render options */}
                {editorOptions.teachers.filter(teacher => teacher.id && teacher.name).map((teacher) => (
                    <option key={teacher.id} value={teacher.id!}>{teacher.name}</option> // Use non-null assertion after filter
                ))}
            </select>
            {errors.teacher_id && <p className="text-red-600 text-sm">{errors.teacher_id.message}</p>}
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