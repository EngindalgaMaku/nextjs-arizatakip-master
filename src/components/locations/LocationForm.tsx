'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Location, LocationFormValues, LocationFormSchema } from '@/types/locations';
import { LocationType } from '@/types/locationTypes';
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

// Define LocationTypeSelectItem for props (if needed, or directly use LocationType)
// interface LocationTypeSelectItem { // This can be removed if LocationType is directly used
//     id: string;
//     name: string;
// }

interface LocationFormProps {
  onSubmit: (data: LocationFormValues) => Promise<void>;
  onClose: () => void;
  initialData?: Location | null;
  isSubmitting: boolean;
  availableLocationTypes: LocationType[]; // UPDATED: prop name and type
}

export default function LocationForm({ 
  onSubmit, 
  onClose, 
  initialData,
  isSubmitting,
  availableLocationTypes // UPDATED: Destructure new prop name
}: LocationFormProps) {
  const { 
    register, 
    control,
    handleSubmit, 
    formState: { errors },
    reset,
  } = useForm<LocationFormValues>({
    defaultValues: {
      name: initialData?.name || '',
      code: initialData?.code || '',
      capacity: initialData?.capacity ?? undefined,
      location_type_id: initialData?.location_type_id || '',
    },
  });

  useEffect(() => {
     const resetData = {
        name: initialData?.name || '',
        code: initialData?.code || '',
        capacity: initialData?.capacity ?? undefined,
        location_type_id: initialData?.location_type_id || '',
     };
    reset(resetData);
  }, [initialData, reset]);

  const handleFormSubmit = async (data: LocationFormValues) => {
    const validation = LocationFormSchema.safeParse(data);

    if (!validation.success) {
        console.error("Zod Validation Error:", validation.error.errors);
        const firstErrorMessage = validation.error.errors[0]?.message || 'Bilinmeyen doğrulama hatası.';
        alert(`Doğrulama Hatası: ${firstErrorMessage}`);
        return;
    }
    await onSubmit(validation.data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Konum Adı <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          {...register('name')}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.name ? 'border-red-500' : ''}`}
          placeholder="Örn: Bilişim Lab-1, 10-A Sınıfı"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700">
          Konum Kodu (Opsiyonel)
        </label>
        <input
          type="text"
          id="code"
          {...register('code')}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.code ? 'border-red-500' : ''}`}
          placeholder="Örn: LAB1, S10A"
        />
        {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>}
      </div>

      <div>
        <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
          Kapasite (Opsiyonel)
        </label>
        <input
          type="number"
          id="capacity"
          {...register('capacity', { valueAsNumber: true })}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.capacity ? 'border-red-500' : ''}`}
          placeholder="Örn: 30"
        />
        {errors.capacity && <p className="mt-1 text-sm text-red-600">{errors.capacity.message}</p>}
      </div>

      <div>
        <label htmlFor="location_type_id" className="block text-sm font-medium text-gray-700">
          Lokasyon Tipi <span className="text-red-500">*</span>
        </label>
        <select
          id="location_type_id"
          {...register('location_type_id')}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.location_type_id ? 'border-red-500' : ''}`}
        >
          <option value="">-- Lokasyon Tipi Seçin --</option>
          {availableLocationTypes.map((locationType) => (
            <option key={locationType.id} value={locationType.id}>
              {locationType.name}
            </option>
          ))}
        </select>
        {errors.location_type_id && <p className="mt-1 text-sm text-red-600">{errors.location_type_id.message}</p>}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70"
        >
          {isSubmitting ? 'Kaydediliyor...' : (initialData ? 'Güncelle' : 'Oluştur')}
        </button>
      </div>
    </form>
  );
} 