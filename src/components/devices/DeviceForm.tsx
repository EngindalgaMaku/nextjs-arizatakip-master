'use client';

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Device, DeviceFormData, DeviceSchema, deviceTypes, DeviceProperty } from '@/types/devices';
import { Location } from '@/types/locations'; // Need Location for dropdown type
import { PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

// Type for the location dropdown items
type LocationSelectItem = Pick<Location, 'id' | 'name'>;

// Define possible statuses (move to enums/constants later if needed)
const deviceStatuses = [
    { value: 'aktif', label: 'Aktif' },
    { value: 'arizali', label: 'Arızalı' },
    { value: 'bakimda', label: 'Bakımda' },
    { value: 'hurda', label: 'Hurda' },
    { value: 'pasif', label: 'Pasif' },
];

// Department type (mirroring the one passed from page)
interface DepartmentSelectItem {
    value: string;
    label: string;
}

interface DeviceFormProps {
  onSubmit: (data: DeviceFormData) => Promise<void>;
  onClose: () => void;
  initialData?: Device | null; // Use Device type here
  isSubmitting: boolean;
  availableLocations: Location[]; // Pass locations for the dropdown
  availableDepartments: DepartmentSelectItem[]; // Add prop for departments
}

export default function DeviceForm({
  onSubmit,
  onClose,
  initialData,
  isSubmitting,
  availableLocations,
  availableDepartments
}: DeviceFormProps) {

  // Helper to format date for input type="date" (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      // Assuming dateString is ISO or easily parsable to Date
      return new Date(dateString).toISOString().split('T')[0];
    } catch (e) {
      return ''; // Return empty if date is invalid
    }
  };

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<DeviceFormData>({ // Use DeviceFormData here
    // Include all fields in defaultValues
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || '',
      serial_number: initialData?.serial_number || '',
      department: initialData?.department || '',
      location_id: initialData?.location_id || '',
      properties: initialData?.properties || [],
      purchase_date: formatDateForInput(initialData?.purchase_date),
      warranty_expiry_date: formatDateForInput(initialData?.warranty_expiry_date),
      status: initialData?.status || 'aktif',
      notes: initialData?.notes || '',
    },
  });

  const { fields, append, remove, move } = useFieldArray<DeviceFormData, "properties", "id">({
    control,
    name: "properties",
  });

  // Reset form when initialData changes (e.g., when opening edit modal)
  useEffect(() => {
     if (!initialData) return;
     
     const resetData = {
        name: initialData?.name || '',
        type: initialData?.type || '',
        serial_number: initialData?.serial_number || '',
        department: initialData?.department || '',
        location_id: initialData?.location_id || '',
        properties: initialData?.properties || [],
        purchase_date: formatDateForInput(initialData?.purchase_date),
        warranty_expiry_date: formatDateForInput(initialData?.warranty_expiry_date),
        status: initialData?.status || 'aktif',
        notes: initialData?.notes || '',
     };
    reset(resetData);
  }, [initialData, reset, availableLocations, setValue]);

  const handleFormSubmit = async (data: DeviceFormData) => {
     // Ensure empty strings become null for optional fields if needed by backend/schema
     const processedData: DeviceFormData = {
         ...data,
         department: data.department,
         location_id: data.location_id,
         serial_number: data.serial_number === '' ? null : data.serial_number,
         purchase_date: data.purchase_date === '' ? null : data.purchase_date,
         warranty_expiry_date: data.warranty_expiry_date === '' ? null : data.warranty_expiry_date,
         status: data.status,
         notes: data.notes === '' ? null : data.notes,
     };

    // Client-side validation before submitting
    const validation = DeviceSchema.safeParse(processedData);
    if (!validation.success) {
        console.error("Client-side Zod Validation Error:", validation.error.errors);
        // Find the first error message to display
        const firstError = validation.error.errors[0];
        const errorMessage = firstError
          ? `${firstError.path.join('.')} field: ${firstError.message}`
          : 'Formda geçersiz veya eksik alanlar var.';
        // Use a more user-friendly notification if available (e.g., toast)
        alert(`Doğrulama Hatası: ${errorMessage}`);
        return; // Stop submission
    }
    // Submit the validated data
    await onSubmit(validation.data);
  };

  // Add console log here to check props
  console.log('DeviceForm - availableDepartments:', availableDepartments);
  console.log('DeviceForm - availableLocations:', availableLocations);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      {/* Grid for basic info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Device Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Cihaz Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              {...register('name')}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.name ? 'border-red-500' : ''}`}
              placeholder="Örn: LAB1-PC05, Muhasebe Yazıcı"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          {/* Device Type Select */}
           <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Cihaz Tipi <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              {...register('type')}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.type ? 'border-red-500' : ''}`}
            >
              <option value="">-- Tip Seçin --</option>
              {deviceTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
          </div>

          {/* Serial Number */}
          <div className="hidden">
            <label htmlFor="serial_number" className="block text-sm font-medium text-gray-700">
              Seri Numarası
            </label>
            <input
              type="text"
              id="serial_number"
              {...register('serial_number')}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.serial_number ? 'border-red-500' : ''}`}
            />
            {errors.serial_number && <p className="mt-1 text-sm text-red-600">{errors.serial_number.message}</p>}
          </div>

          {/* Department Select */}
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700">
              Departman <span className="text-red-500">*</span>
            </label>
            <select
              id="department"
              {...register('department')}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.department ? 'border-red-500' : ''}`}
            >
              <option value="">-- Departman Seçin --</option>
              {availableDepartments.map((dept) => (
                <option key={dept.value} value={dept.value}>
                  {dept.label}
                </option>
              ))}
            </select>
            {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>}
          </div>

          {/* Location Select */}
          <div>
            <label htmlFor="location_id" className="block text-sm font-medium text-gray-700">
                Bulunduğu Konum <span className="text-red-500">*</span>
            </label>
            <select
              id="location_id"
              {...register('location_id', { required: 'Konum seçilmelidir.' })}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.location_id ? 'border-red-500' : ''}`}
            >
              <option value="">-- Konum Seçin --</option>
              {availableLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            {errors.location_id && <p className="mt-1 text-sm text-red-600">{errors.location_id.message}</p>}
          </div>

          {/* Status Select */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Durum <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              {...register('status')}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.status ? 'border-red-500' : ''}`}
            >
              {deviceStatuses.map((stat) => (
                <option key={stat.value} value={stat.value}>
                  {stat.label}
                </option>
              ))}
            </select>
            {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
          </div>

          {/* Purchase Date */}
          <div className="hidden">
            <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700">
              Satın Alma Tarihi
            </label>
            <input
              type="date"
              id="purchase_date"
              {...register('purchase_date')}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.purchase_date ? 'border-red-500' : ''}`}
            />
            {errors.purchase_date && <p className="mt-1 text-sm text-red-600">{errors.purchase_date.message}</p>}
          </div>

          {/* Warranty Expiry Date */}
          <div className="hidden">
            <label htmlFor="warranty_expiry_date" className="block text-sm font-medium text-gray-700">
              Garanti Bitiş Tarihi
            </label>
            <input
              type="date"
              id="warranty_expiry_date"
              {...register('warranty_expiry_date')}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.warranty_expiry_date ? 'border-red-500' : ''}`}
            />
            {errors.warranty_expiry_date && <p className="mt-1 text-sm text-red-600">{errors.warranty_expiry_date.message}</p>}
          </div>
      </div>

       {/* Notes Textarea */}
       <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notlar
            </label>
            <textarea
              id="notes"
              rows={3}
              {...register('notes')}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${errors.notes ? 'border-red-500' : ''}`}
            />
            {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>}
          </div>

      {/* Dynamic Properties Section */}
      <div className="space-y-3 pt-4 border-t border-gray-200">
         <h3 className="text-sm font-medium text-gray-900">Ek Özellikler</h3>
         {fields.map((field, index) => (
           <div key={field.id} className="flex items-center space-x-1.5">
             {/* Up/Down Buttons */}
             <div className="flex flex-col">
                <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} className="p-0.5 text-gray-500 hover:text-gray-700 disabled:opacity-30" title="Yukarı Taşı"> <ArrowUpIcon className="h-4 w-4" /></button>
                <button type="button" onClick={() => move(index, index + 1)} disabled={index === fields.length - 1} className="p-0.5 text-gray-500 hover:text-gray-700 disabled:opacity-30" title="Aşağı Taşı"> <ArrowDownIcon className="h-4 w-4" /></button>
             </div>
             {/* Key Input */}
             <div className="flex-1">
               <input type="text" {...register(`properties.${index}.key` as const)} className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" placeholder="Özellik Adı" />
                {errors.properties?.[index]?.key?.message && (<p className="mt-1 text-xs text-red-600">{typeof errors.properties[index]?.key?.message === 'string' ? errors.properties[index]?.key?.message : 'Geçersiz anahtar'}</p>)}
             </div>
             {/* Value Input */}
             <div className="flex-1">
                <input type="text" {...register(`properties.${index}.value` as const)} className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm" placeholder="Değer" />
                {errors.properties?.[index]?.value?.message && (<p className="mt-1 text-xs text-red-600">{typeof errors.properties[index]?.value?.message === 'string' ? errors.properties[index]?.value?.message : 'Geçersiz değer'}</p>)}
             </div>
             {/* Remove Button */}
             <button type="button" onClick={() => remove(index)} className="p-1 text-red-600 hover:text-red-800" title="Özelliği Kaldır"> <TrashIcon className="h-5 w-5" /></button>
           </div>
         ))}
         {/* Add Property Button */}
         <button type="button" onClick={() => append({ key: '', value: '' })} className="mt-2 inline-flex items-center rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"> <PlusIcon className="-ml-0.5 mr-1 h-4 w-4" aria-hidden="true" />Özellik Ekle</button>
      </div>

      {/* Submit/Cancel Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50">İptal</button>
          <button type="submit" disabled={isSubmitting} className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70">
              {isSubmitting ? 'Kaydediliyor...' : (initialData ? 'Güncelle' : 'Oluştur')}
          </button>
      </div>
    </form>
  );
}