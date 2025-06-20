'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTeachers, createTeacher, updateTeacher, deleteTeacher, fetchBranches, Branch, createBranch, updateTeacherActiveStatus } from '@/actions/teacherActions';
import { AreaTeachersTable } from '@/components/teachers/AreaTeachersTable';
import { AreaTeacherFormModal } from '@/components/teachers/AreaTeacherFormModal';
import { BranchFormModal } from '@/components/branches/BranchFormModal';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { Teacher, TeacherFormValues } from '@/types/teachers';
import { BranchFormValues } from '@/types/branches';
import { useSemesterStore } from '@/stores/useSemesterStore';
import { AcademicCapIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const ITEMS_PER_PAGE = 10;

// Define the enriched type within the page component scope
interface TeacherWithBranchName extends Teacher {
  branchName: string | null;
}

export default function AreaTeachersPage() {
  const queryClient = useQueryClient();
  const selectedSemesterId = useSemesterStore((state) => state.selectedSemesterId);
  const setSelectedSemesterId = useSemesterStore((state) => state.setSelectedSemesterId);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Partial<Teacher> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBranch, setSelectedBranch] = useState<string>('');

  // Fetch teachers - FILTER BY SEMESTER
  const { data: teachers = [], isLoading: isLoadingTeachers, error: errorTeachers } = useQuery<Partial<Teacher>[], Error>({
    // Include semester in key
    queryKey: ['teachers', selectedSemesterId],
    // Pass semesterId to fetch function
    queryFn: () => fetchTeachers(selectedSemesterId ?? undefined),
    // Only fetch if semester is selected
    enabled: !!selectedSemesterId,
  });

  // Fetch branches
  const { data: branches = [], isLoading: isLoadingBranches, error: errorBranches } = useQuery<Branch[], Error>({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  });

  // Effect to set the default branch selection once branches load
  useEffect(() => {
    // Check if branches are loaded, not loading, and default hasn't been set
    if (!isLoadingBranches && branches.length > 0 && selectedBranch === '') {
      const defaultBranch = branches.find(branch => branch.name === 'Bilişim Teknolojileri');
      if (defaultBranch) {
        setSelectedBranch(defaultBranch.id); // Set state to the ID
      }
    }
    // We only want this effect to potentially run when branches load,
    // and only *set* the default if selectedBranch is still initial.
    // Including selectedBranch in deps prevents resetting user selection.
  }, [branches, isLoadingBranches, selectedBranch]);

  // Log the branches order as received by the component
  useEffect(() => {
    if (!isLoadingBranches && branches.length > 0) {
      console.log('Branches received by component:', JSON.stringify(branches.map(b => b.name)));
    }
  }, [branches, isLoadingBranches]);

  // Create a map for branch names
  const branchesMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach(branch => map.set(branch.id, branch.name));
    return map;
  }, [branches]);

  // Filter teachers based on selected branch
  const filteredTeachers = useMemo(() => {
    if (!selectedBranch) return teachers;
    return teachers.filter(teacher => teacher.branchId === selectedBranch);
  }, [teachers, selectedBranch]);

  // Reset page to 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranch]);

  // --- Pagination Logic (using filteredTeachers) --- Start
  const totalTeachers = filteredTeachers.length;
  const totalPages = Math.ceil(totalTeachers / ITEMS_PER_PAGE);
  const safeCurrentPage = Math.min(currentPage, totalPages || 1); // Ensure currentPage is valid

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Use safeCurrentPage for calculations
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPartialTeachers = filteredTeachers.slice(startIndex, endIndex);

  // Map paginated partial teachers to full Teacher objects with branchName
  const paginatedTeachersWithBranchName: TeacherWithBranchName[] = useMemo(() => 
      paginatedPartialTeachers.map(teacher => ({
        ...teacher,
        id: teacher.id ?? '', // Should always have an ID here
        name: teacher.name ?? '', 
        birthDate: teacher.birthDate ?? null,
        role: teacher.role ?? null,
        phone: teacher.phone ?? null,
        branchId: teacher.branchId ?? null,
        branchName: teacher.branchId ? branchesMap.get(teacher.branchId) ?? null : null,
        is_active: teacher.is_active ?? true, // Default to true if undefined
        createdAt: teacher.createdAt,
        updatedAt: teacher.updatedAt,
      } as TeacherWithBranchName)), // Explicit type assertion can help clarity
    [paginatedPartialTeachers, branchesMap]);
  // --- Pagination Logic --- End

  // Combine loading states
  const isLoading = isLoadingTeachers || isLoadingBranches;
  // Combine errors (simple approach, show first error)
  const error = errorTeachers || errorBranches;

  // Mutations (remain the same, but adapt handleEdit/handleFormSubmit)
  const createTeacherMutation = useMutation({
    // Pass semesterId when calling createTeacher
    mutationFn: (payload: TeacherFormValues) => {
        if (!selectedSemesterId) throw new Error('Cannot create teacher without a selected semester.');
        return createTeacher(payload, selectedSemesterId);
    },
    onSuccess: (data) => {
        if (data.success) {
            toast.success('Öğretmen başarıyla eklendi.');
            queryClient.invalidateQueries({ queryKey: ['teachers', selectedSemesterId] }); // Invalidate with semesterId
            setIsTeacherModalOpen(false);
        } else {
            toast.error(`Öğretmen eklenemedi: ${data.error}`);
        }
    },
     onError: (err) => {
        toast.error(`Hata: ${err.message}`);
    },
  });

  const updateTeacherMutation = useMutation({
    // Update doesn't need semesterId passed typically
    mutationFn: (vars: { id: string; payload: TeacherFormValues }) => updateTeacher(vars.id, vars.payload),
    onSuccess: (data) => {
        if (data.success) {
            toast.success('Öğretmen başarıyla güncellendi.');
            queryClient.invalidateQueries({ queryKey: ['teachers', selectedSemesterId] }); // Invalidate with semesterId
            setIsTeacherModalOpen(false);
            setEditingTeacher(null);
        } else {
            toast.error(`Öğretmen güncellenemedi: ${data.error}`);
        }
    },
     onError: (err) => {
        toast.error(`Hata: ${err.message}`);
    },
  });

   const deleteTeacherMutation = useMutation({
        mutationFn: deleteTeacher,
        onSuccess: (data) => {
            if (data.success) {
                toast.success('Öğretmen başarıyla silindi.');
                queryClient.invalidateQueries({ queryKey: ['teachers', selectedSemesterId] }); // Invalidate with semesterId
            } else {
                toast.error(`Öğretmen silinemedi: ${data.error}`);
            }
        },
        onError: (err) => {
             toast.error(`Hata: ${err.message}`);
        },
    });

  // --- Branch Mutation --- Start
  const createBranchMutation = useMutation({
      mutationFn: createBranch,
      onSuccess: (data) => {
          if (data.success) {
              queryClient.invalidateQueries({ queryKey: ['branches'] }); // Invalidate branches query
              toast.success(`Branş "${data.branch?.name}" başarıyla eklendi!`);
              setIsBranchModalOpen(false);
          } else {
              toast.error(`Branş eklenemedi: ${data.error}`);
          }
      },
      onError: (err: Error) => {
          toast.error(`Branş eklenemedi: ${err.message}`);
          console.error("Create branch error:", err);
      },
  });
  // --- Branch Mutation --- End

  // --- NEW: Status Update Mutation --- 
  const updateStatusMutation = useMutation({
    mutationFn: (variables: { teacherId: string; isActive: boolean }) => 
      updateTeacherActiveStatus(variables.teacherId, variables.isActive),
    onSuccess: (data, variables) => {
      if (data.success) {
        // Invalidate teachers query to refetch updated data
        queryClient.invalidateQueries({ queryKey: ['teachers', selectedSemesterId] });
        toast.success('Öğretmen durumu güncellendi!');
      } else {
        toast.error(`Durum güncellenemedi: ${data.error}`);
        // Optionally re-fetch to revert optimistic UI if needed, but invalidation is usually enough
        // queryClient.invalidateQueries({ queryKey: ['teachers'] });
      }
    },
    onError: (err, variables) => {
      toast.error(`Durum güncellenirken hata: ${err instanceof Error ? err.message : String(err)}`);
      // Optionally re-fetch to revert optimistic UI
      // queryClient.invalidateQueries({ queryKey: ['teachers'] }); 
    },
  });
  // --- END: Status Update Mutation ---

  // Handlers
  const handleAddTeacher = () => {
    setEditingTeacher(null);
    setIsTeacherModalOpen(true);
  };

  const handleEditTeacher = (teacher: TeacherWithBranchName) => {
    setEditingTeacher(teacher);
    setIsTeacherModalOpen(true);
  };

  const handleDeleteTeacher = (teacherId: string) => {
    if (window.confirm('Bu öğretmeni silmek istediğinizden emin misiniz?')) {
      deleteTeacherMutation.mutate(teacherId);
    }
  };

  // Adapt handleFormSubmit - ensure payload matches TeacherFormValues
  const handleTeacherFormSubmit = (data: TeacherFormValues) => {
    console.log('[Page] handleFormSubmit called with data:', data);
    if (editingTeacher?.id) {
       console.log('[Page] Attempting to update teacher:', editingTeacher.id);
       // Pass only TeacherFormValues fields
       const updatePayload: TeacherFormValues = {
         name: data.name,
         birthDate: data.birthDate, // Ensure form provides Date or null
         role: data.role,
         phone: data.phone,       // <<< Add phone
         branchId: data.branchId, // <<< Add branchId
         // is_active durumu genellikle ayrı bir mekanizma ile (toggle gibi) yönetilir,
         // bu yüzden form submit'te gönderilmesi gerekmeyebilir.
       };
       console.log('[Page] Update payload:', updatePayload);
       updateTeacherMutation.mutate({ id: editingTeacher.id, payload: updatePayload });
    } else {
       console.log('[Page] Attempting to create teacher');
       // Ensure the data object passed directly matches TeacherFormValues expected by createTeacher
       const createPayload: TeacherFormValues = {
         name: data.name,
         birthDate: data.birthDate,
         role: data.role,
         phone: data.phone,        // <<< Add phone
         branchId: data.branchId,  // <<< Add branchId
         // is_active? Yeni öğretmen varsayılan olarak aktif mi olmalı?
       };
        console.log('[Page] Create payload:', createPayload);
        createTeacherMutation.mutate(createPayload);
    }
  };

  // --- Branch Handlers --- Start
  const handleAddBranch = () => {
      setIsBranchModalOpen(true);
  };

  const handleBranchFormSubmit = (data: BranchFormValues) => {
      createBranchMutation.mutate(data);
  };
  // --- Branch Handlers --- End

  // --- NEW: Status Toggle Handler ---
  const handleToggleActiveStatus = (teacherId: string, currentStatus: boolean) => {
    console.log(`Toggling status for ${teacherId}, current: ${currentStatus}`);
    // Call the mutation with the *new* desired status (opposite of current)
    updateStatusMutation.mutate({ teacherId, isActive: !currentStatus });
  };
  // --- END: Status Toggle Handler ---

  const teacherMutationLoading = createTeacherMutation.isPending || updateTeacherMutation.isPending || deleteTeacherMutation.isPending || updateStatusMutation.isPending;
  const branchMutationLoading = createBranchMutation.isPending;

  // Conditional rendering for missing semester, loading, and error states
  if (!selectedSemesterId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <AcademicCapIcon className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Sömestr Seçilmedi</h2>
        <p className="text-gray-500">
          Lütfen öğretmenleri görüntülemek için bir sömestr seçin. Sömestr yönetimi sayfasından aktif bir sömestr belirleyebilirsiniz.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-red-50 border border-red-200 rounded-md">
        <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-lg font-semibold text-red-700">Veri Yüklenirken Hata Oluştu</h2>
        <p className="text-red-600">
          Öğretmen veya branş verileri yüklenirken bir sorun oluştu. Lütfen daha sonra tekrar deneyin.
        </p>
        <pre className="mt-2 text-xs text-red-500 bg-red-100 p-2 rounded overflow-auto">
          {error.message}
        </pre>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-blue-700">Alan Öğretmenleri Yönetimi</h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={handleAddTeacher}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Yeni Öğretmen Ekle
          </button>
          <button
            onClick={handleAddBranch}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            title="Yeni Branş Ekle"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Yeni Branş Ekle
          </button>
        </div>
      </div>
      
      {/* Filter Section */}
      <div className="mb-4">
          <label htmlFor="branchFilter" className="block text-sm font-medium text-gray-700 mb-1">Branşa Göre Filtrele:</label>
          <select 
            id="branchFilter"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            disabled={isLoadingBranches}
            className="mt-1 block w-full sm:w-1/3 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
          >
              <option value="">-- Tüm Branşlar --</option>
              {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
          </select>
      </div>

      {!isLoading && !error && (
        <>
          {console.log('[AreaTeachersPage] Rendering AreaTeachersTable, typeof handleToggleActiveStatus:', typeof handleToggleActiveStatus)}
          <AreaTeachersTable 
            teachers={paginatedTeachersWithBranchName} 
            onEdit={handleEditTeacher} 
            onDelete={handleDeleteTeacher} 
            onToggleActiveStatus={handleToggleActiveStatus}
          />
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={handlePreviousPage}
                disabled={safeCurrentPage === 1 || teacherMutationLoading || branchMutationLoading || updateStatusMutation.isPending}
                className="flex items-center px-4 py-2 border rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                Önceki
              </button>
              <span className="text-sm text-gray-600">
                Sayfa {safeCurrentPage} / {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={safeCurrentPage === totalPages || teacherMutationLoading || branchMutationLoading || updateStatusMutation.isPending}
                className="flex items-center px-4 py-2 border rounded text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </button>
            </div>
          )}
        </>
      )}

      {isTeacherModalOpen && (
        <AreaTeacherFormModal
          initialData={editingTeacher ? {
              name: editingTeacher.name ?? '',
              birthDate: editingTeacher.birthDate || null,
              role: editingTeacher.role || null,
              phone: editingTeacher.phone || null,
              branchId: editingTeacher.branchId || null,
          } : undefined}
          onSubmit={handleTeacherFormSubmit}
          onClose={() => setIsTeacherModalOpen(false)}
          loading={teacherMutationLoading}
          branches={branches}
        />
      )}
      
      {isBranchModalOpen && (
          <BranchFormModal 
            isOpen={isBranchModalOpen}
            onSubmit={handleBranchFormSubmit}
            onClose={() => setIsBranchModalOpen(false)}
            loading={branchMutationLoading}
          />
      )}
    </div>
  );
} 