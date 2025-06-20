'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { PlusIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { z } from 'zod';

// Import actions and types
import {
  fetchTeacherAssignments,
  createTeacherAssignment,
  updateTeacherAssignment,
  deleteTeacherAssignment
} from '@/actions/teacherAssignmentActions';
import { fetchTeacherById } from '@/actions/teacherActions';
import { fetchAllDersOptions } from '@/actions/dalDersActions';
import { Teacher } from '@/types/teachers';
import {
    TeacherCourseAssignment,
    TeacherCourseAssignmentFormValues,
    AssignmentType
} from '@/types/teacherCourseAssignments';

// Import the real components
import { TeacherAssignmentsList } from '@/components/scheduling/TeacherAssignmentsList';
import { TeacherAssignmentFormModal } from '@/components/scheduling/TeacherAssignmentFormModal';

// Define the type for the options fetched by fetchAllDersOptions
interface DersOption {
    id: string;
    dersAdi: string;
    sinifSeviyesi: number;
    dalAdi: string;
}

export default function TeacherAssignmentsPage() {
    const params = useParams();
    const teacherId = params.teacherId as string;
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<TeacherCourseAssignment | null>(null);

    // Fetch Teacher details
    const { data: teacher, isLoading: isLoadingTeacher } = useQuery<Teacher | null, Error>({
        queryKey: ['teacher', teacherId],
        queryFn: () => fetchTeacherById(teacherId),
        enabled: !!teacherId,
    });

    // Fetch existing assignments for this teacher
    const { data: assignments = [], isLoading: isLoadingAssignments } = useQuery<TeacherCourseAssignment[], Error>({
        queryKey: ['teacherAssignments', teacherId],
        queryFn: () => fetchTeacherAssignments(teacherId),
        enabled: !!teacherId,
    });

    // Fetch ALL ders options for the selection modal dropdown
    const { data: allDersOptions = [], isLoading: isLoadingDersOptions } = useQuery<DersOption[], Error>({
        queryKey: ['allDersOptionsForAssignment'], 
        queryFn: fetchAllDersOptions, // Use the correct action
    });

     // Create a map for quick lookup of DalDers details (dersAdi) by ID from options
    // Note: This map might have less info than the previous one if fetchAllDersOptions only returns id/name
    const dersOptionsMap = useMemo(() => {
        const map = new Map<string, DersOption>();
        allDersOptions.forEach(ders => map.set(ders.id, ders));
        return map;
    }, [allDersOptions]);
    
     // We also need a map for the assignments list to show dersAdi/sinifSeviyesi from the fetched assignments
    const assignmentDersDetailsMap = useMemo(() => {
        const map = new Map<string, { dersAdi?: string; sinifSeviyesi?: number }>();
        assignments.forEach(assignment => {
            if (assignment.dal_ders_id && assignment.dal_ders) {
                map.set(assignment.dal_ders_id, {
                    dersAdi: assignment.dal_ders.dersAdi,
                    sinifSeviyesi: assignment.dal_ders.sinifSeviyesi,
                });
            }
        });
        return map;
    }, [assignments]);

    // Merge with all lessons options as fallback for missing nested data
    const mergedDersMap = useMemo(() => {
        const map = new Map<string, { dersAdi?: string; sinifSeviyesi?: number }>();
        // add all options as fallback
        allDersOptions.forEach(opt => {
            map.set(opt.id, { dersAdi: opt.dersAdi, sinifSeviyesi: opt.sinifSeviyesi });
        });
        // override with nested dal_ders data when available
        assignments.forEach(assignment => {
            if (assignment.dal_ders_id && assignment.dal_ders) {
                map.set(assignment.dal_ders_id, { dersAdi: assignment.dal_ders.dersAdi, sinifSeviyesi: assignment.dal_ders.sinifSeviyesi });
            }
        });
        return map;
    }, [allDersOptions, assignments]);

    // Filter out dersler that are already assigned to this teacher for the Add modal dropdown
    const availableDersOptions = useMemo(() => {
        const assignedDersIds = new Set(assignments.map(a => a.dal_ders_id));
        // Filter the options fetched by fetchAllDersOptions
        return allDersOptions.filter(ders => !assignedDersIds.has(ders.id)); 
    }, [allDersOptions, assignments]);

    // Mutations
    const createMutation = useMutation({
        mutationFn: (vars: { dalDersId: string; payload: TeacherCourseAssignmentFormValues }) =>
            createTeacherAssignment(teacherId, vars.dalDersId, vars.payload),
        onSuccess: (data) => {
            console.log('[TeacherAssignmentsPage] createMutation onSuccess received:', data);
            if (data?.success) {
                console.log('[TeacherAssignmentsPage] createMutation successful. Invalidating queries and showing success toast.');
                queryClient.invalidateQueries({ queryKey: ['teacherAssignments', teacherId] });
                toast.success('Ders ataması başarıyla eklendi!');
                setIsModalOpen(false);
            } else {
                 // Log the specific error received from the action
                console.error('[TeacherAssignmentsPage] createMutation failed:', data?.error);
                 // Format error message properly, handling potential Zod issues array
                let errorMessage = 'Bilinmeyen bir hata oluştu.';
                if (data?.error) {
                    if (typeof data.error === 'string') {
                        errorMessage = data.error;
                    } else if (Array.isArray(data.error)) { // Handle Zod issues array
                         errorMessage = data.error.map((e: z.ZodIssue) => e.message).join(', ');
                    }
                }
                toast.error(`Ekleme başarısız: ${errorMessage}`);
                // Optionally keep the modal open on failure?
                 // setIsModalOpen(false);
            }
        },
        onError: (err) => {
             console.error('[TeacherAssignmentsPage] createMutation onError caught:', err);
            toast.error(`Hata: ${err instanceof Error ? err.message : String(err)}`);
        },
    });

    const updateMutation = useMutation({
        mutationFn: (vars: { assignmentId: string; payload: TeacherCourseAssignmentFormValues }) =>
            updateTeacherAssignment(vars.assignmentId, teacherId, vars.payload),
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: ['teacherAssignments', teacherId] });
                toast.success('Atama türü başarıyla güncellendi!');
                setIsModalOpen(false);
                setEditingAssignment(null);
            } else {
                 const errorMessage = typeof data.error === 'string' ? data.error : (data.error as z.ZodIssue[]).map(e => e.message).join(', ');
                 toast.error(`Güncelleme başarısız: ${errorMessage || 'Bilinmeyen hata'}`);
            }
        },
        onError: (err) => {
            toast.error(`Hata: ${err instanceof Error ? err.message : String(err)}`);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (vars: { assignmentId: string }) => 
            deleteTeacherAssignment(vars.assignmentId, teacherId),
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: ['teacherAssignments', teacherId] });
                toast.success('Ders ataması başarıyla silindi!');
            } else {
                toast.error(`Silme başarısız: ${data.error || 'Bilinmeyen hata'}`);
            }
        },
        onError: (err) => {
            toast.error(`Hata: ${err instanceof Error ? err.message : String(err)}`);
        },
    });

    // Handlers
    const handleAdd = () => {
        setEditingAssignment(null);
        setIsModalOpen(true);
    };

    const handleEdit = (assignment: TeacherCourseAssignment) => {
        setEditingAssignment(assignment);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Bu ders atamasını silmek istediğinizden emin misiniz?')) {
            deleteMutation.mutate({ assignmentId: id });
        }
    };

    const handleFormSubmit = (data: TeacherCourseAssignmentFormValues & { dal_ders_id?: string }) => {
        console.log('[TeacherAssignmentsPage] handleFormSubmit called with data:', data);
        if (editingAssignment?.id) {
             console.log('[TeacherAssignmentsPage] Calling updateMutation...');
             updateMutation.mutate({ assignmentId: editingAssignment.id, payload: { assignment: data.assignment } });
        } else if (data.dal_ders_id) {
            const mutationPayload = { dalDersId: data.dal_ders_id, payload: { assignment: data.assignment } };
            console.log('[TeacherAssignmentsPage] dal_ders_id found. Calling createMutation with:', JSON.stringify(mutationPayload, null, 2));
            createMutation.mutate(mutationPayload);
        } else {
             console.log('[TeacherAssignmentsPage] No dal_ders_id found or in edit mode without ID. Showing error toast.');
            toast.error('Ders seçimi yapılmadı veya geçersiz işlem.');
        }
    };

    const isLoading = isLoadingTeacher || isLoadingAssignments || isLoadingDersOptions;
    const mutationLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
    const pageTitle = isLoadingTeacher ? 'Öğretmen Yükleniyor...' : teacher ? `${teacher.name} - Ders Atamaları (Uzmanlık/Tercih)` : 'Öğretmen Bulunamadı';

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Link
                        href="/dashboard/area-teachers" // Link back to the teacher list
                        className="text-sm text-gray-600 hover:text-gray-800 inline-flex items-center mb-1"
                    >
                        <ArrowLeftIcon className="h-4 w-4 mr-1" />
                        Öğretmen Listesine Geri Dön
                    </Link>
                    <h1 className="text-2xl font-semibold text-gray-800">{pageTitle}</h1>
                </div>
                <button
                    onClick={handleAdd}
                    disabled={isLoading || availableDersOptions.length === 0} // Disable if no courses available to assign
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                    title={availableDersOptions.length === 0 ? "Bu öğretmene atanacak uygun ders bulunmuyor." : "Yeni Ders Ataması Ekle"}
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Yeni Atama Ekle
                </button>
            </div>

            {isLoading && <p>Veriler yükleniyor...</p>}
            {/* Display specific errors if needed */}

            {!isLoading && (
                <TeacherAssignmentsList
                    assignments={assignments}
                    dalDersMap={mergedDersMap}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            {isModalOpen && (
                <TeacherAssignmentFormModal
                    initialData={editingAssignment ?? undefined}
                    onSubmit={handleFormSubmit}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingAssignment(null);
                    }}
                    loading={mutationLoading}
                    dalDersOptions={availableDersOptions}
                    dalDersMap={dersOptionsMap}
                />
            )}
        </div>
    );
} 