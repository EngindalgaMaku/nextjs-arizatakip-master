'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Modal from '@/components/Modal';
import { ClassSchema, ClassFormValues, ClassFormSchema } from '@/types/classes';
import type { Teacher } from '@/types/teachers';
import type { Student } from '@/types/students'; // Import Student type
import { useQuery } from '@tanstack/react-query';
import { fetchTeachers } from '@/actions/teacherActions';
import { fetchStudentsByClass } from '@/actions/studentActions'; // Import student fetch action
import { fetchBranchesForSelect, fetchDallarByBranch } from '@/actions/dalActions'; // Import branch and dal functions
import type { Dal } from '@/types/dallar'; // Import Dal type

interface ClassFormModalProps {
  initialData?: ClassFormValues;
  classId?: string; // Add classId prop, optional
  onSubmit: (data: ClassFormValues) => void;
  onClose: () => void;
  loading?: boolean;
}

// Pass classId down
export function ClassFormModal({ initialData, classId, onSubmit, onClose, loading = false }: ClassFormModalProps) {
  // Use classId to determine if we're editing
  const isEditing = !!classId;
  // State to track the selected branch
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(initialData?.branch_id || null);

  // Fetch teachers for the dropdown (always needed)
  const { data: teachers = [], isLoading: isLoadingTeachers, error: teachersError } = useQuery<Teacher[], Error>({ 
    queryKey: ['teachers'],
    queryFn: () => fetchTeachers() as Promise<Teacher[]>, // Assert Promise<Teacher[]>
  });

  // Fetch students for the president dropdown *only if editing*
  const { data: students = [], isLoading: isLoadingStudents } = useQuery<Student[], Error>({
    queryKey: ['students', classId], // Query key depends on classId
    queryFn: () => fetchStudentsByClass(classId!), // Fetch only if classId exists
    enabled: !!classId && isEditing, // Only run query if classId is present and we are editing
  });

  // Fetch branches list for dropdown
  const { data: branches = [], isLoading: isLoadingBranches } = useQuery({
    queryKey: ['branchesForSelect'],
    queryFn: fetchBranchesForSelect,
  });

  // Fetch dallar based on selected branch
  const { data: dallarList = [], isLoading: isLoadingDallar } = useQuery({
    queryKey: ['dallar', selectedBranchId],
    queryFn: () => fetchDallarByBranch(selectedBranchId!),
    enabled: !!selectedBranchId, // Only run if a branch is selected
  });

  const { register, handleSubmit, control, formState: { errors, isSubmitting }, watch, setValue } = useForm<ClassFormValues>({
    resolver: zodResolver(ClassFormSchema),
    defaultValues: initialData ?? {
      name: '',
      branch_id: null,
      dal_id: null,
      classTeacherId: null, // Default to null for dropdown
      classPresidentName: '', // President name stored as string
    },
  });

  // Watch branch_id to update dallar dropdown
  const watchedBranchId = watch('branch_id');
  
  // Update selected branch when branch_id changes
  useEffect(() => {
    if (watchedBranchId !== selectedBranchId) {
      setSelectedBranchId(watchedBranchId || null);
      // Reset dal_id when branch changes
      if (watchedBranchId !== initialData?.branch_id) {
        setValue('dal_id', null);
      }
    }
  }, [watchedBranchId, selectedBranchId, setValue, initialData?.branch_id]);

  // Combined loading state
  const isBusy = loading || isSubmitting || isLoadingTeachers || (isEditing && isLoadingStudents) || isLoadingBranches || isLoadingDallar;

  return (
    <Modal isOpen onClose={onClose} title={isEditing ? 'Sınıf Düzenle' : 'Yeni Sınıf'}>
       <form onSubmit={handleSubmit((data) => {
          console.log('[ClassFormModal] Data submitted from form:', data);
          // Ensure president name is empty string if not editing, as dropdown won't be rendered
          const finalData = isEditing ? data : { ...data, classPresidentName: '' }; 
          console.log('[ClassFormModal] Final data being passed to onSubmit:', finalData);
          onSubmit(finalData);
        })} 
        className="space-y-4"
      >
        <fieldset disabled={isBusy} className="space-y-4">
          {/* Class Name */}
          <div>
            <label htmlFor="className" className="block text-sm font-medium text-gray-700">Sınıf Adı</label>
            <input id="className" autoFocus type="text" placeholder="10-A, ATP 11-B vb." {...register('name')} aria-invalid={errors.name ? 'true' : 'false'} className={`mt-1 block w-full rounded p-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'}`}/>
            {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
          </div>

          {/* Grade Level - Sınıf Seviyesi */}
          <div>
            <label htmlFor="grade_level" className="block text-sm font-medium text-gray-700">Sınıf Seviyesi</label>
            <Controller
                name="grade_level"
                control={control}
                render={({ field }) => (
                    <select
                        id="grade_level"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
                        className={`mt-1 block w-full rounded p-2 border ${errors.grade_level ? 'border-red-500' : 'border-gray-300'}`}
                    >
                        <option value="">-- Sınıf Seviyesi Seçin --</option>
                        <option value="9">9. Sınıf</option>
                        <option value="10">10. Sınıf</option>
                        <option value="11">11. Sınıf</option>
                        <option value="12">12. Sınıf</option>
                    </select>
                )}
            />
            {errors.grade_level && <p className="text-red-600 text-sm">{errors.grade_level.message}</p>}
          </div>

          {/* Branch - Branş Dropdown */}
          <div>
            <label htmlFor="branch_id" className="block text-sm font-medium text-gray-700">Branş</label>
            <Controller
                name="branch_id"
                control={control}
                render={({ field }) => (
                    <select
                        id="branch_id"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className={`mt-1 block w-full rounded p-2 border ${errors.branch_id ? 'border-red-500' : 'border-gray-300'}`}
                        disabled={isLoadingBranches}
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
            {isLoadingBranches && <p className="text-sm text-gray-500 mt-1">Branşlar yükleniyor...</p>}
            {errors.branch_id && <p className="text-red-600 text-sm">{errors.branch_id.message}</p>}
          </div>
          
          {/* Dal Dropdown */}
          <div>
            <label htmlFor="dal_id" className="block text-sm font-medium text-gray-700">Dal</label>
            <Controller
                name="dal_id"
                control={control}
                render={({ field }) => (
                    <select
                        id="dal_id"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className={`mt-1 block w-full rounded p-2 border ${errors.dal_id ? 'border-red-500' : 'border-gray-300'}`}
                        disabled={isLoadingDallar || !selectedBranchId}
                    >
                        <option value="">-- Dal Seçiniz --</option>
                        {dallarList.map((dal) => (
                            <option key={dal.id} value={dal.id}>
                                {dal.name}
                            </option>
                        ))}
                    </select>
                )}
            />
            {!selectedBranchId && <p className="text-sm text-gray-500 mt-1">Önce bir branş seçin</p>}
            {selectedBranchId && isLoadingDallar && <p className="text-sm text-gray-500 mt-1">Dallar yükleniyor...</p>}
            {errors.dal_id && <p className="text-red-600 text-sm">{errors.dal_id.message}</p>}
          </div>

           {/* Class Teacher Dropdown */}
           <div>
            <label htmlFor="classTeacherId" className="block text-sm font-medium text-gray-700">Sınıf Öğretmeni</label>
            <Controller name="classTeacherId" control={control}
               render={({ field }) => (
                 <select id="classTeacherId" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value || null)} className={`mt-1 block w-full rounded p-2 border ${errors.classTeacherId ? 'border-red-500' : 'border-gray-300'}`}>
                    <option value="">-- Öğretmen Seçiniz --</option>
                    {teachers.map((teacher) => (<option key={teacher.id} value={teacher.id}>{teacher.name}</option>))} 
                 </select>
               )}
            />
             {isLoadingTeachers && <p className="text-sm text-gray-500">Öğretmenler yükleniyor...</p>}
             {errors.classTeacherId && <p className="text-red-600 text-sm">{errors.classTeacherId.message}</p>}
          </div>

           {/* Class President - Conditional Rendering */}
          <div>
            <label htmlFor="classPresidentName" className="block text-sm font-medium text-gray-700">Sınıf Başkanı</label>
            {isEditing ? (
              // EDITING MODE: Show dropdown
               <Controller
                 name="classPresidentName"
                 control={control}
                 defaultValue={initialData?.classPresidentName || ''} // Set initial value for dropdown
                 render={({ field }) => ( 
                    <select
                      id="classPresidentName"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      className={`mt-1 block w-full rounded p-2 border ${errors.classPresidentName ? 'border-red-500' : 'border-gray-300'}`}
                      disabled={isLoadingStudents} // Disable while loading students
                    >
                      <option value="">-- Öğrenci Seçiniz --</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.name}> {/* Use student name as value */}
                          {student.name}
                        </option>
                      ))}
                    </select>
                 )}
               />
            ) : (
              // CREATING MODE: Show disabled text/input
               <input
                  id="classPresidentName"
                  type="text"
                  className="mt-1 block w-full rounded p-2 border border-gray-300 bg-gray-100"
                  value="Sınıfı kaydedince seçilebilir"
                  readOnly // Use readOnly instead of disabled to avoid skipping submission
                  tabIndex={-1} // Remove from tab order
                />
            )}
             {isEditing && isLoadingStudents && <p className="text-sm text-gray-500">Öğrenciler yükleniyor...</p>}
             {errors.classPresidentName && <p className="text-red-600 text-sm">{errors.classPresidentName.message}</p>}
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