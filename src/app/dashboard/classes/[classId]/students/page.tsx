'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStudentsByClass, createStudent, updateStudent, deleteStudent } from '@/actions/studentActions';
import { fetchClassById } from '@/actions/classActions';
import { Student, StudentSchema, Guardian } from '@/types/students';
import { Class } from '@/types/classes';
import type { z } from 'zod';
import { StudentsTable } from '../../../../../components/students/StudentsTable';
import { StudentFormModal } from '../../../../../components/students/StudentFormModal';
import { GuardianInfoModal } from '../../../../../components/students/GuardianInfoModal';
import { PlusIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';

// Form inputs shape (status optional, id optional)
type StudentFormValues = z.input<typeof StudentSchema>;

export default function StudentsPage() {
  const params = useParams();
  const classId = params.classId as string;
  const queryClient = useQueryClient();
  // REMOVE state for search term, it's now handled in StudentsTable
  // const [searchTerm, setSearchTerm] = React.useState('');

  const { data: students = [], isLoading, error } = useQuery<Student[], Error>({
    queryKey: ['students', classId],
    queryFn: () => fetchStudentsByClass(classId),
  });

  // Fetch class details for the title
  const { data: currentClass, isLoading: isLoadingClass, error: errorClass } = useQuery<Class | null, Error>({ 
    queryKey: ['class', classId],
    queryFn: () => fetchClassById(classId),
    enabled: !!classId, // Only run if classId is available
  });

  // --- Mutations need classId and queryClient ---
  const createMutation = useMutation({
    mutationFn: (payload: Student) => createStudent(classId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students', classId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Student }) => updateStudent(classId, id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students', classId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteStudent(classId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students', classId] }),
  });
  // --- End Mutations ---

  const [formModalOpen, setFormModalOpen] = React.useState(false);
  const [editingStudent, setEditingStudent] = React.useState<StudentFormValues | null>(null);

  // --- State for Guardian Modal --- 
  const [guardianModalOpen, setGuardianModalOpen] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);

  // --- Restore Handlers ---
  const handleAdd = () => {
    setEditingStudent(null);
    setFormModalOpen(true);
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student as StudentFormValues);
    setFormModalOpen(true);
  };

  const handleDelete = (studentId: string) => {
    // Add confirmation dialog
    if (window.confirm('Bu öğrenciyi silmek istediğinizden emin misiniz?')) { 
      deleteMutation.mutate(studentId);
    }
  };

  const handleFormSubmit = (data: StudentFormValues) => {
    const payload = StudentSchema.parse(data); // Ensure validation happens
    
    // --- DEBUG LOG --- 
    console.log('Submitting student data:', payload);
    console.log('Using classId:', classId); 
    // --- END DEBUG LOG --- 

    if (editingStudent?.id) {
      console.log('Calling updateMutation...');
      updateMutation.mutate({ id: editingStudent.id, payload });
    } else {
      console.log('Calling createMutation...');
      createMutation.mutate(payload);
    }
    setFormModalOpen(false);
  };

  // --- Handler to open Guardian Modal --- 
  const handleShowGuardians = (student: Student) => {
    setSelectedStudent(student);
    setGuardianModalOpen(true);
  };
  // --- End Handlers ---

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">
          {isLoadingClass ? 'Sınıf Yükleniyor...' : 
           errorClass ? 'Sınıf Yüklenemedi' : 
           currentClass ? `Sınıf: ${currentClass.name} Öğrencileri` : 
           'Sınıf Öğrencileri'}
        </h1>
        <div className="flex items-center space-x-2">
            <Link
               href="/dashboard/classes"
               className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100"
            >
               <ArrowLeftIcon className="h-5 w-5 mr-2" />
               Sınıflara Dön
            </Link>
            <button
              type="button"
              onClick={handleAdd}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Öğrenci Ekle
            </button>
        </div>
      </div>

      {/* REMOVE the search input here, it's now inside StudentsTable */}
      {/* <div className="mb-4">
        <input
          type="search"
          placeholder="Öğrenci Ara..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full sm:w-1/2 p-2 border rounded-md"
        />
      </div> */}

      {isLoading && <div>Yükleniyor...</div>}
      {error && <div className="text-red-600">Hata: {(error as Error).message}</div>}
      {!isLoading && !error && (
        <StudentsTable
          students={students} // Pass the raw students array
          onEdit={handleEdit}
          onDelete={handleDelete}
          onShowGuardians={handleShowGuardians}
        />
      )}

      {/* Student Add/Edit Form Modal */}
      {formModalOpen && (
        <StudentFormModal
          initialData={editingStudent ?? undefined}
          onSubmit={handleFormSubmit}
          onClose={() => setFormModalOpen(false)}
        />
      )}

      {/* Guardian Info Modal */}
      {guardianModalOpen && selectedStudent && (
        <GuardianInfoModal
          isOpen={guardianModalOpen}
          onClose={() => setGuardianModalOpen(false)}
          studentName={selectedStudent.name}
          guardians={selectedStudent.guardians ?? []}
        />
      )}
    </div>
  );
}