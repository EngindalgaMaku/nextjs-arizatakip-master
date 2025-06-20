'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/Modal';
import {
  TeacherScheduleFormSchema,
  TeacherScheduleFormValues,
  DAYS_OF_WEEK,
  TIME_SLOTS
} from '@/types/teacherSchedules';
import { useQuery } from '@tanstack/react-query';
import { fetchLocations } from '@/actions/locationActions';
import { fetchDistinctDersAdlari } from '@/actions/dalDersActions';
import { fetchClasses } from '@/actions/classActions';
import type { Class } from '@/types/classes';
import { Controller } from 'react-hook-form';

interface TeacherScheduleFormModalProps {
  initialData?: TeacherScheduleFormValues;
  dayOfWeek: number; // Day ID (e.g., 1 for Monday)
  timeSlot: number;  // Time slot ID (e.g., 1 for 08:00-08:40)
  onSubmit: (data: TeacherScheduleFormValues) => void;
  onClose: () => void;
  loading?: boolean;
}

export function TeacherScheduleFormModal({
  initialData,
  dayOfWeek,
  timeSlot,
  onSubmit,
  onClose,
  loading = false
}: TeacherScheduleFormModalProps) {

  const { data: labLocations = [], isLoading: isLoadingLabs } = useQuery({
      queryKey: ['laboratoryLocations'],
      queryFn: () => fetchLocations(undefined),
  });

  const { data: distinctDersler = [], isLoading: isLoadingDersler } = useQuery<string[]>({ 
      queryKey: ['distinctDersAdlari'],
      queryFn: fetchDistinctDersAdlari,
  });

  const { data: classesList = [], isLoading: isLoadingClasses } = useQuery<Class[]>({
      queryKey: ['classes'],
      queryFn: () => fetchClasses(undefined),
  });

  const dayName = DAYS_OF_WEEK.find(d => d.id === dayOfWeek)?.name;
  const slotTime = TIME_SLOTS.find(s => s.id === timeSlot)?.time;
  const modalTitle = initialData
    ? `Dersi Düzenle (${dayName} - ${slotTime})`
    : `Yeni Ders Ekle (${dayName} - ${slotTime})`;

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<TeacherScheduleFormValues>({
    resolver: zodResolver(TeacherScheduleFormSchema),
    defaultValues: initialData ?? {
      className: '',
      locationName: '',
      classId: null,
    },
  });

  const isBusy = loading || isSubmitting || isLoadingLabs || isLoadingDersler || isLoadingClasses;

  return (
    <Modal isOpen onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <fieldset disabled={isBusy} className="space-y-4">
          {/* Class Name Input with Datalist */}
          <div>
            <label htmlFor="className" className="block text-sm font-medium text-gray-700">Ders Adı (Listeden Seçin veya Yazın)</label>
            <input
              id="className"
              autoFocus
              type="text"
              placeholder="Ders seçin veya özel ders/görev girin..."
              {...register('className')}
              list="ders-adlari-list"
              className={`mt-1 block w-full rounded p-2 border ${errors.className ? 'border-red-500' : 'border-gray-300'}`}
            />
            <datalist id="ders-adlari-list">
              {distinctDersler.map((dersAdi) => (
                <option key={dersAdi} value={dersAdi} />
              ))}
            </datalist>
            {isLoadingDersler && <p className="text-xs text-gray-500 mt-1">Ders adları yükleniyor...</p>}
            {errors.className && <p className="text-red-600 text-sm">{errors.className.message}</p>}
          </div>

          {/* Class Selection Dropdown */}
          <div>
            <label htmlFor="classId" className="block text-sm font-medium text-gray-700">Sınıf</label>
            <Controller
                name="classId"
                control={control}
                render={({ field }) => (
                    <select
                        id="classId"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className={`mt-1 block w-full rounded p-2 border ${errors.classId ? 'border-red-500' : 'border-gray-300'}`}
                        disabled={isLoadingClasses}
                    >
                        <option value="">-- Sınıf Seçiniz (İsteğe Bağlı) --</option>
                        {classesList.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                                {cls.name} {cls.department ? `(${cls.department})` : ''} 
                            </option>
                        ))}
                    </select>
                )}
            />
            {isLoadingClasses && <p className="text-sm text-gray-500 mt-1">Sınıflar yükleniyor...</p>}
            {errors.classId && <p className="text-red-600 text-sm">{errors.classId.message}</p>}
          </div>

          {/* Location Name Input with Datalist */}
          <div>
            <label htmlFor="locationName" className="block text-sm font-medium text-gray-700">Konum (Laboratuvar Seçin veya Yazın)</label>
            <input
              id="locationName"
              type="text"
              placeholder="Laboratuvar seçin veya özel konum girin..."
              {...register('locationName')}
              list="lab-locations-list"
              className={`mt-1 block w-full rounded p-2 border ${errors.locationName ? 'border-red-500' : 'border-gray-300'}`}
            />
            <datalist id="lab-locations-list">
              {labLocations.map((loc) => (
                <option key={loc.id} value={loc.name} />
              ))}
            </datalist>
            {isLoadingLabs && <p className="text-xs text-gray-500 mt-1">Laboratuvarlar yükleniyor...</p>}
            {errors.locationName && <p className="text-red-600 text-sm">{errors.locationName.message}</p>}
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