'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { PlusIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

// Import actions and types
import {
  fetchTeacherUnavailability,
  createTeacherUnavailability,
  deleteTeacherUnavailability
} from '@/actions/teacherUnavailabilityActions';
import { fetchTeacherById } from '@/actions/teacherActions'; // To get teacher's name
import { Teacher } from '@/types/teachers';
import { TeacherUnavailability, TeacherUnavailabilityFormValues } from '@/types/teacherUnavailability';

// Import the real components
import { TeacherUnavailabilityList } from '@/components/scheduling/TeacherUnavailabilityList';
import { TeacherUnavailabilityFormModal } from '@/components/scheduling/TeacherUnavailabilityFormModal';

// Remove Placeholder components
/*
const TeacherUnavailabilityListPlaceholder = ...
const TeacherUnavailabilityFormModalPlaceholder = ...
*/


export default function TeacherUnavailabilityPage() {
  const params = useParams();
  const teacherId = params.teacherId as string;
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch Teacher details for title
  const { data: teacher, isLoading: isLoadingTeacher } = useQuery<Teacher | null, Error>({
    queryKey: ['teacher', teacherId],
    queryFn: () => fetchTeacherById(teacherId),
    enabled: !!teacherId,
  });

  // Fetch Unavailability periods for this teacher
  const { data: unavailabilityPeriods = [], isLoading: isLoadingUnavailability, error } = useQuery<TeacherUnavailability[], Error>({
    queryKey: ['teacherUnavailability', teacherId],
    queryFn: () => fetchTeacherUnavailability(teacherId),
    enabled: !!teacherId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: TeacherUnavailabilityFormValues) => 
      createTeacherUnavailability(teacherId, data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['teacherUnavailability', teacherId] });
        toast.success('Müsait olmama zamanı başarıyla eklendi!');
        setIsModalOpen(false);
      } else {
        toast.error(`Ekleme başarısız: ${result.error || 'Bilinmeyen hata'}`);
      }
    },
    onError: (error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (unavailabilityId: string) => 
      deleteTeacherUnavailability(unavailabilityId),
    onSuccess: (result) => {
        if(result.success) {
            queryClient.invalidateQueries({ queryKey: ['teacherUnavailability', teacherId] });
            toast.success('Kayıt başarıyla silindi!');
        } else {
            toast.error(`Silme başarısız: ${result.error || 'Bilinmeyen hata'}`);
        }
    },
    onError: (error) => {
         toast.error(`Hata: ${error.message}`);
    }
  });

  // Handlers
  const handleAdd = () => { 
      setIsModalOpen(true);
  };
  const handleDelete = (id: string) => { 
      if (window.confirm('Bu kaydı silmek istediğinizden emin misiniz?')) {
        deleteMutation.mutate(id);
      }
  };
  const handleFormSubmit = (data: TeacherUnavailabilityFormValues) => { 
      createMutation.mutate(data);
  };

  const isLoading = isLoadingTeacher || isLoadingUnavailability;
  const mutationLoading = createMutation.isPending || deleteMutation.isPending;
  const pageTitle = isLoadingTeacher ? 'Öğretmen Yükleniyor...' : teacher ? `${teacher.name} - Müsait Olmama Zamanları` : 'Öğretmen Bulunamadı';

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
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Yeni Zaman Ekle
        </button>
      </div>

      {isLoading && <p>Veriler yükleniyor...</p>}
      {error && <p className="text-red-600">Veriler yüklenirken bir hata oluştu: {error.message}</p>}

      {!isLoading && !error && (
        // Use the real list component
        <TeacherUnavailabilityList
          data={unavailabilityPeriods}
          onDelete={handleDelete}
        />
      )}

      {isModalOpen && (
        // Use the real modal component
        <TeacherUnavailabilityFormModal
          onSubmit={handleFormSubmit}
          onClose={() => setIsModalOpen(false)}
          loading={mutationLoading}
        />
      )}
    </div>
  );
} 