'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Modal from '@/components/Modal';
import { TeacherUnavailabilityFormSchema, TeacherUnavailabilityFormValues } from '@/types/teacherUnavailability';
import { DayOfWeek, DAYS_OF_WEEK } from '@/types/scheduling';

interface TeacherUnavailabilityFormModalProps {
  onSubmit: (data: TeacherUnavailabilityFormValues) => void;
  onClose: () => void;
  loading?: boolean;
}

const daysOfWeek: DayOfWeek[] = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const hoursOfDay = Array.from({ length: 10 }, (_, i) => i + 1);

export function TeacherUnavailabilityFormModal({
  onSubmit,
  onClose,
  loading = false
}: TeacherUnavailabilityFormModalProps) {

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<TeacherUnavailabilityFormValues>({
    resolver: zodResolver(TeacherUnavailabilityFormSchema),
    defaultValues: {
      day_of_week: 1,
      start_period: 9,
      end_period: 10,
      reason: '',
    },
  });

  const startPeriod = watch("start_period");
  const isBusy = loading || isSubmitting;

  return (
    <Modal isOpen onClose={onClose} title="Müsait Olmama Zamanı Ekle">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <fieldset disabled={isBusy} className="space-y-4">
          {/* Day Selection */}
          <div>
            <label htmlFor="day_of_week" className="block text-sm font-medium text-gray-700">Gün</label>
            <select
              id="day_of_week"
              {...register('day_of_week', { valueAsNumber: true })}
              className={`mt-1 block w-full rounded p-2 border ${errors.day_of_week ? 'border-red-500' : 'border-gray-300'}`}
            >
              {daysOfWeek.map((day, idx) => (
                <option key={day} value={idx + 1}>{day}</option>
              ))}
            </select>
            {errors.day_of_week && <p className="text-red-600 text-sm">{errors.day_of_week.message}</p>}
          </div>

          {/* Start Period */}
          <div>
            <label htmlFor="start_period" className="block text-sm font-medium text-gray-700">Başlangıç Saati</label>
            <select
              id="start_period"
              {...register('start_period', { valueAsNumber: true })}
              className={`mt-1 block w-full rounded p-2 border ${errors.start_period ? 'border-red-500' : 'border-gray-300'}`}
            >
              {hoursOfDay.map(period => (
                <option key={period} value={period}>{`${period}:00`}</option>
              ))}
            </select>
            {errors.start_period && <p className="text-red-600 text-sm">{errors.start_period.message}</p>}
          </div>

          {/* End Period */}
          <div>
            <label htmlFor="end_period" className="block text-sm font-medium text-gray-700">Bitiş Saati</label>
            <select
              id="end_period"
              {...register('end_period', { valueAsNumber: true })}
              className={`mt-1 block w-full rounded p-2 border ${errors.end_period ? 'border-red-500' : 'border-gray-300'}`}
            >
              {hoursOfDay.filter(period => period >= startPeriod).map(period => (
                <option key={period} value={period}>{`${period}:00`}</option>
              ))}
            </select>
            {errors.end_period && <p className="text-red-600 text-sm">{errors.end_period.message}</p>}
            {errors.root?.serverError && (
              <p className="text-red-600 text-sm">{errors.root.serverError.message}</p>
            )}
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