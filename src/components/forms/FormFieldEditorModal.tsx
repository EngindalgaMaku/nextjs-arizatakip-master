'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/Modal';
import {
  FormFieldValues,
  FormFieldValuesSchema,
  FORM_FIELD_TYPES,
  FormFieldType,
  FormFieldOption
} from '@/types/forms';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface FormFieldEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormFieldValues) => void;
  initialData?: FormFieldValues;
  loading?: boolean;
}

export function FormFieldEditorModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: FormFieldEditorModalProps) {
  const isEditing = !!initialData; // Check if editing
  const modalTitle = isEditing ? 'Alanı Düzenle' : 'Yeni Alan Ekle';

  const { 
      register, 
      handleSubmit, 
      control, 
      watch, // To watch fieldType changes
      formState: { errors, isSubmitting } 
  } = useForm<FormFieldValues>({
    resolver: zodResolver(FormFieldValuesSchema),
    defaultValues: initialData ?? {
      label: '',
      fieldType: 'text', 
      options: null, // Changed default from [] to null
      isRequired: false,
    },
  });

  // Watch the fieldType to conditionally show options
  const watchedFieldType = watch('fieldType');
  const showOptionsInput = ['select', 'radio', 'checkbox'].includes(watchedFieldType);

  // Field array for options
  const { fields, append, remove } = useFieldArray({
    control,
    name: "options"
  });

  const isBusy = loading || isSubmitting;

  useEffect(() => {
     // Reset options if field type changes to one that doesn't use them
     if (!showOptionsInput && fields.length > 0) {
         // TODO: Consider if clearing is the best approach or just hiding
         // For now, let's just rely on hiding, clearing might lose data if user toggles back.
     }
  }, [watchedFieldType, fields.length, showOptionsInput]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <fieldset disabled={isBusy} className="space-y-4">
          {/* Label */}
          <div>
            <label htmlFor="label" className="block text-sm font-medium text-gray-700">Alan Etiketi / Soru Metni</label>
            <input
              id="label"
              autoFocus
              type="text"
              {...register('label')}
              aria-invalid={errors.label ? 'true' : 'false'}
              className={`mt-1 block w-full rounded p-2 border ${errors.label ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.label && <p className="text-red-600 text-sm">{errors.label.message}</p>}
          </div>
          
          {/* Field Type */}
          <div>
            <label htmlFor="fieldType" className="block text-sm font-medium text-gray-700">Alan Tipi</label>
            <Controller
                name="fieldType"
                control={control}
                render={({ field }) => (
                    <select
                        id="fieldType"
                        {...field}
                        className={`mt-1 block w-full rounded p-2 border ${errors.fieldType ? 'border-red-500' : 'border-gray-300'}`}
                    >
                        {FORM_FIELD_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                )}
            />
             {errors.fieldType && <p className="text-red-600 text-sm">{errors.fieldType.message}</p>}
          </div>
          
           {/* Options (Conditional) */}
          {showOptionsInput && (
            <div className="space-y-3 border p-3 rounded">
                 <label className="block text-sm font-medium text-gray-700">Seçenekler</label>
                 {fields.map((item, index) => (
                    <div key={item.id} className="flex items-center space-x-2">
                        <input
                            placeholder="Etiket (Görünür Metin)"
                            {...register(`options.${index}.label` as const)}
                            className={`flex-1 rounded p-2 border text-sm ${errors.options?.[index]?.label ? 'border-red-500' : 'border-gray-300'}`}
                        />
                         <input
                            placeholder="Değer (Kaydedilecek)"
                            {...register(`options.${index}.value` as const)}
                            className={`flex-1 rounded p-2 border text-sm ${errors.options?.[index]?.value ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        <button type="button" onClick={() => remove(index)} title="Seçeneği Sil">
                             <TrashIcon className="h-5 w-5 text-red-500 hover:text-red-700" />
                        </button>
                    </div>
                 ))}
                 <button 
                    type="button" 
                    onClick={() => append({ label: '', value: '' })} 
                    className="text-sm text-indigo-600 hover:text-indigo-800 inline-flex items-center"
                  >
                      <PlusIcon className="h-4 w-4 mr-1"/> Seçenek Ekle
                 </button>
                  {errors.options && <p className="text-red-600 text-sm">{errors.options.message || errors.options.root?.message}</p>}
            </div>
          )}
          
          {/* Is Required Checkbox */}
          <div className="flex items-center">
             <Controller
                name="isRequired"
                control={control}
                render={({ field }) => (
                   <input 
                      id="isRequired"
                      type="checkbox" 
                      checked={field.value} 
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mr-2"
                   />
                 )}
             />
             <label htmlFor="isRequired" className="text-sm text-gray-700">Bu alan zorunlu mu?</label>
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