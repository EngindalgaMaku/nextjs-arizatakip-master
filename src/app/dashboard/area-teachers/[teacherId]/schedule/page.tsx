'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Import useRouter
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTeacherById } from '@/actions/teacherActions'; // Assuming fetchTeacherById exists
import {
  fetchTeacherSchedule,
  createTeacherScheduleEntry,
  updateTeacherScheduleEntry,
  deleteTeacherScheduleEntry,
} from '@/actions/teacherScheduleActions';
import { TeacherScheduleGrid } from '@/components/teachers/TeacherScheduleGrid';
import { TeacherScheduleFormModal } from '@/components/teachers/TeacherScheduleFormModal';
import { TeacherScheduleEntry, TeacherScheduleFormValues } from '@/types/teacherSchedules';
import { Teacher } from '@/types/teachers'; // Import Teacher type
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

export default function TeacherSchedulePage() {
  const params = useParams();
  const router = useRouter(); // For navigation
  const teacherId = params.teacherId as string;
  const queryClient = useQueryClient();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TeacherScheduleEntry | null>(null);
  const [selectedDaySlot, setSelectedDaySlot] = useState<{ day: number; slot: number } | null>(null);

  // Fetch Teacher Details
  const { data: teacher, isLoading: isLoadingTeacher, error: errorTeacher } = useQuery<Teacher | null, Error>({ 
      queryKey: ['teacher', teacherId],
      queryFn: () => fetchTeacherById(teacherId), // TODO: Ensure fetchTeacherById exists in teacherActions
      enabled: !!teacherId,
  });

  // Fetch Teacher Schedule
  const { data: schedule = [], isLoading: isLoadingSchedule, error: errorSchedule } = useQuery<TeacherScheduleEntry[], Error>({ 
    queryKey: ['teacherSchedule', teacherId],
    queryFn: () => fetchTeacherSchedule(teacherId),
    enabled: !!teacherId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: { payload: TeacherScheduleFormValues }) => {
        if (!selectedDaySlot) throw new Error("Day/Slot not selected");
        return createTeacherScheduleEntry(teacherId, selectedDaySlot.day, selectedDaySlot.slot, data.payload);
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['teacherSchedule', teacherId] });
        toast.success('Ders programı girişi eklendi!');
        setIsModalOpen(false);
      } else {
        toast.error(`Giriş eklenemedi: ${data.error}`);
      }
    },
    onError: (err) => {
      toast.error(`Giriş eklenemedi: ${err instanceof Error ? err.message : String(err)}`);
      console.error("Create schedule error:", err);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { entryId: string; payload: TeacherScheduleFormValues }) =>
      updateTeacherScheduleEntry(data.entryId, data.payload),
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['teacherSchedule', teacherId] });
        toast.success('Ders programı girişi güncellendi!');
        setIsModalOpen(false);
        setEditingEntry(null);
      } else {
        toast.error(`Giriş güncellenemedi: ${data.error}`);
      }
    },
    onError: (err, variables) => {
      toast.error(`Giriş güncellenemedi: ${err instanceof Error ? err.message : String(err)}`);
      console.error(`Update schedule error (ID: ${variables.entryId}):`, err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTeacherScheduleEntry,
    onSuccess: (data, entryId) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['teacherSchedule', teacherId] });
        toast.success('Ders programı girişi silindi!');
      } else {
        toast.error(`Giriş silinemedi: ${data.error}`);
      }
    },
    onError: (err, entryId) => {
      toast.error(`Giriş silinemedi: ${err instanceof Error ? err.message : String(err)}`);
      console.error(`Delete schedule error (ID: ${entryId}):`, err);
    },
  });

  // Handlers
  const handleAdd = (dayOfWeek: number, timeSlot: number) => {
    setEditingEntry(null);
    setSelectedDaySlot({ day: dayOfWeek, slot: timeSlot });
    setIsModalOpen(true);
  };

  const handleEdit = (entry: TeacherScheduleEntry) => {
    setEditingEntry(entry);
    setSelectedDaySlot({ day: entry.dayOfWeek, slot: entry.timeSlot });
    setIsModalOpen(true);
  };

  const handleDelete = (entryId: string) => {
    if (window.confirm('Bu ders programı girişini silmek istediğinizden emin misiniz?')) {
      deleteMutation.mutate(entryId);
    }
  };

  const handleFormSubmit = (data: TeacherScheduleFormValues) => {
    if (editingEntry?.id) {
      updateMutation.mutate({ entryId: editingEntry.id, payload: data });
    } else if (selectedDaySlot) {
       createMutation.mutate({ payload: data });
    } else {
        console.error("Cannot submit form without selected slot or editing entry");
        toast.error("Bir hata oluştu, lütfen tekrar deneyin.");
    }
  };

  const isLoading = isLoadingTeacher || isLoadingSchedule;
  const error = errorTeacher || errorSchedule;
  const mutationLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const pageTitle = isLoadingTeacher ? 'Öğretmen Yükleniyor...' : teacher ? `${teacher.name} - Ders Programı` : 'Öğretmen Bulunamadı';

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">{pageTitle}</h1>
        <Link
           href="/dashboard/area-teachers"
           className="text-sm text-gray-600 hover:text-gray-800 inline-flex items-center mb-1"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Öğretmenler Listesine Dön
        </Link>
      </div>

      {isLoading && <p>Program yükleniyor...</p>}
      {error && <p className="text-red-600">Veri yüklenirken bir hata oluştu: {error.message}</p>}

      {!isLoading && !error && (
        <TeacherScheduleGrid
           scheduleData={schedule}
           onAdd={handleAdd}
           onEdit={handleEdit}
           onDelete={handleDelete}
         />
      )}

      {isModalOpen && selectedDaySlot && (
        <TeacherScheduleFormModal
          // Pass only relevant fields from editingEntry if it exists, ensuring correct types
          initialData={editingEntry ? {
              className: editingEntry.className ?? '', // Ensure string
              locationName: editingEntry.locationName ?? null, // Ensure string or null
              classId: editingEntry.classId ?? null // Include classId, ensure string or null
            } : {
              // Defaults for adding new
              className: '',
              locationName: null,
              classId: null
            }
          }
          dayOfWeek={selectedDaySlot.day}
          timeSlot={selectedDaySlot.slot}
          onSubmit={handleFormSubmit}
          onClose={() => {
              setIsModalOpen(false);
              setEditingEntry(null);
              setSelectedDaySlot(null);
          }}
          loading={mutationLoading}
        />
      )}
    </div>
  );
} 