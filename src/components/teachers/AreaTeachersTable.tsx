'use client';

import React from 'react';
import { Teacher, teacherRoleLabels } from '@/types/teachers'; // Import Teacher type and role labels
import { PencilSquareIcon, TrashIcon, CalendarDaysIcon, ClipboardDocumentListIcon, PencilIcon, EyeIcon, CalendarIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Switch from '@/components/Switch'; // Assuming a reusable Switch component exists

// Define a type for the teacher data including the resolved branch name
interface TeacherWithBranchName extends Teacher {
  branchName: string | null; // Add branchName explicitly
  is_active: boolean; // Add isActive
}

interface AreaTeachersTableProps {
  teachers: TeacherWithBranchName[]; // Expect enriched teacher objects
  onEdit: (teacher: TeacherWithBranchName) => void; // Use enriched type for editing callback
  onDelete: (id: string) => void;
  onToggleActiveStatus: (teacherId: string, currentStatus: boolean) => void; // Add callback prop
}

export function AreaTeachersTable({ teachers, onEdit, onDelete, onToggleActiveStatus }: AreaTeachersTableProps) {
  if (!teachers.length) {
    return <p className="text-center text-gray-500 py-8">Henüz alan öğretmeni eklenmemiş.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg shadow">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doğum Tarihi</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cep Telefonu</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Görevi</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branş</th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aktif Durumu</th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">İşlemler</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {teachers.map((teacher) => (
            <tr key={teacher.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{teacher.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.birthDate || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.phone || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.role ? teacherRoleLabels[teacher.role] : '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.branchName ?? '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                <Switch 
                  checked={teacher.is_active} 
                  onChange={() => onToggleActiveStatus(teacher.id, teacher.is_active)}
                  label={teacher.is_active ? 'Aktif' : 'Pasif'}
                  srLabel={`Öğretmen ${teacher.name} aktif durumunu değiştir`}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                <div className="flex justify-end space-x-2">
                  <Link
                    href={`/dashboard/area-teachers/${teacher.id}/schedule`}
                    className="text-indigo-600 hover:text-indigo-900"
                    title="Programı Görüntüle"
                  >
                    <CalendarIcon className="h-5 w-5" />
                  </Link>
                  <Link
                    href={`/dashboard/area-teachers/${teacher.id}/assignments`}
                    className="text-green-600 hover:text-green-900"
                    title="Ders Atamalarını Yönet"
                  >
                    <ClipboardDocumentCheckIcon className="h-5 w-5" />
                  </Link>
                  <button 
                    onClick={() => onEdit(teacher)}
                    className="text-indigo-600 hover:text-indigo-900"
                    title="Düzenle"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => onDelete(teacher.id)}
                    className="text-red-600 hover:text-red-900"
                    title="Sil"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 