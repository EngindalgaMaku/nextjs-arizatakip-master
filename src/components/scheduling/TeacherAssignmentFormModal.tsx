'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Modal from '@/components/Modal';
import {
    TeacherCourseAssignment,
    TeacherCourseAssignmentFormSchema,
    TeacherCourseAssignmentFormValues,
    AssignmentTypeEnum,
    AssignmentType
} from '@/types/teacherCourseAssignments';

// Define the DersOption type expected by the modal props
interface DersOption {
    id: string;
    dersAdi: string;
    sinifSeviyesi: number;
    dalAdi: string;
}

interface TeacherAssignmentFormModalProps {
    initialData?: TeacherCourseAssignment; // For editing assignment type
    // Use DersOption type for the dropdown options
    dalDersOptions: DersOption[]; 
    // Pass the map for potentially displaying details if needed
    dalDersMap: Map<string, DersOption>; 
    onSubmit: (data: TeacherCourseAssignmentFormValues & { dal_ders_id?: string }) => void;
    onClose: () => void;
    loading?: boolean;
}

export function TeacherAssignmentFormModal({
    initialData,
    dalDersOptions,
    dalDersMap,
    onSubmit,
    onClose,
    loading = false
}: TeacherAssignmentFormModalProps) {

    const isEditing = !!initialData?.id;
    const modalTitle = isEditing ? 'Atama Türünü Düzenle' : 'Yeni Ders Ataması Ekle';

    // Need to get the DalDers details if editing to display name
    // This assumes DalDers details are available via a map or context, 
    // or passed down. For simplicity, we'll just use the ID for now.
    const editingDersId = initialData?.dal_ders_id;

    const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<TeacherCourseAssignmentFormValues & { dal_ders_id?: string }>({
        resolver: zodResolver(TeacherCourseAssignmentFormSchema.extend({ // Extend schema for the form
            dal_ders_id: z.string().uuid().optional(), // Make dal_ders_id optional here
        })),
        defaultValues: {
            dal_ders_id: isEditing ? editingDersId : (dalDersOptions[0]?.id ?? ''), // Pre-select if editing or first available
            assignment: initialData?.assignment ?? 'required', // Default to 'required' instead of 'preferred'
        },
    });

    // Wrapper function to log before calling the parent onSubmit
    const handleFormSubmitWrapper = (data: TeacherCourseAssignmentFormValues & { dal_ders_id?: string }) => {
        console.log('[TeacherAssignmentFormModal] Form submitted locally. Calling parent onSubmit with:', data);
        onSubmit(data); // Call the actual submit handler passed via props
    };

    const isBusy = loading || isSubmitting;

    // Prepare assignment type options for the dropdown
    const assignmentTypeOptions: { value: AssignmentType; label: string }[] = [
        { value: 'required', label: 'Uzmanlık Dersi' }, // Changed label
        { value: 'excluded', label: 'Atanamaz' },
    ];

    return (
        <Modal isOpen onClose={onClose} title={modalTitle}>
            <form onSubmit={handleSubmit(handleFormSubmitWrapper)} className="space-y-4">
                <fieldset disabled={isBusy} className="space-y-4">
                    {/* Dal Ders Selection (Only in Add mode) */}
                    {!isEditing && (
                        <div>
                            <label htmlFor="dal_ders_id" className="block text-sm font-medium text-gray-700">Atanacak Ders</label>
                            <Controller
                                name="dal_ders_id"
                                control={control}
                                rules={{ required: 'Ders seçimi zorunludur.' }} // Add required rule
                                render={({ field }) => (
                                    <select
                                        id="dal_ders_id"
                                        {...field}
                                        value={field.value ?? ''}
                                        className={`mt-1 block w-full rounded p-2 border ${errors.dal_ders_id ? 'border-red-500' : 'border-gray-300'}`}
                                        disabled={dalDersOptions.length === 0}
                                    >
                                        <option value="">-- Ders Seçiniz --</option>
                                        {dalDersOptions.map(ders => (
                                            <option key={ders.id} value={ders.id}>
                                                {ders.dalAdi} - {ders.dersAdi} ({ders.sinifSeviyesi}. Sınıf)
                                            </option>
                                        ))}
                                    </select>
                                )}
                            />
                            {errors.dal_ders_id && <p className="text-red-600 text-sm">{errors.dal_ders_id.message}</p>}
                            {dalDersOptions.length === 0 && <p className="text-sm text-yellow-600 mt-1">Bu öğretmene atanabilecek başka ders bulunmuyor.</p>}
                        </div>
                    )}
                    {isEditing && initialData && (
                        // Display the selected course name when editing (non-editable)
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Ders</label>
                            <p className="mt-1 text-sm text-gray-800 bg-gray-100 p-2 rounded border border-gray-300">
                                {initialData.dal_ders_id} {/* TODO: Replace with actual course name lookup */} 
                            </p>
                         </div>
                    )}

                    {/* Assignment Type Selection */}
                    <div>
                        <label htmlFor="assignment" className="block text-sm font-medium text-gray-700">Atama Türü</label>
                        <Controller
                            name="assignment"
                            control={control}
                            render={({ field }) => (
                                <select
                                    id="assignment"
                                    {...field}
                                    value={field.value ?? 'preferred'}
                                    className={`mt-1 block w-full rounded p-2 border ${errors.assignment ? 'border-red-500' : 'border-gray-300'}`}
                                >
                                    {assignmentTypeOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            )}
                        />
                        {errors.assignment && <p className="text-red-600 text-sm">{errors.assignment.message}</p>}
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
                        disabled={isBusy || (!isEditing && dalDersOptions.length === 0)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {isBusy ? 'Kaydediliyor...' : (isEditing ? 'Güncelle' : 'Ekle')}
                    </button>
                </div>
            </form>
        </Modal>
    );
} 