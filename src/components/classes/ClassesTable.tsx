'use client';

import React from 'react';
import { Class } from '@/types/classes'; // Import Class type
import { Teacher } from '@/types/teachers'; // Import Teacher type
import {
  PencilIcon, TrashIcon, UsersIcon,
  ArrowUpCircleIcon, ArrowDownCircleIcon // Import arrow icons
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query'; // Import mutation hooks
import { moveClassUp, moveClassDown } from '@/actions/classActions'; // Import move actions
import { toast } from 'react-toastify'; // For notifications

export interface ClassesTableProps {
  classes: (Class & { teacher?: Teacher | null })[]; // Allow optional teacher object if joined
  teachersMap: Map<string, string>; // Map teacherId to teacherName for display
  onEdit: (classData: Class) => void;
  onDelete: (id: string) => void;
}

export function ClassesTable({ classes, teachersMap, onEdit, onDelete }: ClassesTableProps) {
  const queryClient = useQueryClient();

  // Mutation for moving class up
  const moveUpMutation = useMutation({
    mutationFn: moveClassUp,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['classes'] });
        // Optional: success toast
        // toast.success('Sınıf yukarı taşındı.');
      } else {
        toast.error(`Hata: ${data.error || 'Sınıf yukarı taşınamadı.'}`);
      }
    },
    onError: (error) => {
      toast.error(`Hata: ${error.message}`);
    },
  });

  // Mutation for moving class down
  const moveDownMutation = useMutation({
    mutationFn: moveClassDown,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['classes'] });
        // Optional: success toast
        // toast.success('Sınıf aşağı taşındı.');
      } else {
        toast.error(`Hata: ${data.error || 'Sınıf aşağı taşınamadı.'}`);
      }
    },
    onError: (error) => {
       toast.error(`Hata: ${error.message}`);
    },
  });

  const isMoving = moveUpMutation.isPending || moveDownMutation.isPending;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="border p-2 w-16 text-center">Sıra</th>
            <th className="border p-2 text-left">Sınıf Adı</th>
            <th className="border p-2 text-left">Seviye</th>
            <th className="border p-2 text-left">Branş</th>
            <th className="border p-2 text-left">Dal</th>
            <th className="border p-2 text-left">Sınıf Öğretmeni</th>
            <th className="border p-2 text-left">Sınıf Başkanı</th>
            <th className="border p-2 text-center">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((cls, index) => (
            <tr key={cls.id} className="hover:bg-gray-50">
              <td className="border p-2 align-middle">
                 <div className="flex items-center justify-center space-x-1">
                    <button
                       onClick={() => cls.id && moveUpMutation.mutate(cls.id)}
                       disabled={index === 0 || isMoving}
                       className={`p-1 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 ${
                         index === 0 || isMoving
                           ? 'text-gray-300 cursor-not-allowed'
                           : 'text-gray-500 hover:text-gray-700'
                       }`}
                       title="Yukarı Taşı"
                    >
                        <ArrowUpCircleIcon className="h-5 w-5" />
                    </button>
                    <button
                       onClick={() => cls.id && moveDownMutation.mutate(cls.id)}
                       disabled={index === classes.length - 1 || isMoving}
                       className={`p-1 rounded focus:outline-none focus:ring-2 focus:ring-gray-400 ${
                         index === classes.length - 1 || isMoving
                           ? 'text-gray-300 cursor-not-allowed'
                           : 'text-gray-500 hover:text-gray-700'
                       }`}
                        title="Aşağı Taşı"
                     >
                        <ArrowDownCircleIcon className="h-5 w-5" />
                     </button>
                 </div>
              </td>
              <td className="border p-2">{cls.name}</td>
              <td className="border p-2">{cls.grade_level || '-'}</td>
              <td className="border p-2">{cls.branch_name || '-'}</td>
              <td className="border p-2">{cls.dal_name || '-'}</td>
              <td className="border p-2">
                {cls.teacherName || '-'}
              </td>
              <td className="border p-2">{cls.classPresidentName || '-'}</td>
              <td className="border p-2">
                <div className="flex items-center justify-center space-x-2">
                  {/* View Students Button */}
                   <Link
                      href={`/dashboard/classes/${cls.id}/students`}
                      className="text-green-600 hover:text-green-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
                      title="Öğrencileri Görüntüle"
                   >
                     <UsersIcon className="h-5 w-5" />
                  </Link>
                  {/* Edit Button */}
                  <button
                    onClick={() => onEdit(cls)}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                    title="Sınıfı Düzenle"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                   {/* Delete Button */}
                  <button
                    onClick={() => onDelete(cls.id!)}
                    className="text-red-600 hover:text-red-800 p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-400"
                    title="Sınıfı Sil"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {classes.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center p-4 border text-gray-500">
                 Kayıtlı sınıf bulunamadı.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
} 