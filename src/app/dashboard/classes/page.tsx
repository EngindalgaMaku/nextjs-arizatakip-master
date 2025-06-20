'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClasses, createClass, updateClass, deleteClass } from '@/actions/classActions';
import { fetchTeachers } from '@/actions/teacherActions'; // To build teacher map
import { fetchBranches } from '@/actions/branchActions'; // <<< Import fetchBranches
import { fetchDallar } from '@/actions/dalActions'; // <<< Import fetchDallar
import { Class, ClassFormValues } from '@/types/classes';
import { Teacher } from '@/types/teachers';
import { Branch } from '@/types/branches'; // <<< Import Branch type
import { Dal } from '@/types/dallar'; // <<< Import Dal type
import { ClassesTable } from '@/components/classes/ClassesTable';
import { ClassFormModal } from '@/components/classes/ClassFormModal';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useSemesterStore } from '@/stores/useSemesterStore';

export default function ClassesPage() {
  const queryClient = useQueryClient();
  const { selectedSemesterId } = useSemesterStore(); // Get selected semester ID

  // Fetch Classes
  const { data: classesRaw = [], isLoading: isLoadingClasses, error: errorClasses } = useQuery<Class[], Error>({
    queryKey: ['classes', selectedSemesterId],
    queryFn: () => fetchClasses(selectedSemesterId || undefined),
    enabled: !!selectedSemesterId,
  });

  // Fetch Teachers 
  const { data: teachers = [], isLoading: isLoadingTeachers } = useQuery<Teacher[], Error>({
    queryKey: ['teachers', selectedSemesterId],
    queryFn: () => fetchTeachers(selectedSemesterId || undefined) as Promise<Teacher[]>, 
    enabled: !!selectedSemesterId,
  });

  // Fetch Branches
  const { data: branches = [], isLoading: isLoadingBranches, error: errorBranchesFetch } = useQuery<Branch[], Error>({
    queryKey: ['allBranches'], // Use a distinct query key for all branches
    queryFn: fetchBranches,
    // Branches are not semester-specific for this lookup, so no semesterId needed here
  });

  // Fetch Dallar
  const { data: dallar = [], isLoading: isLoadingDallar, error: errorDallarFetch } = useQuery<Dal[], Error>({
    queryKey: ['allDallar'], // Use a distinct query key for all dallar
    queryFn: fetchDallar,
  });

  // Create a map for quick teacher name lookup
  const teachersMap = React.useMemo(() => {
    const map = new Map<string, string>();
    teachers.forEach(teacher => {
        map.set(teacher.id, teacher.name);
    });
    return map;
  }, [teachers]);

  // Create a map for quick branch name lookup
  const branchesMap = React.useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach(branch => {
      if (branch.id && branch.name) { // Ensure id and name are present
        map.set(branch.id, branch.name);
      }
    });
    return map;
  }, [branches]);

  // Create a map for quick dal name lookup
  const dalsMap = React.useMemo(() => {
    const map = new Map<string, string>();
    dallar.forEach(dal => {
      if (dal.id && dal.name) { // Ensure id and name are present
        map.set(dal.id, dal.name);
      }
    });
    return map;
  }, [dallar]);

  // Enhance classes data with branch_name and dal_name
  const classes = React.useMemo(() => {
    return classesRaw.map(cls => ({
      ...cls,
      branch_name: cls.branch_id ? branchesMap.get(cls.branch_id) || null : null,
      dal_name: cls.dal_id ? dalsMap.get(cls.dal_id) || null : null,
      teacherName: cls.classTeacherId ? teachersMap.get(cls.classTeacherId) || null : null,
    }));
  }, [classesRaw, branchesMap, dalsMap, teachersMap]);

  // Mutations
  const createMutation = useMutation({
    // mutationFn should now accept semesterId or get it from the store
    mutationFn: (payload: ClassFormValues) => {
      if (!selectedSemesterId) {
        // Or handle this more gracefully, maybe disable the form if no semester
        return Promise.reject(new Error('Aktif sömestr seçili değil.')); 
      }
      return createClass(payload, selectedSemesterId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes', selectedSemesterId] }), // Invalidate with semesterId
    onError: (error) => {
      console.error("Error creating class:", error);
      // TODO: Add user notification (e.g., toast)
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ClassFormValues }) => updateClass(id, payload),
    onSuccess: () => {
      console.log('Class updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
     onError: (error, variables) => {
      console.error("--- UPDATE CLASS MUTATION ERROR ---");
      console.error("Error:", error);
      console.error("Variables passed to mutationFn:", variables); 
      // TODO: Add user notification
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClass(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
     onError: (error) => {
      console.error("Error deleting class:", error);
      // TODO: Add user notification
    },
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingClass, setEditingClass] = React.useState<(ClassFormValues & { id?: string }) | null>(null);

  const handleAdd = () => {
    setEditingClass(null);
    setIsModalOpen(true);
  };

  const handleEdit = (cls: Class) => {
    // Prepare initialData for the form
    const initialData: ClassFormValues & { id: string } = {
        name: cls.name,
        department: cls.department, // Bu dal_id olarak kullanılacaksa kalabilir veya cls.dal_id kullanılır
        branch_id: cls.branch_id ?? null, // branch_id eklendi
        dal_id: cls.dal_id ?? null, // dal_id eklendi (eğer department ayrı bir alansa)
        classTeacherId: cls.classTeacherId ?? null, 
        classPresidentName: cls.classPresidentName,
        grade_level: cls.grade_level,
        id: cls.id, // Now we can include id directly
    };
    setEditingClass(initialData);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bu sınıfı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
       deleteMutation.mutate(id);
    }
  };

  const handleFormSubmit = (data: ClassFormValues) => {
    let id: string | undefined;
    let formData: ClassFormValues = { ...data };
    
    // Check if we're in edit mode (editingClass has an id)
    if (editingClass && 'id' in editingClass) {
      id = editingClass.id as string;
    }
    
    // Set classTeacherId to null if it's falsy
    formData = {
      ...formData,
      classTeacherId: formData.classTeacherId || null
    };

    if (id) { 
      console.log(`Attempting to update class with ID: ${id}`);
      console.log("Payload prepared for mutation:", formData);
      updateMutation.mutate({ id, payload: formData });
    } else {
      console.log("Attempting to create class with payload:", formData);
      createMutation.mutate(formData);
    }
    setIsModalOpen(false);
  };

  const isLoading = isLoadingClasses || isLoadingTeachers || isLoadingBranches || isLoadingDallar;
  const mutationLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const error = errorClasses || errorBranchesFetch || errorDallarFetch; // Combine errors

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Sınıflar</h1>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isLoading}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Yeni Sınıf Ekle
        </button>
      </div>

      {isLoading && <div>Yükleniyor...</div>}
      {error && <div className="text-red-600">Hata: {error.message}</div>}
      {!isLoading && !error && (
        <ClassesTable
          classes={classes} // Pass fetched classes
          teachersMap={teachersMap} // Pass teacher map
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {isModalOpen && (
        <ClassFormModal
          initialData={editingClass ?? undefined}
          classId={editingClass?.id}
          onSubmit={handleFormSubmit}
          onClose={() => setIsModalOpen(false)}
          loading={mutationLoading}
        />
      )}
    </div>
  );
} 