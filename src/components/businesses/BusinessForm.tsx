'use client';

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BusinessFormSchema, BusinessFormValues, BUSINESS_TYPE_OPTIONS, BusinessType } from '@/types/businesses';
import { Semester } from '@/types/semesters'; // Assuming you have this type
import { fetchSemesters } from '@/actions/semesterActions'; // Action to fetch semesters
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { XCircleIcon } from '@heroicons/react/24/solid';

interface BusinessFormProps {
  initialData?: Partial<BusinessFormValues>;
  onSubmit: (data: BusinessFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitButtonText?: string;
}

export function BusinessForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitButtonText = 'Kaydet',
}: BusinessFormProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<BusinessFormValues>({
    resolver: zodResolver(BusinessFormSchema),
    defaultValues: initialData || {
      name: '',
      contactPerson: '',
      contactPhone: '',
      address: '',
      industry: '',
      businessType: undefined, // Or a default like 'private'
      notes: '',
      semesterId: undefined,
    },
  });

  const { data: semesters, isLoading: isLoadingSemesters } = useQuery<Semester[], Error>({
    queryKey: ['semestersForSelect'],
    queryFn: fetchSemesters,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  // Set default semester if creating new and semesters are loaded
  useEffect(() => {
    if (!initialData?.semesterId && semesters && semesters.length > 0) {
      const activeSemester = semesters.find(s => s.is_active);
      if (activeSemester) {
        setValue('semesterId', activeSemester.id);
      } else if (semesters.length > 0) {
         setValue('semesterId', semesters[0].id); // Fallback to the first semester
      }
    }
  }, [initialData, semesters, setValue]);

  const handleFormSubmit = async (data: BusinessFormValues) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 bg-white p-6 md:p-8 rounded-lg shadow-md">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          İşletme Adı <span className="text-red-500">*</span>
        </label>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <input
              {...field}
              id="name"
              type="text"
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          )}
        />
        {errors.name && <p className="mt-1 text-xs text-red-600 flex items-center"><XCircleIcon className="h-4 w-4 mr-1" />{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="semesterId" className="block text-sm font-medium text-gray-700 mb-1">
            İlgili Sömestr <span className="text-red-500">*</span>
          </label>
          <Controller
            name="semesterId"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                id="semesterId"
                disabled={isLoadingSemesters || isLoading}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                  errors.semesterId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {isLoadingSemesters ? (
                  <option>Sömestrler yükleniyor...</option>
                ) : (
                  <>
                    <option value="">Sömestr Seçin</option>
                    {semesters?.map((semester) => (
                      <option key={semester.id} value={semester.id}>
                        {semester.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            )}
          />
          {errors.semesterId && <p className="mt-1 text-xs text-red-600 flex items-center"><XCircleIcon className="h-4 w-4 mr-1" />{errors.semesterId.message}</p>}
        </div>

        <div>
          <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-1">
            İşletme Türü <span className="text-red-500">*</span>
          </label>
          <Controller
            name="businessType"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                id="businessType"
                disabled={isLoading}
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                  errors.businessType ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Tür Seçin</option>
                {BUSINESS_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.businessType && <p className="mt-1 text-xs text-red-600 flex items-center"><XCircleIcon className="h-4 w-4 mr-1" />{errors.businessType.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700 mb-1">
            Yetkili Kişi
          </label>
          <Controller
            name="contactPerson"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                id="contactPerson"
                type="text"
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                  errors.contactPerson ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            )}
          />
          {errors.contactPerson && <p className="mt-1 text-xs text-red-600 flex items-center"><XCircleIcon className="h-4 w-4 mr-1" />{errors.contactPerson.message}</p>}
        </div>

        <div>
          <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">
            Yetkili Telefonu
          </label>
          <Controller
            name="contactPhone"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                id="contactPhone"
                type="tel" // Changed to tel for better mobile UX
                placeholder="(5XX) XXX XX XX"
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                  errors.contactPhone ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            )}
          />
          {errors.contactPhone && <p className="mt-1 text-xs text-red-600 flex items-center"><XCircleIcon className="h-4 w-4 mr-1" />{errors.contactPhone.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
          Adres
        </label>
        <Controller
          name="address"
          control={control}
          render={({ field }) => (
            <textarea
              {...field}
              id="address"
              rows={3}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                errors.address ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          )}
        />
        {errors.address && <p className="mt-1 text-xs text-red-600 flex items-center"><XCircleIcon className="h-4 w-4 mr-1" />{errors.address.message}</p>}
      </div>

      <div>
        <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
          Faaliyet Alanı / Sektör
        </label>
        <Controller
          name="industry"
          control={control}
          render={({ field }) => (
            <input
              {...field}
              id="industry"
              type="text"
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                errors.industry ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          )}
        />
        {errors.industry && <p className="mt-1 text-xs text-red-600 flex items-center"><XCircleIcon className="h-4 w-4 mr-1" />{errors.industry.message}</p>}
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Ek Notlar
        </label>
        <Controller
          name="notes"
          control={control}
          render={({ field }) => (
            <textarea
              {...field}
              id="notes"
              rows={3}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                errors.notes ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          )}
        />
        {errors.notes && <p className="mt-1 text-xs text-red-600 flex items-center"><XCircleIcon className="h-4 w-4 mr-1" />{errors.notes.message}</p>}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={isLoading || isLoadingSemesters}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              İşleniyor...
            </>
          ) : (
            submitButtonText
          )}
        </button>
      </div>
    </form>
  );
} 